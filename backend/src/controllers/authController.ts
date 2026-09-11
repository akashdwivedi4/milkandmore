import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { FinancialAccount } from '../models/FinancialAccount';
import { signToken } from '../utils/jwt';
import { logAudit } from '../services/auditService';
import { seedDefaultBusinessData } from '../services/seedService';
import { AppError } from '../middleware/errorHandler';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  const { businessName, name, email, password, mobile, timezone, currency } = req.body;

  if (!businessName || !name || !email || !password) {
    throw new AppError('Business name, user name, email, and password are required.', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const business = await Business.create({
    name: businessName.trim(),
    ownerName: name.trim(),
    mobile: mobile || '0000000000',
    timezone: timezone || 'Asia/Kolkata',
    currency: currency || 'INR',
    setupCompleted: false,
    openingCash: 0,
    openingUpi: 0,
    openingBank: 0,
  });

  const user = await User.create({
    businessId: business._id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    mobile,
    role: 'OWNER',
    isActive: true,
  });

  business.ownerId = user._id;
  await business.save();

  // Seed default products and account balances
  await seedDefaultBusinessData(business._id);

  const token = signToken({
    userId: user._id.toString(),
    businessId: business._id.toString(),
    role: user.role,
  });

  await logAudit(business._id, user._id, 'OWNER', 'REGISTER_BUSINESS', 'Business', business._id.toString(), {
    email: user.email,
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: business._id.toString(),
      },
      business: {
        id: business._id.toString(),
        name: business.name,
        setupCompleted: business.setupCompleted,
        timezone: business.timezone,
        currency: business.currency,
      },
    },
  });
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account deactivated. Please contact support.', 403);
  }

  const business = await Business.findById(user.businessId);
  if (!business) {
    throw new AppError('Associated business not found.', 404);
  }

  const token = signToken({
    userId: user._id.toString(),
    businessId: business._id.toString(),
    role: user.role,
  });

  await logAudit(business._id, user._id, user.role, 'LOGIN', 'User', user._id.toString());

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: business._id.toString(),
      },
      business: {
        id: business._id.toString(),
        name: business.name,
        setupCompleted: business.setupCompleted,
        timezone: business.timezone,
        currency: business.currency,
        openingCash: business.openingCash,
        openingUpi: business.openingUpi,
        openingBank: business.openingBank,
      },
    },
  });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const business = await Business.findById(req.user.business_id);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: req.user.role, // Reflect any simulated or verified role
        businessId: business._id.toString(),
      },
      business: {
        id: business._id.toString(),
        name: business.name,
        ownerName: business.ownerName,
        mobile: business.mobile,
        address: business.address,
        logo: business.logo,
        timezone: business.timezone,
        currency: business.currency,
        setupCompleted: business.setupCompleted,
        openingCash: business.openingCash,
        openingUpi: business.openingUpi,
        openingBank: business.openingBank,
      },
    },
  });
};

export const completeOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const {
    businessName,
    ownerName,
    mobile,
    address,
    logo,
    timezone,
    currency,
    openingCash,
    openingUpi,
    openingBank,
  } = req.body;

  const business = await Business.findById(req.user.business_id);
  if (!business) throw new AppError('Business not found', 404);

  if (businessName) business.name = businessName.trim();
  if (ownerName) business.ownerName = ownerName.trim();
  if (mobile) business.mobile = mobile.trim();
  if (address !== undefined) business.address = address.trim();
  if (logo !== undefined) business.logo = logo;
  if (timezone) business.timezone = timezone;
  if (currency) business.currency = currency;
  if (openingCash !== undefined) business.openingCash = Number(openingCash);
  if (openingUpi !== undefined) business.openingUpi = Number(openingUpi);
  if (openingBank !== undefined) business.openingBank = Number(openingBank);

  business.setupCompleted = true;
  await business.save();

  // Initialize financial accounts opening balances
  if (openingCash !== undefined) {
    await FinancialAccount.findOneAndUpdate(
      { businessId: business._id, accountType: 'CASH' },
      { $set: { openingBalance: Number(openingCash) } },
      { upsert: true }
    );
  }
  if (openingUpi !== undefined) {
    await FinancialAccount.findOneAndUpdate(
      { businessId: business._id, accountType: 'UPI' },
      { $set: { openingBalance: Number(openingUpi) } },
      { upsert: true }
    );
  }
  if (openingBank !== undefined) {
    await FinancialAccount.findOneAndUpdate(
      { businessId: business._id, accountType: 'BANK' },
      { $set: { openingBalance: Number(openingBank) } },
      { upsert: true }
    );
  }

  await logAudit(business._id, req.user.id, req.user.role, 'COMPLETE_ONBOARDING', 'Business', business._id.toString());

  res.json({
    success: true,
    message: 'Onboarding completed successfully.',
    data: business,
  });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required.', 400);
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError('Current password is incorrect.', 400);

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  await logAudit(user.businessId, user._id, user.role, 'CHANGE_PASSWORD', 'User', user._id.toString());

  res.json({
    success: true,
    message: 'Password changed successfully.',
  });
};
