import mongoose from 'mongoose';

export const ORDER_TYPES = ['Dine-In', 'Parcel', 'Delivery'];
export const ORDER_STATUSES = ['Draft', 'Billed', 'Cancelled'];

const orderItemSchema = new mongoose.Schema(
  {
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItems',
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    category: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    gstPercent: { type: Number, required: true, min: 0, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    note: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const orderSchema = mongoose.Schema(
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
    orderNo: { type: String, required: true, trim: true },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Draft',
      index: true,
    },
    orderDate: { type: Date, default: Date.now },
    // Dine-In
    tableNumber: { type: String, default: '', trim: true },
    guestCount: { type: Number, default: 0, min: 0 },
    captain: { type: String, default: '', trim: true },
    // Parcel / Delivery
    customerName: { type: String, default: '', trim: true },
    mobileNumber: { type: String, default: '', trim: true },
    deliveryAddress: { type: String, default: '', trim: true },
    packingCharge: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    items: { type: [orderItemSchema], default: [] },
    itemCount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
    totalGst: { type: Number, default: 0, min: 0 },
    extraCharges: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bills',
      default: null,
    },
    billNo: { type: String, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, orderNo: 1 }, { unique: true });
orderSchema.index({ userId: 1, status: 1, orderType: 1 });

const Order = mongoose.model('Orders', orderSchema);

export default Order;
