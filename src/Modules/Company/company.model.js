import mongoose from 'mongoose';

const companySchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      unique: true,
      index: true,
    },
    companyName: { type: String, required: true, trim: true },
    companyPhone: { type: String, required: true, trim: true },
    access_url: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    address: { type: String, default: '', trim: true },
    companyLogo: { type: String, default: null },
    gstNo: { type: String, default: null, trim: true, uppercase: true },
    bankName: { type: String, default: null, trim: true },
    accountHolderName: { type: String, default: null, trim: true },
    accountNo: { type: String, default: null, trim: true },
    ifscCode: { type: String, default: null, trim: true, uppercase: true },
    upiId: { type: String, default: null, trim: true },
    upiName: { type: String, default: null, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Company = mongoose.model('Companies', companySchema);

export default Company;
