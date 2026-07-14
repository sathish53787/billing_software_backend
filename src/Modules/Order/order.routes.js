import express from 'express';
import * as orderCtrl from './order.controller.js';
import { VerifyAuth } from '../../Middleware/verifyAuth.js';

const router = express.Router();

router.route('/').get(VerifyAuth, orderCtrl.getOrders);
router.route('/').post(VerifyAuth, orderCtrl.createOrder);
router.route('/:id').get(VerifyAuth, orderCtrl.getOrderById);
router.route('/:id').put(VerifyAuth, orderCtrl.updateOrder);
router.route('/:id/generate-bill').post(VerifyAuth, orderCtrl.generateBillFromOrder);
router.route('/:id/cancel').post(VerifyAuth, orderCtrl.cancelOrder);

export default router;
