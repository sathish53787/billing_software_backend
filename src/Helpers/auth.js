import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { VALUES } from '../Config/appConfig.js';

export const encryptPassword = async (password) => {
  return bcrypt.hash(password, VALUES.SALT);
};

export const comparePassword = async (password, userPassword) => {
  return bcrypt.compare(password, userPassword);
};

const resolveCompanyId = (user) => {
  if (!user?.company) return null;
  if (typeof user.company === 'object' && user.company._id) {
    return user.company._id;
  }
  return user.company;
};

const resolveAccessUrl = (user) => {
  if (user?.access_url) return user.access_url;
  if (typeof user?.company === 'object' && user.company?.access_url) {
    return user.company.access_url;
  }
  return null;
};

export const generateToken = (user, tokenExpiryTime) => {
  try {
    const payload = {
      email: user?.email || null,
      phone: user?.phone || null,
      userId: user?._id,
      fullName: user?.fullName || null,
      cmpyId: resolveCompanyId(user),
      access_url: resolveAccessUrl(user),
    };
    const token = jwt.sign(payload, VALUES.JWT_SECRET, {
      expiresIn: tokenExpiryTime ? tokenExpiryTime : VALUES.TOKEN_EXPIRY,
    });
    return token;
  } catch (err) {
    throw new Error('Error generating token: ' + err.message);
  }
};

export const getUserDataFromToken = (token) => {
  try {
    const decodedToken = jwt.verify(token, VALUES.JWT_SECRET);
    const {
      email = null,
      phone = null,
      userId,
      fullName,
      cmpyId = null,
      access_url = null,
    } = decodedToken;
    return { email, phone, userId, fullName, cmpyId, access_url };
  } catch (err) {
    throw new Error('Invalid or expired token: ' + err.message);
  }
};
