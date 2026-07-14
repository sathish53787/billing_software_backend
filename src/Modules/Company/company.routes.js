import express from 'express';
import * as companyCtrl from './company.controller.js';
import { VerifyAuth } from '../../Middleware/verifyAuth.js';
import { profileUpload } from '../../Middleware/upload.js';

const router = express.Router();

const uploadCompanyLogo = (req, res, next) => {
  profileUpload.single('companyLogo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Logo upload failed',
      });
    }
    return next();
  });
};

router.route('/').get(VerifyAuth, companyCtrl.getCompany);
router.route('/').put(VerifyAuth, uploadCompanyLogo, companyCtrl.saveCompany);

export default router;
