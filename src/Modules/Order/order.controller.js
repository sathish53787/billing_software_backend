import Order, { ORDER_TYPES } from './order.model.js';
import Bill from '../Billing/bill.model.js';
import FoodItem from '../FoodItem/foodItem.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';
import { nextBillNo } from '../../Helpers/billNo.js';
import { tenantFilter, tenantStamp } from '../../Helpers/tenant.js';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const createOrderNo = async (req) => {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments(tenantFilter(req)).exec();
  return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
};

const phoneOk = (value) => /^[6-9]\d{9}$/.test(String(value || '').replace(/\s/g, ''));

const getIstToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const parseOrderDate = (value) => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00+05:30`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(`${getIstToday()}T12:00:00+05:30`);
};

const buildCustomerLabel = (order) => {
  if (order.orderType === 'Dine-In') {
    const table = order.tableNumber ? `Table ${order.tableNumber}` : 'Dine-In';
    const guests = order.guestCount ? ` · ${order.guestCount} guests` : '';
    const captain = order.captain ? ` · ${order.captain}` : '';
    return `${table}${guests}${captain}`.trim();
  }
  if (order.orderType === 'Parcel') {
    return order.customerName
      ? `Parcel — ${order.customerName}`
      : 'Parcel';
  }
  return order.customerName
    ? `Delivery — ${order.customerName}`
    : 'Delivery';
};

const calcExtraCharges = (orderType, packingCharge, deliveryCharge) => {
  if (orderType === 'Parcel') return round2(Number(packingCharge) || 0);
  if (orderType === 'Delivery') return round2(Number(deliveryCharge) || 0);
  return 0;
};

const validateOrderMeta = (orderType, body) => {
  if (!ORDER_TYPES.includes(orderType)) {
    return { error: 'Select a valid order type: Dine-In, Parcel, or Delivery' };
  }

  if (orderType === 'Dine-In') {
    const tableNumber = String(body.tableNumber || '').trim();
    if (!tableNumber) {
      return { error: 'Table number is required for Dine-In' };
    }
    const guestCount = Number(body.guestCount || 0);
    if (Number.isNaN(guestCount) || guestCount < 0) {
      return { error: 'Enter a valid guest count' };
    }
    return {
      data: {
        tableNumber,
        guestCount: Math.floor(guestCount) || 0,
        captain: String(body.captain || '').trim(),
        customerName: '',
        mobileNumber: '',
        deliveryAddress: '',
        packingCharge: 0,
        deliveryCharge: 0,
      },
    };
  }

  if (orderType === 'Parcel') {
    const customerName = String(body.customerName || '').trim();
    const mobileNumber = String(body.mobileNumber || '').replace(/\s/g, '').trim();
    const packingCharge = Number(body.packingCharge || 0);
    if (mobileNumber && !phoneOk(mobileNumber)) {
      return { error: 'Enter a valid 10-digit mobile number' };
    }
    if (Number.isNaN(packingCharge) || packingCharge < 0) {
      return { error: 'Enter a valid packing charge' };
    }
    return {
      data: {
        tableNumber: '',
        guestCount: 0,
        captain: '',
        customerName,
        mobileNumber,
        deliveryAddress: '',
        packingCharge: round2(packingCharge),
        deliveryCharge: 0,
      },
    };
  }

  const customerName = String(body.customerName || '').trim();
  const mobileNumber = String(body.mobileNumber || '').replace(/\s/g, '').trim();
  const deliveryAddress = String(body.deliveryAddress || '').trim();
  const deliveryCharge = Number(body.deliveryCharge || 0);
  if (!customerName) {
    return { error: 'Customer name is required for Delivery' };
  }
  if (!mobileNumber || !phoneOk(mobileNumber)) {
    return { error: 'Valid mobile number is required for Delivery' };
  }
  if (!deliveryAddress) {
    return { error: 'Delivery address is required' };
  }
  if (Number.isNaN(deliveryCharge) || deliveryCharge < 0) {
    return { error: 'Enter a valid delivery charge' };
  }
  return {
    data: {
      tableNumber: '',
      guestCount: 0,
      captain: '',
      customerName,
      mobileNumber,
      deliveryAddress,
      packingCharge: 0,
      deliveryCharge: round2(deliveryCharge),
    },
  };
};

const buildOrderItems = async (req, items = []) => {
  if (!Array.isArray(items) || !items.length) {
    return { billItems: [], subtotal: 0, totalGst: 0, itemCount: 0 };
  }

  const foodIds = items.map((item) => item.foodItemId).filter(Boolean);
  if (foodIds.length !== items.length) {
    return { error: RES_MESSAGE.VALIDATION.BILL_ITEMS_REQUIRED };
  }

  const foodItems = await FoodItem.find({
    _id: { $in: foodIds },
    ...tenantFilter(req),
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
      return { error: RES_MESSAGE.VALIDATION.BILL_ITEM_UNAVAILABLE };
    }

    const quantity = Number(selected.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: RES_MESSAGE.VALIDATION.INVALID_BILL_QUANTITY };
    }

    const lineSubtotal = round2(food.price * quantity);
    const gstAmount = round2((lineSubtotal * (food.gstPercent || 0)) / 100);
    const lineTotal = round2(lineSubtotal + gstAmount);

    billItems.push({
      foodItemId: food._id,
      itemName: food.itemName,
      type: food.type,
      category: food.category,
      price: food.price,
      gstPercent: food.gstPercent || 0,
      quantity,
      subtotal: lineSubtotal,
      gstAmount,
      lineTotal,
      note: String(selected.note || '').trim(),
    });

    subtotal += lineSubtotal;
    totalGst += gstAmount;
  }

  return {
    billItems,
    subtotal: round2(subtotal),
    totalGst: round2(totalGst),
    itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
  };
};

const applyTotals = (orderDoc, billItems, subtotal, totalGst, itemCount) => {
  const extraCharges = calcExtraCharges(
    orderDoc.orderType,
    orderDoc.packingCharge,
    orderDoc.deliveryCharge
  );
  orderDoc.items = billItems;
  orderDoc.itemCount = itemCount;
  orderDoc.subtotal = subtotal;
  orderDoc.totalGst = totalGst;
  orderDoc.extraCharges = extraCharges;
  orderDoc.grandTotal = round2(subtotal + totalGst + extraCharges);
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const status = String(req.query.status || 'All').trim();
    const orderType = String(req.query.orderType || 'All').trim();
    const fromDate = String(req.query.from_date || '').trim();
    const toDate = String(req.query.to_date || '').trim();
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const rawLimit = Number.parseInt(
      String(req.query.limit || req.query.count || '10'),
      10
    );
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 10));
    const skip = (page - 1) * limit;

    const filter = { ...tenantFilter(req) };

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (orderType && orderType !== 'All' && ORDER_TYPES.includes(orderType)) {
      filter.orderType = orderType;
    }

    if (fromDate || toDate) {
      const startStr = /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate : null;
      const endStr = /^\d{4}-\d{2}-\d{2}$/.test(toDate)
        ? toDate
        : startStr;
      if (startStr) {
        const start = new Date(`${startStr}T00:00:00+05:30`);
        const end = new Date(`${endStr}T23:59:59.999+05:30`);
        filter.orderDate = { $gte: start, $lte: end };
      }
    }

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ orderDate: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

    const counts = {
      all: 0,
      draft: 0,
      billed: 0,
      cancelled: 0,
      dineIn: 0,
      parcel: 0,
      delivery: 0,
    };

    // Counts for current date filter only (ignore type/status for chip counts)
    const countFilter = { ...tenantFilter(req) };
    if (filter.orderDate) countFilter.orderDate = filter.orderDate;
    const countOrders = await Order.find(countFilter).select('status orderType').lean().exec();
    countOrders.forEach((order) => {
      counts.all += 1;
      if (order.status === 'Draft') counts.draft += 1;
      if (order.status === 'Billed') counts.billed += 1;
      if (order.status === 'Cancelled') counts.cancelled += 1;
      if (order.orderType === 'Dine-In') counts.dineIn += 1;
      if (order.orderType === 'Parcel') counts.parcel += 1;
      if (order.orderType === 'Delivery') counts.delivery += 1;
    });

    return res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      orders,
      counts,
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

export const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const order = await Order.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean().exec();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const orderType = String(req.body.orderType || '').trim();
    const meta = validateOrderMeta(orderType, req.body);
    if (meta.error) {
      return res.status(400).json({ success: false, message: meta.error });
    }

    // One open draft per dine-in table
    if (orderType === 'Dine-In') {
      const existing = await Order.findOne({
        ...tenantFilter(req),
        status: 'Draft',
        orderType: 'Dine-In',
        tableNumber: meta.data.tableNumber,
      })
        .lean()
        .exec();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Existing draft order found for this table',
          order: existing,
          resumed: true,
        });
      }
    }

    const orderNo = await createOrderNo(req);
    const extraCharges = calcExtraCharges(
      orderType,
      meta.data.packingCharge,
      meta.data.deliveryCharge
    );
    const orderDate = parseOrderDate(req.body.orderDate);

    const order = await new Order({
      ...tenantStamp(req),
      orderNo,
      orderType,
      orderDate,
      status: 'Draft',
      ...meta.data,
      items: [],
      itemCount: 0,
      subtotal: 0,
      totalGst: 0,
      extraCharges,
      grandTotal: extraCharges,
    }).save();

    return res.status(201).json({
      success: true,
      message: 'Order draft created',
      order: order.toObject(),
      resumed: false,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const order = await Order.findOne({ _id: req.params.id, ...tenantFilter(req) }).exec();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft orders can be updated',
      });
    }

    if (req.body.orderDate !== undefined) {
      order.orderDate = parseOrderDate(req.body.orderDate);
    }

    if (req.body.orderType || req.body.tableNumber !== undefined || req.body.customerName !== undefined) {
      const orderType = String(req.body.orderType || order.orderType).trim();
      const meta = validateOrderMeta(orderType, { ...order.toObject(), ...req.body });
      if (meta.error) {
        return res.status(400).json({ success: false, message: meta.error });
      }
      order.orderType = orderType;
      Object.assign(order, meta.data);
    }

    if (Array.isArray(req.body.items)) {
      const built = await buildOrderItems(req, req.body.items);
      if (built.error) {
        return res.status(400).json({ success: false, message: built.error });
      }
      applyTotals(order, built.billItems, built.subtotal, built.totalGst, built.itemCount);
    } else {
      applyTotals(
        order,
        order.items,
        order.subtotal,
        order.totalGst,
        order.itemCount
      );
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order updated',
      order: order.toObject(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const generateBillFromOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const order = await Order.findOne({ _id: req.params.id, ...tenantFilter(req) }).exec();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'This order is already billed or cancelled',
      });
    }
    if (!order.items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one food item before generating bill',
      });
    }

    // Re-validate items against current menu
    const rebuilt = await buildOrderItems(
      req,
      order.items.map((item) => ({
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        note: item.note,
      }))
    );
    if (rebuilt.error) {
      return res.status(400).json({ success: false, message: rebuilt.error });
    }

    applyTotals(
      order,
      rebuilt.billItems,
      rebuilt.subtotal,
      rebuilt.totalGst,
      rebuilt.itemCount
    );

    const billNo = await nextBillNo(req);
    const bill = await new Bill({
      ...tenantStamp(req),
      billNo,
      customerName: buildCustomerLabel(order),
      billDate: order.orderDate || new Date(),
      items: rebuilt.billItems.map(({ note, ...item }) => item),
      itemCount: rebuilt.itemCount,
      subtotal: rebuilt.subtotal,
      totalGst: rebuilt.totalGst,
      grandTotal: order.grandTotal,
      status: 'Paid',
      orderId: order._id,
      orderType: order.orderType,
      packingCharge: order.packingCharge,
      deliveryCharge: order.deliveryCharge,
      mobileNumber: order.mobileNumber,
      deliveryAddress: order.deliveryAddress,
      tableNumber: order.tableNumber,
    }).save();

    order.status = 'Billed';
    order.billId = bill._id;
    order.billNo = bill.billNo;
    await order.save();

    return res.status(201).json({
      success: true,
      message: RES_MESSAGE.BILL.CREATED,
      order: order.toObject(),
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

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const order = await Order.findOne({ _id: req.params.id, ...tenantFilter(req) }).exec();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft orders can be cancelled',
      });
    }

    order.status = 'Cancelled';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order cancelled',
      order: order.toObject(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
