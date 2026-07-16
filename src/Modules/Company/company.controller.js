import Company from './company.model.js';
import User from '../Auth/user.model.js';
import Bill from '../Billing/bill.model.js';
import Expense from '../Expense/expense.model.js';
import FoodItem from '../FoodItem/foodItem.model.js';
import Order from '../Order/order.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';
import { generateToken } from '../../Helpers/auth.js';
import { uploadCompanyLogo } from '../../Helpers/supabase.js';
import { normalizeAccessUrl } from '../../Helpers/tenant.js';
import { phoneValidation } from '../../Middleware/validation.js';

const optionalText = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const backfillTenantData = async (userId, companyId) => {
  const filter = { userId, $or: [{ company: { $exists: false } }, { company: null }] };
  const update = { $set: { company: companyId } };
  await Promise.all([
    Bill.updateMany(filter, update).exec(),
    Expense.updateMany(filter, update).exec(),
    FoodItem.updateMany(filter, update).exec(),
    Order.updateMany(filter, update).exec(),
  ]);
};

const buildUserResponse = async (userId) => {
  const user = await User.findById(userId)
    .populate('company')
    .select('-password')
    .lean()
    .exec();
  if (!user) return null;
  user.accessToken = generateToken(user);
  return user;
};

export const createCompany = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const existingUser = await User.findById(userId).lean().exec();
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: RES_MESSAGE.USERS.NOT_FOUND,
      });
    }

    if (existingUser.is_company || existingUser.company) {
      return res.status(400).json({
        success: false,
        message: 'Company already created for this account',
      });
    }

    const companyName = String(req.body?.companyName || '').trim();
    const companyPhone = String(req.body?.companyPhone || req.body?.Phone || '')
      .replace(/\s/g, '')
      .trim();
    const access_url = normalizeAccessUrl(req.body?.access_url || req.body?.accessUrl);

    if (!companyName || !companyPhone || !access_url) {
      return res.status(400).json({
        success: false,
        message: 'Company name, company phone number and access URL are required',
      });
    }

    if (!phoneValidation(companyPhone)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_PHONE,
      });
    }

    if (access_url.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Access URL must be at least 3 characters',
      });
    }

    const duplicate = await Company.findOne({
      $or: [
        { companyName: { $regex: new RegExp(`^${companyName}$`, 'i') } },
        { access_url },
        { userId },
      ],
    })
      .lean()
      .exec();

    if (duplicate) {
      let duplicateField = 'Company';
      if (String(duplicate.userId) === String(userId)) {
        duplicateField = 'Company';
      } else if (duplicate.access_url === access_url) {
        duplicateField = 'Access URL';
      } else {
        duplicateField = 'Company name';
      }
      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists. Please enter a different value.`,
      });
    }

    const savedCompany = await new Company({
      userId,
      companyName,
      companyPhone,
      access_url,
      address: String(req.body?.address || '').trim(),
    }).save();

    await User.findByIdAndUpdate(userId, {
      company: savedCompany._id,
      is_company: true,
    }).exec();

    await backfillTenantData(userId, savedCompany._id);

    const userResponse = await buildUserResponse(userId);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.COMPANY.CREATED,
      savedCompany: savedCompany.toObject(),
      userResponse,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Company name or access URL already exists',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const cmpyId = req.user?.cmpyId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const company = await Company.findOne(
      cmpyId ? { _id: cmpyId } : { userId }
    )
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: company
        ? RES_MESSAGE.COMPANY.FETCHED
        : RES_MESSAGE.COMPANY.EMPTY,
      company: company || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveCompany = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const cmpyId = req.user?.cmpyId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const companyName = String(req.body?.companyName || '').trim();
    const companyPhone = String(req.body?.companyPhone || '')
      .replace(/\s/g, '')
      .trim();
    const address = String(req.body?.address || '').trim();

    if (!companyName || !companyPhone || !address) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.COMPANY_FIELDS_REQUIRED,
      });
    }

    if (!phoneValidation(companyPhone)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_PHONE,
      });
    }

    const payload = {
      userId,
      companyName,
      companyPhone,
      address,
      gstNo: optionalText(req.body.gstNo)?.toUpperCase() || null,
      bankName: optionalText(req.body.bankName),
      accountHolderName: optionalText(req.body.accountHolderName),
      accountNo: optionalText(req.body.accountNo),
      ifscCode: optionalText(req.body.ifscCode)?.toUpperCase() || null,
      upiId: optionalText(req.body.upiId),
      upiName: optionalText(req.body.upiName),
    };

    if (req.body?.access_url || req.body?.accessUrl) {
      const access_url = normalizeAccessUrl(req.body.access_url || req.body.accessUrl);
      if (access_url.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Access URL must be at least 3 characters',
        });
      }
      const taken = await Company.findOne({
        access_url,
        ...(cmpyId ? { _id: { $ne: cmpyId } } : { userId: { $ne: userId } }),
      })
        .lean()
        .exec();
      if (taken) {
        return res.status(400).json({
          success: false,
          message: 'Access URL already exists. Please enter a different value.',
        });
      }
      payload.access_url = access_url;
    }

    if (req.file) {
      payload.companyLogo = await uploadCompanyLogo({
        userId,
        file: req.file,
      });
    }

    const existing = await Company.findOne(cmpyId ? { _id: cmpyId } : { userId }).exec();

    let company;
    if (existing) {
      if (!payload.companyLogo) {
        delete payload.companyLogo;
      }
      company = await Company.findOneAndUpdate(
        { _id: existing._id },
        payload,
        { new: true }
      )
        .lean()
        .exec();
    } else {
      if (!payload.access_url) {
        return res.status(400).json({
          success: false,
          message: 'Access URL is required',
        });
      }
      company = await new Company(payload).save();
      company = company.toObject();
      await User.findByIdAndUpdate(userId, {
        company: company._id,
        is_company: true,
      }).exec();
      await backfillTenantData(userId, company._id);
    }

    const userResponse = await buildUserResponse(userId);

    return res.status(200).json({
      success: true,
      message: existing
        ? RES_MESSAGE.COMPANY.UPDATED
        : RES_MESSAGE.COMPANY.CREATED,
      company,
      userResponse,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Company name or access URL already exists',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
