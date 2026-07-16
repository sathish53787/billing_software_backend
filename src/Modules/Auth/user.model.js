import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    profileImage: { type: String, default: null },
    role: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
      default: 'admin',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null,
      index: true,
    },
    is_company: { type: Boolean, default: false },
    account_deactivated: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });

const User = mongoose.model('Users', userSchema);

export default User;
