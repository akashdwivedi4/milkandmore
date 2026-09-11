import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { JournalEntry } from '../src/models/JournalEntry';
import { Product } from '../src/models/Product';
import { Customer } from '../src/models/Customer';
import { Supplier } from '../src/models/Supplier';

describe('Vyapar-Grade Double-Entry Accounting Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;
  let ownerToken: string;
  let businessId: string;
  let milkProductId: string;
  let customerId: string;
  let supplierId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    app = createApp();

    // Register test owner
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        businessName: 'Accounting Dairy Corp',
        name: 'Accountant Lead',
        email: 'accounts@dairycorp.com',
        mobile: '9888877777',
        password: 'Password123!',
      });

    expect(regRes.status).toBe(201);
    ownerToken = regRes.body.data.token;
    businessId = regRes.body.data.business.id;

    // Create a milk product with initial stock
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Cow Milk Gold',
        base_unit: 'L',
        default_rate: 60,
        purchase_rate: 45,
        initial_stock: 100,
        currentStock: 100,
      });

    expect(prodRes.status).toBe(201);
    milkProductId = prodRes.body.data.id;
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('1. GET /api/accounting/chart-of-accounts returns complete standard COA', async () => {
    const res = await request(app)
      .get('/api/accounting/chart-of-accounts')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(15);

    const codes = res.body.data.map((acc: any) => acc.code);
    expect(codes).toContain('1010'); // Cash
    expect(codes).toContain('1020'); // Bank
    expect(codes).toContain('1030'); // UPI
    expect(codes).toContain('1100'); // Receivables
    expect(codes).toContain('1200'); // Inventory
    expect(codes).toContain('2100'); // Payables
    expect(codes).toContain('3020'); // Opening Equity
    expect(codes).toContain('4010'); // Milk Sales
  });

  it('2. Model Invariant: rejects unbalanced journal entry (Total Debit != Total Credit)', async () => {
    await expect(
      JournalEntry.create({
        businessId: new mongoose.Types.ObjectId(businessId),
        entryNumber: 'JE-TEST-UNBALANCED',
        date: '2026-09-08',
        sourceType: 'ADJUSTMENT',
        narration: 'Unbalanced test entry',
        lines: [
          {
            accountCode: '1010',
            accountName: 'Cash in Hand',
            accountType: 'ASSET',
            debit: 500,
            credit: 0,
          },
          {
            accountCode: '4010',
            accountName: 'Milk Sales',
            accountType: 'INCOME',
            debit: 0,
            credit: 400, // Deliberate mismatch: 500 != 400
          },
        ],
      })
    ).rejects.toThrow(/Unbalanced journal entry/i);
  });

  it('3. Customer creation with opening balance creates balanced Opening Equity journal', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Sunita Sharma',
        mobile: '9811122233',
        address: 'Sector 14, Dairy Lane',
        opening_balance: 1500,
      });

    expect(res.status).toBe(201);
    customerId = res.body.data.id;

    // Verify journal entry exists for customer opening balance
    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'OPENING_BALANCE',
      sourceId: customerId,
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(1500);
    expect(je?.totalCredit).toBe(1500);
  });

  it('4. Supplier creation with opening payable creates balanced Opening Equity journal', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Vikas Cattle Farm',
        mobile: '9844455566',
        opening_payable: 3000,
      });

    expect(res.status).toBe(201);
    supplierId = res.body.data.id;

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'OPENING_BALANCE',
      sourceId: supplierId,
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(3000);
    expect(je?.totalCredit).toBe(3000);
  });

  it('5. Delivery recording creates balanced journal entry: Debit Receivables, Credit Milk Sales', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerId,
        shift: 'MORNING',
        items: [
          {
            productId: milkProductId,
            quantity: 2,
            unit: 'L',
            rate: 60,
          },
        ],
      });

    expect(res.status).toBe(201);
    const deliveryId = res.body.data._id || res.body.data.id;

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'DELIVERY',
      sourceId: String(deliveryId),
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(120);
    expect(je?.totalCredit).toBe(120);
    const drLine = je?.lines.find((l) => l.accountCode === '1100');
    const crLine = je?.lines.find((l) => l.accountCode === '4010');
    expect(drLine?.debit).toBe(120);
    expect(crLine?.credit).toBe(120);
  });

  it('6. Customer payment creates balanced journal entry: Debit Cash/UPI, Credit Receivables', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerId,
        amount: 500,
        paymentMode: 'UPI',
        paymentDate: '2026-09-08',
        referenceNumber: 'UPI-REF-001',
      });

    expect(res.status).toBe(201);
    const paymentId = res.body.data._id || res.body.data.id;

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'CUSTOMER_PAYMENT',
      sourceId: String(paymentId),
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(500);
    expect(je?.totalCredit).toBe(500);
    const drLine = je?.lines.find((l) => l.accountCode === '1030'); // UPI
    const crLine = je?.lines.find((l) => l.accountCode === '1100'); // Customer Receivables
    expect(drLine?.debit).toBe(500);
    expect(crLine?.credit).toBe(500);
  });

  it('7. Purchase recording creates balanced journal entry: Debit Inventory, Credit Supplier Payable & Cash', async () => {
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        supplierId,
        productId: milkProductId,
        quantity: 50,
        unit: 'L',
        purchaseRate: 45,
        paidAmount: 1000,
        paymentMode: 'BANK',
      });

    expect(res.status).toBe(201);
    const purchaseId = res.body.data._id || res.body.data.id;

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'PURCHASE',
      sourceId: String(purchaseId),
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(2250);
    expect(je?.totalCredit).toBe(2250);
    const invLine = je?.lines.find((l) => l.accountCode === '1200');
    const payLine = je?.lines.find((l) => l.accountCode === '2100');
    const bankLine = je?.lines.find((l) => l.accountCode === '1020');
    expect(invLine?.debit).toBe(2250);
    expect(payLine?.credit).toBe(1250);
    expect(bankLine?.credit).toBe(1000);
  });

  it('8. Supplier payment creates balanced journal entry: Debit Supplier Payables, Credit Bank', async () => {
    const res = await request(app)
      .post('/api/supplier-payments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        supplierId,
        amount: 800,
        paymentMode: 'BANK',
        paymentDate: '2026-09-08',
        referenceNumber: 'NEFT-002',
      });

    expect(res.status).toBe(201);
    const paymentId = res.body.data._id || res.body.data.id;

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'SUPPLIER_PAYMENT',
      sourceId: String(paymentId),
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(800);
    expect(je?.totalCredit).toBe(800);
    const drLine = je?.lines.find((l) => l.accountCode === '2100'); // Payables
    const crLine = je?.lines.find((l) => l.accountCode === '1020'); // Bank
    expect(drLine?.debit).toBe(800);
    expect(crLine?.credit).toBe(800);
  });

  it('9. Expense recording creates balanced journal entry: Debit Expense, Credit Cash', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        category: 'Vehicle Fuel Expense',
        description: 'Delivery van diesel refill',
        amount: 350,
        payment_method: 'CASH',
      });

    expect(res.status).toBe(201);
    const expenseId = res.body.data._id || res.body.data.id;

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'EXPENSE',
      sourceId: expenseId,
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(350);
    expect(je?.totalCredit).toBe(350);
    const drLine = je?.lines.find((l) => l.accountCode === '6050'); // Fuel
    const crLine = je?.lines.find((l) => l.accountCode === '1010'); // Cash
    expect(drLine?.debit).toBe(350);
    expect(crLine?.credit).toBe(350);
  });

  it('10. Internal Transfer (Cash to Bank) creates balanced journal entry', async () => {
    const res = await request(app)
      .post('/api/accounting/transfer')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        fromAccount: 'CASH',
        toAccount: 'BANK',
        amount: 200,
        notes: 'Deposit daily cash to bank',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const je = await JournalEntry.findOne({
      businessId,
      sourceType: 'TRANSFER',
    });

    expect(je).toBeTruthy();
    expect(je?.totalDebit).toBe(200);
    expect(je?.totalCredit).toBe(200);
    const drLine = je?.lines.find((l) => l.accountCode === '1020'); // Bank
    const crLine = je?.lines.find((l) => l.accountCode === '1010'); // Cash
    expect(drLine?.debit).toBe(200);
    expect(crLine?.credit).toBe(200);
  });

  it('11. GET /api/accounting/trial-balance satisfies invariant: Total Debits === Total Credits', async () => {
    const res = await request(app)
      .get('/api/accounting/trial-balance')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isBalanced).toBe(true);
    expect(res.body.data.difference).toBe(0);
    expect(res.body.data.totalDebit).toBe(res.body.data.totalCredit);
    expect(res.body.data.totalDebit).toBeGreaterThan(0);
  });

  it('12. GET /api/accounting/profit-loss calculates gross & net profit correctly', async () => {
    const res = await request(app)
      .get('/api/accounting/profit-loss')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.revenue.total).toBe(120); // Milk sales
    expect(res.body.data.operatingExpenses.total).toBe(350); // Fuel expense
    expect(res.body.data.netProfit).toBe(120 - 350); // -230
  });

  it('13. GET /api/accounting/balance-sheet satisfies fundamental equation: Assets === Liabilities + Equity', async () => {
    const res = await request(app)
      .get('/api/accounting/balance-sheet')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isBalanced).toBe(true);
    expect(res.body.data.difference).toBe(0);
    expect(res.body.data.totalAssets).toBe(res.body.data.totalLiabilitiesAndEquity);
  });

  it('14. GET /api/accounting/day-book returns chronological transactions for the day', async () => {
    const res = await request(app)
      .get('/api/accounting/day-book')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entries.length).toBeGreaterThanOrEqual(5);
  });

  it('15. GET /api/accounting/receivable-ageing & /api/accounting/payable-ageing work accurately', async () => {
    const recRes = await request(app)
      .get('/api/accounting/receivable-ageing')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(recRes.status).toBe(200);
    expect(recRes.body.success).toBe(true);
    expect(recRes.body.data.totalReceivable).toBeGreaterThan(0);

    const payRes = await request(app)
      .get('/api/accounting/payable-ageing')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.totalPayable).toBeGreaterThan(0);
  });
});
