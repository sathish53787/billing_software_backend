import Bill from './bill.model.js';
import FoodItem from '../FoodItem/foodItem.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const createBillNo = async (userId) => {
  const count = await Bill.countDocuments({ userId }).exec();
  return String(count + 1).padStart(4, '0');
};

export const getNextBillInfo = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const billNo = await createBillNo(userId);
    const today = new Date();
    const billDate = today.toISOString().slice(0, 10);

    return res.status(200).json({
      success: true,
      billNo,
      billDate,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBills = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const bills = await Bill.find({ userId }).sort({ createdAt: -1 }).limit(20).lean().exec();

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.BILL.FETCHED,
      bills,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBillById = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const bill = await Bill.findOne({ _id: req.params.id, userId }).lean().exec();
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.BILL.FETCHED,
      bill,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getIstDayString = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const getIstDayBounds = (dayStr) => ({
  start: new Date(`${dayStr}T00:00:00+05:30`),
  end: new Date(`${dayStr}T23:59:59.999+05:30`),
});

const shiftIstDay = (dayStr, days) => {
  const base = new Date(`${dayStr}T12:00:00+05:30`);
  base.setDate(base.getDate() + days);
  return getIstDayString(base);
};

const getIstWeekdayShort = (dayStr) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(new Date(`${dayStr}T12:00:00+05:30`));

const pctChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return round2(((current - previous) / previous) * 100);
};

const CATEGORY_COLORS = {
  Lunch: '#ff6b4a',
  Breakfast: '#2f8fd8',
  Dinner: '#1fa97a',
  Snacks: '#9ca3af',
};

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const todayStr = getIstDayString();
    const yesterdayStr = shiftIstDay(todayStr, -1);
    const weekStartStr = (() => {
      const weekday = getIstWeekdayShort(todayStr);
      const offsetMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return shiftIstDay(todayStr, -(offsetMap[weekday] || 0));
    })();
    const weekEndStr = shiftIstDay(weekStartStr, 6);
    const rangeStart = getIstDayBounds(weekStartStr).start;
    const todayBounds = getIstDayBounds(todayStr);
    const yesterdayBounds = getIstDayBounds(yesterdayStr);
    const fetchStart =
      rangeStart < yesterdayBounds.start ? rangeStart : yesterdayBounds.start;

    const bills = await Bill.find({
      userId,
      createdAt: { $gte: fetchStart, $lte: getIstDayBounds(weekEndStr).end },
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const recentBills = await Bill.find({ userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
      .exec();

    const summarize = (list) => {
      const revenue = round2(list.reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0));
      const billCount = list.length;
      const orders = list.reduce((sum, bill) => sum + Number(bill.itemCount || 0), 0);
      const avgBill = billCount ? round2(revenue / billCount) : 0;
      return { revenue, billCount, orders, avgBill };
    };

    const inRange = (bill, start, end) => {
      const created = new Date(bill.createdAt);
      return created >= start && created <= end;
    };

    const todayBills = bills.filter((bill) =>
      inRange(bill, todayBounds.start, todayBounds.end)
    );
    const yesterdayBills = bills.filter((bill) =>
      inRange(bill, yesterdayBounds.start, yesterdayBounds.end)
    );

    const today = summarize(todayBills);
    const yesterday = summarize(yesterdayBills);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = Object.fromEntries(weekDays.map((day) => [day, 0]));
    for (let i = 0; i < 7; i += 1) {
      const dayStr = shiftIstDay(weekStartStr, i);
      const { start, end } = getIstDayBounds(dayStr);
      const dayRevenue = bills
        .filter((bill) => inRange(bill, start, end))
        .reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0);
      weeklyMap[getIstWeekdayShort(dayStr)] = round2(dayRevenue);
    }
    const maxWeekly = Math.max(...Object.values(weeklyMap), 0);
    const weeklyRevenue = weekDays.map((day) => ({
      day,
      amount: weeklyMap[day],
      value: maxWeekly ? Math.round((weeklyMap[day] / maxWeekly) * 100) : 0,
    }));

    const categoryTotals = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snacks: 0,
    };
    const itemMap = new Map();

    todayBills.forEach((bill) => {
      (bill.items || []).forEach((item) => {
        const qty = Number(item.quantity || 0);
        const lineAmount = Number(item.lineTotal || item.subtotal || 0);
        const cats = Array.isArray(item.category) ? item.category : [];
        if (cats.length) {
          cats.forEach((cat) => {
            if (categoryTotals[cat] !== undefined) categoryTotals[cat] += qty;
          });
        }

        const key = item.itemName || 'Item';
        const existing = itemMap.get(key) || { name: key, orders: 0, amount: 0 };
        existing.orders += qty;
        existing.amount = round2(existing.amount + lineAmount);
        itemMap.set(key, existing);
      });
    });

    const categorySum = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const categories = Object.entries(categoryTotals).map(([name, count]) => {
      const pctValue = categorySum ? round2((count / categorySum) * 100) : 0;
      return {
        name,
        count,
        pct: `${pctValue}%`,
        pctValue,
        color: CATEGORY_COLORS[name] || '#9ca3af',
      };
    });

    let gradientStart = 0;
    const donutGradient = categories
      .map((cat) => {
        const from = gradientStart;
        const to = gradientStart + cat.pctValue;
        gradientStart = to;
        return `${cat.color} ${from}% ${to}%`;
      })
      .join(', ');

    const topItemsRaw = [...itemMap.values()].sort((a, b) => b.orders - a.orders).slice(0, 5);
    const maxOrders = topItemsRaw[0]?.orders || 0;
    const topItems = topItemsRaw.map((item) => ({
      name: item.name,
      orders: item.orders,
      amount: item.amount,
      fill: maxOrders ? `${Math.round((item.orders / maxOrders) * 100)}%` : '0%',
    }));

    return res.status(200).json({
      success: true,
      message: 'Dashboard data fetched successfully',
      dashboard: {
        kpis: {
          todayRevenue: today.revenue,
          revenueChangePct: pctChange(today.revenue, yesterday.revenue),
          billsGenerated: today.billCount,
          billsChange: today.billCount - yesterday.billCount,
          ordersServed: today.orders,
          ordersChange: today.orders - yesterday.orders,
          avgBillValue: today.avgBill,
          avgBillChangePct: pctChange(today.avgBill, yesterday.avgBill),
        },
        weeklyRevenue,
        categories,
        donutGradient:
          categorySum > 0
            ? donutGradient
            : '#e5e7eb 0% 100%',
        topItems,
        recentBills: recentBills.map((bill) => ({
          billNo: bill.billNo,
          customer: bill.customerName || '—',
          amount: Number(bill.grandTotal || 0),
          status: bill.status || 'Paid',
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const isValidDateStr = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

export const getReports = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const todayStr = getIstDayString();
    let fromDate = String(req.query.from_date || todayStr).trim();
    let toDate = String(req.query.to_date || fromDate || todayStr).trim();

    if (!isValidDateStr(fromDate) || !isValidDateStr(toDate)) {
      return res.status(400).json({
        success: false,
        message: 'Use valid from_date and to_date in YYYY-MM-DD format',
      });
    }

    if (fromDate > toDate) {
      const swap = fromDate;
      fromDate = toDate;
      toDate = swap;
    }

    const { start } = getIstDayBounds(fromDate);
    const { end } = getIstDayBounds(toDate);

    const bills = await Bill.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    let grossSales = 0;
    let totalGst = 0;
    let totalRevenue = 0;
    let collected = 0;
    let outstanding = 0;
    let paidBills = 0;
    let pendingBills = 0;
    let itemsSold = 0;
    const categoryTotals = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snacks: 0,
    };
    const itemMap = new Map();
    const dailyMap = new Map();

    const ensureDay = (dayStr) => {
      if (!dailyMap.has(dayStr)) {
        dailyMap.set(dayStr, {
          date: dayStr,
          bills: 0,
          orders: 0,
          grossSales: 0,
          gst: 0,
          revenue: 0,
          collected: 0,
          outstanding: 0,
        });
      }
      return dailyMap.get(dayStr);
    };

    // Only include days that have bill activity
    bills.forEach((bill) => {
      const dayStr = getIstDayString(new Date(bill.createdAt));
      const day = ensureDay(dayStr);
      const subtotal = Number(bill.subtotal || 0);
      const gst = Number(bill.totalGst || 0);
      const grand = Number(bill.grandTotal || 0);
      const orders = Number(bill.itemCount || 0);
      const isPaid = bill.status !== 'Pending';

      grossSales = round2(grossSales + subtotal);
      totalGst = round2(totalGst + gst);
      totalRevenue = round2(totalRevenue + grand);
      itemsSold += orders;

      day.bills += 1;
      day.orders += orders;
      day.grossSales = round2(day.grossSales + subtotal);
      day.gst = round2(day.gst + gst);
      day.revenue = round2(day.revenue + grand);

      if (isPaid) {
        paidBills += 1;
        collected = round2(collected + grand);
        day.collected = round2(day.collected + grand);
      } else {
        pendingBills += 1;
        outstanding = round2(outstanding + grand);
        day.outstanding = round2(day.outstanding + grand);
      }

      (bill.items || []).forEach((item) => {
        const qty = Number(item.quantity || 0);
        const lineAmount = Number(item.lineTotal || item.subtotal || 0);
        const cats = Array.isArray(item.category) ? item.category : [];
        cats.forEach((cat) => {
          if (categoryTotals[cat] !== undefined) categoryTotals[cat] += qty;
        });

        const key = item.itemName || 'Item';
        const existing = itemMap.get(key) || { name: key, orders: 0, amount: 0 };
        existing.orders += qty;
        existing.amount = round2(existing.amount + lineAmount);
        itemMap.set(key, existing);
      });
    });

    const billCount = bills.length;
    const avgBill = billCount ? round2(totalRevenue / billCount) : 0;
    // Without item cost tracking: net profit ≈ collected sales minus outstanding risk
    const netProfit = round2(collected);
    const netLoss = round2(outstanding);
    const netPosition = round2(collected - outstanding);

    const daily = [...dailyMap.values()]
      .filter((day) => Number(day.bills) > 0)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const categorySum = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const categories = Object.entries(categoryTotals).map(([name, count]) => ({
      name,
      count,
      pct: categorySum ? `${round2((count / categorySum) * 100)}%` : '0%',
      color: CATEGORY_COLORS[name] || '#9ca3af',
    }));

    const topItems = [...itemMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      message: 'Reports fetched successfully',
      report: {
        from_date: fromDate,
        to_date: toDate,
        summary: {
          billCount,
          paidBills,
          pendingBills,
          itemsSold,
          grossSales,
          totalGst,
          totalRevenue,
          collected,
          outstanding,
          avgBill,
          netProfit,
          netLoss,
          netPosition,
        },
        daily,
        categories,
        topItems,
        bills: bills.map((bill) => ({
          billNo: bill.billNo,
          customerName: bill.customerName || '—',
          billDate: getIstDayString(new Date(bill.createdAt)),
          itemCount: bill.itemCount,
          subtotal: Number(bill.subtotal || 0),
          totalGst: Number(bill.totalGst || 0),
          grandTotal: Number(bill.grandTotal || 0),
          status: bill.status || 'Paid',
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createBill = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const { items, customerName = '', status = 'Paid', billDate } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.BILL_ITEMS_REQUIRED,
      });
    }

    const foodIds = items.map((item) => item.foodItemId).filter(Boolean);
    if (foodIds.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.BILL_ITEMS_REQUIRED,
      });
    }

    const foodItems = await FoodItem.find({
      _id: { $in: foodIds },
      userId,
      available: true,
    })
      .lean()
      .exec();

    const foodMap = new Map(foodItems.map((item) => [String(item._id), item]));

    const billItems = [];
    let subtotal = 0;
    let totalGst = 0;

    for (const selected of items) {
      const food = foodMap.get(String(selected.foodItemId));
      if (!food) {
        return res.status(400).json({
          success: false,
          message: RES_MESSAGE.VALIDATION.BILL_ITEM_UNAVAILABLE,
        });
      }

      const quantity = Number(selected.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: RES_MESSAGE.VALIDATION.INVALID_BILL_QUANTITY,
        });
      }

      const lineSubtotal = round2(food.price * quantity);
      const gstAmount = round2((lineSubtotal * food.gstPercent) / 100);
      const lineTotal = round2(lineSubtotal + gstAmount);

      billItems.push({
        foodItemId: food._id,
        itemName: food.itemName,
        type: food.type,
        category: food.category,
        price: food.price,
        gstPercent: food.gstPercent,
        quantity,
        subtotal: lineSubtotal,
        gstAmount,
        lineTotal,
      });

      subtotal += lineSubtotal;
      totalGst += gstAmount;
    }

    subtotal = round2(subtotal);
    totalGst = round2(totalGst);
    const grandTotal = round2(subtotal + totalGst);
    const billNo = await createBillNo(userId);
    const parsedBillDate = billDate ? new Date(billDate) : new Date();
    if (Number.isNaN(parsedBillDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bill date',
      });
    }

    const bill = await new Bill({
      userId,
      billNo,
      customerName: String(customerName || '').trim(),
      billDate: parsedBillDate,
      items: billItems,
      itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      totalGst,
      grandTotal,
      status: status === 'Pending' ? 'Pending' : 'Paid',
    }).save();

    return res.status(201).json({
      success: true,
      message: RES_MESSAGE.BILL.CREATED,
      bill: bill.toObject(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bill number conflict. Please try again.',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
