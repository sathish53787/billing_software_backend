import mongoose from 'mongoose';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Gas',
  'Water',
  'Electricity',
  'Salaries',
  'Raw Materials',
  'Packaging',
  'Maintenance',
  'Transport',
  'Marketing',
  'Others',
];

const expenseSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null,
      index: true,
    },
    expenseDate: { type: Date, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES,
      trim: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, expenseDate: -1 });

const Expense = mongoose.model('Expenses', expenseSchema);

export { EXPENSE_CATEGORIES };
export default Expense;
