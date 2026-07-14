import mongoose from 'mongoose';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const TYPES = ['Veg', 'Non-Veg'];

const foodItemSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      index: true,
    },
    itemName: { type: String, required: true, trim: true },
    category: {
      type: [{ type: String, enum: CATEGORIES }],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one category is required',
      },
    },
    type: {
      type: String,
      required: true,
      enum: TYPES,
    },
    price: { type: Number, required: true, min: 0 },
    gstPercent: { type: Number, required: false, default: 0, min: 0, max: 100 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

foodItemSchema.index({ userId: 1, itemName: 1 });

const FoodItem = mongoose.model('FoodItems', foodItemSchema);

export { CATEGORIES, TYPES };
export default FoodItem;
