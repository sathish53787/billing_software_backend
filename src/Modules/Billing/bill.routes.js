import express from 'express';
import * as billCtrl from './bill.controller.js';
import { VerifyAuth } from '../../Middleware/verifyAuth.js';

const router = express.Router();

router.route('/dashboard').get(VerifyAuth, billCtrl.getDashboard);
router.route('/reports').get(VerifyAuth, billCtrl.getReports);
router.route('/next').get(VerifyAuth, billCtrl.getNextBillInfo);
router.route('/').get(VerifyAuth, billCtrl.getBills);
router.route('/').post(VerifyAuth, billCtrl.createBill);
router.route('/:id').get(VerifyAuth, billCtrl.getBillById);
router.route('/:id').put(VerifyAuth, billCtrl.updateBill);
router.route('/:id').delete(VerifyAuth, billCtrl.deleteBill);

export default router;
