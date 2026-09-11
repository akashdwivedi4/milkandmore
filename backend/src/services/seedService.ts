import { Types } from 'mongoose';
import { Product } from '../models/Product';
import { FinancialAccount } from '../models/FinancialAccount';

export const seedDefaultBusinessData = async (businessId: string | Types.ObjectId): Promise<void> => {
  const bizId = new Types.ObjectId(businessId);

  // 1. Seed default products if not exists
  const existingCount = await Product.countDocuments({ businessId: bizId });
  if (existingCount === 0) {
    await Product.create([
      {
        businessId: bizId,
        name: 'Cow Milk',
        category: 'Milk',
        defaultUnit: 'L',
        defaultRate: 60,
        currentStock: 150,
        averageCost: 45,
        minStockAlert: 20,
        isActive: true,
      },
      {
        businessId: bizId,
        name: 'Buffalo Milk',
        category: 'Milk',
        defaultUnit: 'L',
        defaultRate: 70,
        currentStock: 100,
        averageCost: 55,
        minStockAlert: 15,
        isActive: true,
      },
      {
        businessId: bizId,
        name: 'Dahi',
        category: 'Curd',
        defaultUnit: 'KG',
        defaultRate: 80,
        currentStock: 25,
        averageCost: 60,
        minStockAlert: 5,
        isActive: true,
      },
      {
        businessId: bizId,
        name: 'Paneer',
        category: 'Dairy',
        defaultUnit: 'KG',
        defaultRate: 360,
        currentStock: 15,
        averageCost: 280,
        minStockAlert: 5,
        isActive: true,
      },
      {
        businessId: bizId,
        name: 'Ghee',
        category: 'Dairy',
        defaultUnit: 'KG',
        defaultRate: 650,
        currentStock: 10,
        averageCost: 520,
        minStockAlert: 2,
        isActive: true,
      },
    ]);
  }

  // 2. Ensure FinancialAccounts exist
  for (const acc of ['CASH', 'UPI', 'BANK'] as const) {
    const exists = await FinancialAccount.findOne({ businessId: bizId, accountType: acc });
    if (!exists) {
      await FinancialAccount.create({
        businessId: bizId,
        accountType: acc,
        openingBalance: 0,
        currentBalance: 0,
      });
    }
  }
};
