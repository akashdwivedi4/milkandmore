import { Types, ClientSession } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { StockMovement, StockMovementType, IStockMovement } from '../models/StockMovement';
import { AppError } from '../middleware/errorHandler';
import { roundStock, roundMoney } from '../utils/math';

export const adjustStock = async (
  businessId: string | Types.ObjectId,
  productId: string | Types.ObjectId,
  type: StockMovementType,
  quantityChange: number,
  unit: string,
  normalizedChange: number, // positive = add stock, negative = deduct stock
  referenceId?: string | Types.ObjectId,
  referenceType?: string,
  reason?: string,
  userId?: string | Types.ObjectId,
  session?: ClientSession | null,
  allowNegativeStock: boolean = false
): Promise<{ product: IProduct; movement: IStockMovement }> => {
  const bizId = new Types.ObjectId(businessId);
  const prodId = new Types.ObjectId(productId);

  const product = await Product.findOne({ _id: prodId, businessId: bizId }).session(session || null);
  if (!product) {
    throw new AppError('Product not found for inventory operation.', 404);
  }

  const previousStock = product.currentStock;
  const newStock = roundStock(previousStock + normalizedChange);

  if (newStock < 0 && !allowNegativeStock) {
    throw new AppError(
      `ERR_INSUFFICIENT_STOCK: Insufficient stock for ${product.name}. Available: ${previousStock} ${product.defaultUnit}, Required: ${Math.abs(normalizedChange)} ${product.defaultUnit}`,
      400
    );
  }

  product.currentStock = newStock;
  await product.save({ session: session || undefined });

  const movementDocs = await StockMovement.create(
    [
      {
        businessId: bizId,
        productId: prodId,
        type,
        quantity: Math.abs(quantityChange),
        unit,
        normalizedQty: normalizedChange,
        previousStock,
        newStock,
        referenceId: referenceId ? new Types.ObjectId(referenceId) : undefined,
        referenceType,
        reason: reason || `${type} inventory adjustment`,
        createdBy: userId ? new Types.ObjectId(userId) : undefined,
        createdAt: new Date(),
      },
    ],
    { session: session || undefined }
  );

  return { product, movement: movementDocs[0] };
};

export const updateWeightedAverageCost = async (
  businessId: string | Types.ObjectId,
  productId: string | Types.ObjectId,
  purchaseQtyNormalized: number,
  purchaseRate: number,
  session?: ClientSession | null
): Promise<number> => {
  const bizId = new Types.ObjectId(businessId);
  const prodId = new Types.ObjectId(productId);

  const product = await Product.findOne({ _id: prodId, businessId: bizId }).session(session || null);
  if (!product) return 0;

  const currentStock = Math.max(0, product.currentStock);
  const currentCost = product.averageCost || product.defaultRate || 0;
  const newStockTotal = currentStock + purchaseQtyNormalized;

  let newAverageCost = currentCost;
  if (newStockTotal > 0) {
    const totalValue = currentStock * currentCost + purchaseQtyNormalized * purchaseRate;
    newAverageCost = roundMoney(totalValue / newStockTotal);
  } else {
    newAverageCost = purchaseRate;
  }

  product.averageCost = newAverageCost;
  await product.save({ session: session || undefined });

  return newAverageCost;
};
