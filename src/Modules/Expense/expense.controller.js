import Expense, { EXPENSE_CATEGORIES } from './expense.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseExpenseDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00+05:30`);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toInputDate = (value) => {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const parseExpensePayload = (body) => {
  const { expenseDate, category, amount, description } = body || {};

  if (!expenseDate || !category || amount === undefined || amount === '') {
    return { error: 'Expense date, category and amount are required' };
  }

  const parsedDate = parseExpenseDate(expenseDate);
  if (!parsedDate) {
    return { error: 'Invalid expense date' };
  }

  const cat = String(category).trim();
  if (!EXPENSE_CATEGORIES.includes(cat)) {
    return { error: 'Invalid expense category' };
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
    return { error: 'Amount must be a valid number (0 or more)' };
  }

  return {
    data: {
      expenseDate: parsedDate,
      category: cat,
      amount: round2(parsedAmount),
      description: String(description || '').trim(),
    },
  };
};

const mapExpense = (expense) => ({
  _id: expense._id,
  expenseDate: toInputDate(expense.expenseDate),
  category: expense.category,
  amount: Number(expense.amount || 0),
  description: expense.description || '',
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});

const buildStats = (expenses = []) => {
  const totalAmount = round2(expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0));
  const byCategory = {};
  expenses.forEach((row) => {
    byCategory[row.category] = round2((byCategory[row.category] || 0) + Number(row.amount || 0));
  });
  return {
    totalCount: expenses.length,
    totalAmount,
    byCategory,
  };
};

export const getExpenseCategories = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      categories: EXPENSE_CATEGORIES,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const fromDate = String(req.query.from_date || '').trim();
    const toDate = String(req.query.to_date || '').trim();
    const category = String(req.query.category || '').trim();
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const rawLimit = Number.parseInt(String(req.query.limit || req.query.count || '10'), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 10));
    const skip = (page - 1) * limit;

    const filter = { userId };

    if (category && category !== 'All' && EXPENSE_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (fromDate || toDate) {
      const startStr = /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate : null;
      const endStr = /^\d{4}-\d{2}-\d{2}$/.test(toDate) ? toDate : startStr;
      if (startStr) {
        filter.expenseDate = {
          $gte: new Date(`${startStr}T00:00:00+05:30`),
          $lte: new Date(`${endStr}T23:59:59.999+05:30`),
        };
      }
    }

    const [total, expenses, allForStats] = await Promise.all([
      Expense.countDocuments(filter),
      Expense.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Expense.find(filter).select('amount category').lean().exec(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

    return res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully',
      expenses: expenses.map(mapExpense),
      categories: EXPENSE_CATEGORIES,
      stats: buildStats(allForStats),
      pagination: {
        page,
        limit,
        count: limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const parsed = parseExpensePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const expense = await Expense.create({
      userId,
      ...parsed.data,
    });

    return res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: mapExpense(expense.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const parsed = parseExpensePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: parsed.data },
      { new: true }
    )
      .lean()
      .exec();

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense: mapExpense(expense),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId,
    })
      .lean()
      .exec();

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
