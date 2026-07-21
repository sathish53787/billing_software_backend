import express from 'express';
import * as foodItemCtrl from './foodItem.controller.js';
import { VerifyAuth } from '../../Middleware/verifyAuth.js';

const router = express.Router();

router.route('/').get(VerifyAuth, foodItemCtrl.getFoodItems);
router.route('/').post(VerifyAuth, foodItemCtrl.createFoodItem);
router.route('/reorder').put(VerifyAuth, foodItemCtrl.reorderFoodItems);
router.route('/:id').put(VerifyAuth, foodItemCtrl.updateFoodItem);
router.route('/:id').delete(VerifyAuth, foodItemCtrl.deleteFoodItem);

export default router;
