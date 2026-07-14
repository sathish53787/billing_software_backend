import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { VALUES } from '../Config/appConfig.js';

export const encryptPassword = async (password) => {
  return bcrypt.hash(password, VALUES.SALT);
};

export const comparePassword = async (password, userPassword) => {
  return bcrypt.compare(password, userPassword);
};

export const generateToken = (user, tokenExpiryTime) => {
  try {
    const payload = {
      email: user?.email || null,
      phone: user?.phone || null,
      userId: user?._id,
      fullName: user?.fullName || null,
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
    const { email = null, phone = null, userId, fullName } = decodedToken;
    return { email, phone, userId, fullName };
  } catch (err) {
    throw new Error('Invalid or expired token: ' + err.message);
  }
};
