import Company from './company.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';
import { uploadCompanyLogo } from '../../Helpers/supabase.js';
import { phoneValidation } from '../../Middleware/validation.js';

const requiredFields = ['companyName', 'companyPhone', 'address'];

const optionalText = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

export const getCompany = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const company = await Company.findOne({ userId }).lean().exec();

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
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const missing = requiredFields.filter((field) => !String(req.body?.[field] || '').trim());
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.COMPANY_FIELDS_REQUIRED,
      });
    }

    const companyPhone = String(req.body.companyPhone).replace(/\s/g, '').trim();
    if (!phoneValidation(companyPhone)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_PHONE,
      });
    }

    const payload = {
      userId,
      companyName: String(req.body.companyName).trim(),
      companyPhone,
      address: String(req.body.address).trim(),
      gstNo: optionalText(req.body.gstNo)?.toUpperCase() || null,
      bankName: optionalText(req.body.bankName),
      accountHolderName: optionalText(req.body.accountHolderName),
      accountNo: optionalText(req.body.accountNo),
      ifscCode: optionalText(req.body.ifscCode)?.toUpperCase() || null,
      upiId: optionalText(req.body.upiId),
      upiName: optionalText(req.body.upiName),
    };

    if (req.file) {
      payload.companyLogo = await uploadCompanyLogo({
        userId,
        file: req.file,
      });
    }

    const existing = await Company.findOne({ userId }).exec();

    let company;
    if (existing) {
      if (!payload.companyLogo) {
        delete payload.companyLogo;
      }
      company = await Company.findOneAndUpdate({ userId }, payload, {
        new: true,
      })
        .lean()
        .exec();
    } else {
      company = await new Company(payload).save();
      company = company.toObject();
    }

    return res.status(200).json({
      success: true,
      message: existing
        ? RES_MESSAGE.COMPANY.UPDATED
        : RES_MESSAGE.COMPANY.CREATED,
      company,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
