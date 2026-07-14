import User from './user.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';
import {
  comparePassword,
  encryptPassword,
  generateToken,
} from '../../Helpers/auth.js';
import { uploadProfileImage } from '../../Helpers/supabase.js';
import {
  emailValidation,
  passwordValidation,
  phoneValidation,
} from '../../Middleware/validation.js';

export const register = async (req, res) => {
  try {
    const { fullName, phone, email, password, confirmPassword } = req.body;

    if (!fullName || !phone || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.REQUIRED_FIELDS,
      });
    }

    if (!String(fullName).trim()) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.FULL_NAME_REQUIRED,
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (!emailValidation(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_EMAIL,
      });
    }

    const normalizedPhone = String(phone).replace(/\s/g, '').trim();
    if (!phoneValidation(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_PHONE,
      });
    }

    if (!passwordValidation(password)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_PASSWORD,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.CONFIRM_PASSWORD_MISMATCH,
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      account_deactivated: false,
    }).exec();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.USERS.ALREADY_CREATED,
      });
    }

    const hashedPassword = await encryptPassword(password);

    let savedUser = await new User({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
    }).save();

    savedUser = savedUser.toObject();
    delete savedUser.password;
    savedUser.accessToken = generateToken(savedUser);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.USERS.CREATED,
      savedUser,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.USERS.ALREADY_CREATED,
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone, password, loginId } = req.body;
    const identifier = String(loginId || email || phone || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number and password are required',
      });
    }

    const query = {
      isActive: true,
      account_deactivated: false,
    };

    const looksLikeEmail = identifier.includes('@');
    if (looksLikeEmail) {
      const normalizedEmail = identifier.toLowerCase();
      if (!emailValidation(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: RES_MESSAGE.VALIDATION.INVALID_EMAIL,
        });
      }
      query.email = normalizedEmail;
    } else {
      const normalizedPhone = identifier.replace(/\s/g, '');
      if (!phoneValidation(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: RES_MESSAGE.VALIDATION.INVALID_PHONE,
        });
      }
      query.phone = normalizedPhone;
    }

    const user = await User.findOne(query).exec();

    if (!user) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.USERS.LOGIN_FAILED,
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Password is missing',
      });
    }

    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.PASSWORD_MISMATCH,
      });
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.accessToken = generateToken(userResponse);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.USERS.LOGIN,
      userResponse,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { fullName, email, phone } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.PROFILE_FIELDS_REQUIRED,
      });
    }

    if (!String(fullName).trim()) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.FULL_NAME_REQUIRED,
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!emailValidation(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_EMAIL,
      });
    }

    const normalizedPhone = String(phone).replace(/\s/g, '').trim();
    if (!phoneValidation(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.INVALID_PHONE,
      });
    }

    const existingUser = await User.findOne({
      _id: { $ne: userId },
      account_deactivated: false,
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    }).exec();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.USERS.ALREADY_CREATED,
      });
    }

    const updatePayload = {
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
    };

    if (req.file) {
      updatePayload.profileImage = await uploadProfileImage({
        userId,
        file: req.file,
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, account_deactivated: false },
      updatePayload,
      { new: true }
    )
      .select('-password')
      .lean()
      .exec();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: RES_MESSAGE.USERS.NOT_FOUND,
      });
    }

    updatedUser.accessToken = generateToken(updatedUser);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.USERS.PROFILE_UPDATED,
      userResponse: updatedUser,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.USERS.ALREADY_CREATED,
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
