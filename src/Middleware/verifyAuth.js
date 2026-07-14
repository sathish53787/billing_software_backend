import { RES_MESSAGE } from '../Config/appConfig.js';
import { getUserDataFromToken } from '../Helpers/auth.js';

export const VerifyAuth = async (req, res, next) => {
  try {
    const Authorization = req.headers['authorization'] || null;
    if (!Authorization) {
      return res.status(401).json({ success: false, message: RES_MESSAGE.VALIDATION.UNAUTHORIZED });
    }

    const token = Authorization.split(' ')[1];
    req.user = getUserDataFromToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};
