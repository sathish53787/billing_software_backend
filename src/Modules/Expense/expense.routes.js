import express from 'express';
import * as expenseCtrl from './expense.controller.js';
import { VerifyAuth } from '../../Middleware/verifyAuth.js';

const router = express.Router();

router.route('/categories').get(VerifyAuth, expenseCtrl.getExpenseCategories);
router.route('/').get(VerifyAuth, expenseCtrl.getExpenses);
router.route('/').post(VerifyAuth, expenseCtrl.createExpense);
router.route('/:id').put(VerifyAuth, expenseCtrl.updateExpense);
router.route('/:id').delete(VerifyAuth, expenseCtrl.deleteExpense);

export default router;
