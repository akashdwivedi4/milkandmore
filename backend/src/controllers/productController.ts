import { Response } from 'express';
import { AuthRequest } from '../types';
import { Product } from '../models/Product';
import { CustomerRate } from '../models/CustomerRate';
import { Delivery } from '../models/Delivery';
import { Purchase } from '../models/Purchase';
import { StockMovement } from '../models/StockMovement';
import { logAudit } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { status, search } = req.query;
  const filter: any = {
    businessId: new Types.ObjectId(req.user.business_id),
    isDeleted: { $ne: true },
  };

  if (status === 'INACTIVE') {
    filter.isActive = false;
  } else if (status === 'ALL') {
    // Both active and inactive
  } else {
    // Default active only
    filter.isActive = true;
  }

  if (search) {
    filter.name = new RegExp(String(search).trim(), 'i');
  }

  const products = await Product.find(filter).sort({ name: 1 });

  const mapped = products.map((p) => ({
    id: p._id.toString(),
    business_id: p.businessId.toString(),
    name: p.name,
    category: p.category,
    base_unit: p.defaultUnit,
    default_unit: p.defaultUnit,
    supported_units: [
      { unit: p.defaultUnit, factor: 1 },
      ...(p.defaultUnit === 'L' ? [{ unit: 'ML', factor: 0.001 }] : []),
      ...(p.defaultUnit === 'KG' ? [{ unit: 'G', factor: 0.001 }] : []),
    ],
    default_rate: p.defaultRate,
    current_stock: p.currentStock,
    average_cost: p.averageCost,
    low_stock_threshold: p.minStockAlert,
    is_active: p.isActive,
    created_at: p.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: mapped,
  });
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { name, category, defaultUnit, base_unit, defaultRate, default_rate, currentStock, initial_stock, minStockAlert } =
    req.body;

  if (!name || (defaultRate === undefined && default_rate === undefined)) {
    throw new AppError('Product name and default rate are required.', 400);
  }

  const rate = Number(defaultRate ?? default_rate);
  const stock = Number(currentStock ?? initial_stock ?? 0);
  const unit = (defaultUnit || base_unit || 'L').toUpperCase();

  const product = await Product.create({
    businessId: new Types.ObjectId(req.user.business_id),
    name: name.trim(),
    category: category || 'Dairy',
    defaultUnit: unit,
    defaultRate: rate,
    currentStock: stock,
    averageCost: rate * 0.75, // Reasonable initial valuation baseline
    minStockAlert: minStockAlert ? Number(minStockAlert) : 10,
    isActive: true,
  });

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'CREATE_PRODUCT',
    'Product',
    product._id.toString(),
    { name: product.name, rate: product.defaultRate }
  );

  res.status(201).json({
    success: true,
    data: {
      id: product._id.toString(),
      name: product.name,
      default_rate: product.defaultRate,
      current_stock: product.currentStock,
      base_unit: product.defaultUnit,
    },
  });
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const product = await Product.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!product) throw new AppError('Product not found.', 404);

  const { name, category, defaultUnit, defaultRate, default_rate, minStockAlert, is_active } = req.body;

  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category;
  if (defaultUnit !== undefined) product.defaultUnit = defaultUnit.toUpperCase();
  if (defaultRate !== undefined || default_rate !== undefined) {
    product.defaultRate = Number(defaultRate ?? default_rate);
  }
  if (minStockAlert !== undefined) product.minStockAlert = Number(minStockAlert);
  if (is_active !== undefined) product.isActive = Boolean(is_active);

  await product.save();

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'UPDATE_PRODUCT',
    'Product',
    product._id.toString()
  );

  res.json({
    success: true,
    data: product,
  });
};

export const getCustomerRates = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const customerId = String(req.params.customerId);

  const rates = await CustomerRate.find({
    businessId: new Types.ObjectId(req.user.business_id),
    customerId: new Types.ObjectId(customerId),
  }).populate('productId');

  const mapped = rates.map((r) => ({
    id: r._id.toString(),
    customer_id: r.customerId.toString(),
    product_id: r.productId ? (r.productId as any)._id?.toString() || r.productId.toString() : '',
    custom_rate: r.customRate,
    product: r.productId,
  }));

  res.json({
    success: true,
    data: mapped,
  });
};

export const setCustomerRate = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { customer_id, customerId, product_id, productId, custom_rate, customRate } = req.body;

  const custId = customer_id || customerId;
  const prodId = product_id || productId;
  const rate = custom_rate ?? customRate;

  if (!custId || !prodId || rate === undefined) {
    throw new AppError('customerId, productId, and customRate are required.', 400);
  }

  const updated = await CustomerRate.findOneAndUpdate(
    {
      businessId: new Types.ObjectId(req.user.business_id),
      customerId: new Types.ObjectId(custId),
      productId: new Types.ObjectId(prodId),
    },
    {
      $set: { customRate: Number(rate) },
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    data: updated,
    message: 'Customer rate updated successfully.',
  });
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const productId = req.params.id;
  const bizId = new Types.ObjectId(req.user.business_id);

  const product = await Product.findOne({
    _id: productId,
    businessId: bizId,
  });

  if (!product) {
    throw new AppError('Product not found.', 404);
  }

  // Remove customer rates for this product
  await CustomerRate.deleteMany({ productId: product._id, businessId: bizId });

  // Check for historical transaction usage in deliveries, purchases, and stock movements
  const [deliveryCount, purchaseCount, movementCount] = await Promise.all([
    Delivery.countDocuments({ 'items.productId': product._id, businessId: bizId }),
    Purchase.countDocuments({ 'items.productId': product._id, businessId: bizId }),
    StockMovement.countDocuments({ productId: product._id, businessId: bizId }),
  ]);

  const hasHistory = deliveryCount > 0 || purchaseCount > 0 || movementCount > 0;

  if (hasHistory) {
    // Safe soft-delete: preserve historical snapshot for existing delivery, purchase, and stock movements
    product.isDeleted = true;
    product.isActive = false;
    product.deletedAt = new Date();
    await product.save();
  } else {
    await Product.deleteOne({ _id: product._id, businessId: bizId });
  }

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'DELETE_PRODUCT',
    'Product',
    product._id.toString(),
    { name: product.name, softDeleted: hasHistory }
  );

  res.json({
    success: true,
    message: `Product "${product.name}" deleted successfully.`,
  });
};

export const activateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const product = await Product.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!product) throw new AppError('Product not found.', 404);

  product.isActive = true;
  await product.save();

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'ACTIVATE_PRODUCT',
    'Product',
    product._id.toString(),
    { name: product.name }
  );

  res.json({
    success: true,
    message: `Product "${product.name}" activated successfully.`,
    data: product,
  });
};

export const deactivateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const product = await Product.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!product) throw new AppError('Product not found.', 404);

  product.isActive = false;
  await product.save();

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'DEACTIVATE_PRODUCT',
    'Product',
    product._id.toString(),
    { name: product.name }
  );

  res.json({
    success: true,
    message: `Product "${product.name}" deactivated successfully.`,
    data: product,
  });
};
