import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema(
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
    gstPercent: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const billSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      index: true,
    },
    billNo: { type: String, required: true, trim: true },
    customerName: { type: String, default: '', trim: true },
    billDate: { type: Date, default: Date.now },
    items: {
      type: [billItemSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one item is required',
      },
    },
    itemCount: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    totalGst: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Paid', 'Pending'],
      default: 'Paid',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orders',
      default: null,
    },
    orderType: { type: String, default: null },
    packingCharge: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    mobileNumber: { type: String, default: '', trim: true },
    deliveryAddress: { type: String, default: '', trim: true },
    tableNumber: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

billSchema.index({ userId: 1, billNo: 1 }, { unique: true });

const Bill = mongoose.model('Bills', billSchema);

export default Bill;
