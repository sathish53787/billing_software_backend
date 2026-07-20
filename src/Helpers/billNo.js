import mongoose from 'mongoose';
import Bill from '../Modules/Billing/bill.model.js';
import { getCmpyId, getUserId } from './tenant.js';

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const raw = String(value);
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

/**
 * Fetch the last bill number for the tenant, then return last + 1.
 * Example: last is 0014 → next is 0015
 */
export const nextBillNo = async (req) => {
  const company = toObjectId(getCmpyId(req));
  const userId = toObjectId(getUserId(req));

  if (!company && !userId) {
    return '0001';
  }

  // Match company bills and legacy user bills (unique index is userId + billNo)
  const filter = company
    ? { $or: [{ company }, ...(userId ? [{ userId }] : [])] }
    : { userId };

  // find() casts ObjectIds; aggregate $match does not (that caused 0001)
  const bills = await Bill.find(filter).select('billNo').lean().exec();

  let lastNumber = 0;
  for (const bill of bills) {
    const n = Number.parseInt(String(bill.billNo || ''), 10);
    if (Number.isFinite(n) && n > lastNumber) lastNumber = n;
  }

  return String(lastNumber + 1).padStart(4, '0');
};
