import express from 'express';
import * as authCtrl from './auth.controller.js';
import { VerifyAuth } from '../../Middleware/verifyAuth.js';
import { profileUpload } from '../../Middleware/upload.js';

const router = express.Router();

const uploadProfileImage = (req, res, next) => {
  profileUpload.single('profileImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed',
      });
    }
    return next();
  });
};

router.route('/register').post(authCtrl.register);
router.route('/login').post(authCtrl.login);
router.route('/profile').put(VerifyAuth, uploadProfileImage, authCtrl.updateProfile);

export default router;
