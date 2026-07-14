import express from 'express';
import authAPI from './Modules/Auth/auth.routes.js';
import companyAPI from './Modules/Company/company.routes.js';
import foodItemAPI from './Modules/FoodItem/foodItem.routes.js';
import billAPI from './Modules/Billing/bill.routes.js';
import orderAPI from './Modules/Order/order.routes.js';
import expenseAPI from './Modules/Expense/expense.routes.js';

const routes = express();

routes.use('/auth', authAPI);
routes.use('/company', companyAPI);
routes.use('/food-items', foodItemAPI);
routes.use('/bills', billAPI);
routes.use('/orders', orderAPI);
routes.use('/expenses', expenseAPI);

export default routes;
