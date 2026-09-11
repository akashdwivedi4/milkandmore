import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, UserRole } from '../types';
import { Business } from '../models/Business';
import { User } from '../models/User';
import { logAudit } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const business = await Business.findById(req.user.business_id);
  if (!business) throw new AppError('Business not found.', 404);

  res.json({
    success: true,
    data: business,
  });
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const business = await Business.findById(req.user.business_id);
  if (!business) throw new AppError('Business not found.', 404);

  const {
    name,
    mobile,
    phone,
    address,
    email,
    gstNumber,
    gst_number,
    state,
    tagline,
    upiId,
    upi_id,
    signature,
    termsAndConditions,
    terms_and_conditions,
    logo,
    timezone,
    currency,
    openingCash,
    openingUpi,
    openingBank,
  } = req.body;

  if (name !== undefined) business.name = name.trim();
  if (mobile !== undefined) business.mobile = mobile.trim();
  if (phone !== undefined && mobile === undefined) business.mobile = phone.trim();
  if (email !== undefined) business.email = email.trim();
  if (address !== undefined) business.address = address.trim();
  if (gstNumber !== undefined) business.gstNumber = gstNumber.trim();
  if (gst_number !== undefined && gstNumber === undefined) business.gstNumber = gst_number.trim();
  if (state !== undefined) business.state = state.trim();
  if (tagline !== undefined) business.tagline = tagline.trim();
  if (upiId !== undefined) business.upiId = upiId.trim();
  if (upi_id !== undefined && upiId === undefined) business.upiId = upi_id.trim();
  if (signature !== undefined) business.signature = signature;
  if (termsAndConditions !== undefined) business.termsAndConditions = termsAndConditions.trim();
  if (terms_and_conditions !== undefined && termsAndConditions === undefined) business.termsAndConditions = terms_and_conditions.trim();
  if (logo !== undefined) business.logo = logo;
  if (timezone !== undefined) business.timezone = timezone;
  if (currency !== undefined) business.currency = currency;
  if (openingCash !== undefined) business.openingCash = Number(openingCash);
  if (openingUpi !== undefined) business.openingUpi = Number(openingUpi);
  if (openingBank !== undefined) business.openingBank = Number(openingBank);

  await business.save();

  await logAudit(
    business._id,
    req.user.id,
    req.user.role,
    'UPDATE_SETTINGS',
    'Business',
    business._id.toString()
  );

  res.json({
    success: true,
    data: business,
    message: 'Business settings updated successfully.',
  });
};

export const getStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const users = await User.find({
    businessId: new Types.ObjectId(req.user.business_id),
  }).sort({ createdAt: -1 });

  const mapped = users.map((u) => ({
    id: u._id.toString(),
    business_id: u.businessId.toString(),
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    is_active: u.isActive,
    created_at: u.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: mapped,
  });
};

export const addStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const { name, email, password, mobile, role } = req.body;
  if (!name || !email || !password || !role) {
    throw new AppError('Name, email, password, and role are required.', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('A user with this email already exists.', 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const staff = await User.create({
    businessId: new Types.ObjectId(req.user.business_id),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    mobile: mobile?.trim(),
    role: role.toUpperCase() as UserRole,
    isActive: true,
  });

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'ADD_STAFF',
    'User',
    staff._id.toString(),
    { name: staff.name, email: staff.email, role: staff.role }
  );

  res.status(201).json({
    success: true,
    data: {
      id: staff._id.toString(),
      name: staff.name,
      email: staff.email,
      role: staff.role,
    },
    message: 'Staff member added successfully.',
  });
};
