import { Types, ClientSession } from 'mongoose';
import { FinancialAccount, AccountType } from '../models/FinancialAccount';
import { roundMoney } from '../utils/math';

export const updateAccountBalance = async (
  businessId: string | Types.ObjectId,
  accountType: 'CASH' | 'UPI' | 'BANK' | 'Cash' | 'UPI' | 'Bank' | string,
  amountChange: number,
  session?: ClientSession | null
): Promise<number> => {
  const normType = accountType.toUpperCase() as AccountType;
  if (!['CASH', 'UPI', 'BANK'].includes(normType)) {
    return 0; // Other / ignore
  }

  const bizId = new Types.ObjectId(businessId);
  const options = { session, upsert: true, new: true };

  const account = await FinancialAccount.findOneAndUpdate(
    { businessId: bizId, accountType: normType },
    {
      $inc: { currentBalance: roundMoney(amountChange) },
      $setOnInsert: { openingBalance: 0 },
      $set: { updatedAt: new Date() },
    },
    options
  );

  return account?.currentBalance || 0;
};
