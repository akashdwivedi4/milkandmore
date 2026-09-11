import { Response } from 'express';
import { AuthRequest } from '../types';
import { supplierRepository } from '../repositories/supplierRepository';
import { logAudit } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';
import { postJournalEntry, CHART_OF_ACCOUNTS } from '../services/accountingService';
import { getTodayDateString } from '../utils/date';

export const getSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { search, active } = req.query;
  const suppliers = await supplierRepository.getAll(req.user.business_id, {
    search: search ? String(search) : undefined,
    active: active !== undefined ? active === 'true' : undefined,
  });

  res.json({
    success: true,
    data: suppliers,
  });
};

export const getSupplierById = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const supplier = await supplierRepository.getById(req.user.business_id, String(req.params.id));
  if (!supplier) throw new AppError('Supplier not found.', 404);

  res.json({
    success: true,
    data: supplier,
  });
};

export const createSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { name, mobile } = req.body;
  if (!name || !mobile) {
    throw new AppError('Supplier name and mobile are required.', 400);
  }

  const supplier = await supplierRepository.create(req.user.business_id, req.body);

  const opPayable = Number(supplier.openingPayable || 0);
  if (opPayable > 0) {
    await postJournalEntry({
      businessId: req.user.business_id,
      entryDate: getTodayDateString(),
      entryType: 'OPENING_BALANCE',
      referenceType: 'SUPPLIER_OPENING',
      referenceId: supplier.id,
      narration: `Opening balance for supplier ${supplier.name}`,
      lines: [
        {
          accountCode: CHART_OF_ACCOUNTS.OPENING_EQUITY.code,
          accountName: CHART_OF_ACCOUNTS.OPENING_EQUITY.name,
          accountType: 'EQUITY',
          debit: opPayable,
          credit: 0,
        },
        {
          accountCode: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code,
          accountName: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.name,
          accountType: 'LIABILITY',
          debit: 0,
          credit: opPayable,
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          partyName: supplier.name,
        },
      ],
    });
  } else if (opPayable < 0) {
    const absPayable = Math.abs(opPayable);
    await postJournalEntry({
      businessId: req.user.business_id,
      entryDate: getTodayDateString(),
      entryType: 'OPENING_BALANCE',
      referenceType: 'SUPPLIER_OPENING',
      referenceId: supplier.id,
      narration: `Opening advance for supplier ${supplier.name}`,
      lines: [
        {
          accountCode: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code,
          accountName: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.name,
          accountType: 'LIABILITY',
          debit: absPayable,
          credit: 0,
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          partyName: supplier.name,
        },
        {
          accountCode: CHART_OF_ACCOUNTS.OPENING_EQUITY.code,
          accountName: CHART_OF_ACCOUNTS.OPENING_EQUITY.name,
          accountType: 'EQUITY',
          debit: 0,
          credit: absPayable,
        },
      ],
    });
  }

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'CREATE_SUPPLIER',
    'Supplier',
    supplier.id,
    { name: supplier.name }
  );

  res.status(201).json({
    success: true,
    data: supplier,
  });
};

export const updateSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const supplier = await supplierRepository.update(
    req.user.business_id,
    String(req.params.id),
    req.body
  );

  if (!supplier) throw new AppError('Supplier not found.', 404);

  res.json({
    success: true,
    data: supplier,
  });
};

export const deleteSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const success = await supplierRepository.delete(req.user.business_id, String(req.params.id));
  if (!success) throw new AppError('Supplier not found.', 404);

  res.json({
    success: true,
    message: 'Supplier deactivated successfully.',
  });
};

export const getSupplierLedgerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const ledger = await supplierRepository.getLedger(req.user.business_id, String(req.params.id));
  res.json({
    success: true,
    data: ledger,
  });
};

