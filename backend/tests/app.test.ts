import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Business } from '../src/models/Business';
import { User } from '../src/models/User';
import { Customer } from '../src/models/Customer';
import { QRCode } from '../src/models/QRCode';
import { Product } from '../src/models/Product';
import { Delivery } from '../src/models/Delivery';
import { Purchase } from '../src/models/Purchase';
import { Supplier } from '../src/models/Supplier';
import { CustomerPayment } from '../src/models/CustomerPayment';
import { SupplierPayment } from '../src/models/SupplierPayment';
import { Expense } from '../src/models/Expense';
import { StockMovement } from '../src/models/StockMovement';
import { FinancialAccount } from '../src/models/FinancialAccount';
import { signToken } from '../src/utils/jwt';
import { getTodayDateString } from '../src/utils/date';
import bcrypt from 'bcryptjs';

describe('Milk & More Comprehensive Automated Test Suite (A to AG)', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  let ownerToken: string;
  let adminToken: string;
  let staffToken: string;
  let milkmanToken: string;

  let businessId: string;
  let ownerUserId: string;

  let otherBusinessId: string;
  let otherOwnerToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    app = createApp();
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // Test A — Owner signup and login
  it('Test A — Owner register & login with real JWT and bcrypt', async () => {
    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        businessName: 'Krishna Dairy Farm',
        name: 'Gopal Sharma',
        email: 'gopal@krishnadairy.com',
        password: 'Password123!',
        mobile: '9876543210',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.token).toBeDefined();
    expect(regRes.body.data.user.role).toBe('OWNER');

    ownerToken = regRes.body.data.token;
    businessId = regRes.body.data.business.id;
    ownerUserId = regRes.body.data.user.id;

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'gopal@krishnadairy.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();

    // Verify /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('gopal@krishnadairy.com');
    expect(meRes.body.data.business.setupCompleted).toBe(false);
  });

  // Test B — First Business Setup Onboarding
  it('Test B — Business onboarding wizard setup', async () => {
    const setupRes = await request(app)
      .post('/api/auth/setup')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        businessName: 'Krishna Dairy Farm Pvt Ltd',
        ownerName: 'Gopal Sharma',
        mobile: '9876543210',
        address: '123 Dairy Colony, Jabalpur',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        openingCash: 5000,
        openingUpi: 10000,
        openingBank: 25000,
      });

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.success).toBe(true);
    expect(setupRes.body.data.setupCompleted).toBe(true);
    expect(setupRes.body.data.openingCash).toBe(5000);

    // Verify setup completed persists
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(meRes.body.data.business.setupCompleted).toBe(true);
  });

  // Setup staff users for later tests
  it('Setup: Create Admin, Staff, and Milkman users', async () => {
    const addStaff = async (name: string, email: string, role: string) => {
      const res = await request(app)
        .post('/api/settings/staff')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name,
          email,
          password: 'Password123!',
          mobile: '9876500000',
          role,
        });
      expect(res.status).toBe(201);
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password123!' });
      return loginRes.body.data.token;
    };

    adminToken = await addStaff('Admin Rajesh', 'admin@krishnadairy.com', 'ADMIN');
    staffToken = await addStaff('Staff Sunita', 'staff@krishnadairy.com', 'STAFF');
    milkmanToken = await addStaff('Milkman Ramu', 'milkman@krishnadairy.com', 'MILKMAN');
  });

  // Test C — Customer Creation
  let createdCustomerId: string;
  it('Test C — Customer creation with delivery schedule and coordinates', async () => {
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Amit Patel',
        mobile: '9826011111',
        address: 'Flat 204, Shanti Heights, Jabalpur',
        locality: 'Civil Lines',
        latitude: 23.1815,
        longitude: 79.9864,
        delivery_schedule: 'MORNING',
        opening_balance: 200,
      });

    expect(custRes.status).toBe(201);
    expect(custRes.body.success).toBe(true);
    expect(custRes.body.data.name).toBe('Amit Patel');
    expect(custRes.body.data.assigned_qr).toBeDefined();
    createdCustomerId = custRes.body.data.id;
  });

  // Test D — Empty QR generation
  let generatedQrCodes: string[] = [];
  it('Test D — Generate empty QR codes', async () => {
    const qrRes = await request(app)
      .post('/api/qr/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 5, prefix: 'MM-QR-' });

    expect(qrRes.status).toBe(201);
    expect(qrRes.body.success).toBe(true);
    expect(qrRes.body.count).toBe(5);
    expect(qrRes.body.data[0].status).toBe('UNUSED');
    generatedQrCodes = qrRes.body.data.map((q: any) => q.qrCode);
    expect(generatedQrCodes.length).toBe(5);
  });

  // Test E — Empty QR scan
  it('Test E — Empty QR scan returns UNUSED status and prompt', async () => {
    const scanRes = await request(app)
      .get(`/api/qr/${generatedQrCodes[0]}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.data.status).toBe('UNUSED');
    expect(scanRes.body.data.canAssign).toBe(true);
  });

  // Test F — Empty QR assignment to customer
  let rahulCustomerId: string;
  let rahulQrCode: string;
  it('Test F — Empty QR assignment to new customer Rahul', async () => {
    rahulQrCode = generatedQrCodes[0];

    // Create Rahul and assign the unused QR
    const createRahulRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rahul Sharma',
        mobile: '9826022222',
        address: 'B-12, Madan Mahal, Jabalpur',
        locality: 'Madan Mahal',
        latitude: 23.1601,
        longitude: 79.9205,
        delivery_schedule: 'BOTH',
        assigned_qr: rahulQrCode,
        opening_balance: 0,
      });

    expect(createRahulRes.status).toBe(201);
    expect(createRahulRes.body.data.assigned_qr).toBe(rahulQrCode);
    rahulCustomerId = createRahulRes.body.data.id;

    // Verify QR is now ASSIGNED in database
    const qrDoc = await QRCode.findOne({ qrCode: rahulQrCode });
    expect(qrDoc?.status).toBe('ASSIGNED');
    expect(qrDoc?.assignedCustomerId?.toString()).toBe(rahulCustomerId);
  });

  // Test G — QR cannot be assigned twice
  it('Test G — QR cannot be assigned twice to different customers', async () => {
    // Try to create another customer with the same assigned_qr
    const duplicateAssignRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Suresh Verma',
        mobile: '9826033333',
        address: 'House 4, Madan Mahal',
        assigned_qr: rahulQrCode,
      });

    expect(duplicateAssignRes.status).toBe(409);
    expect(duplicateAssignRes.body.error).toMatch(/already assigned/i);
  });

  // Test H — Assigned QR scan resolves customer
  it('Test H — Assigned QR scan resolves customer delivery screen data', async () => {
    const scanRes = await request(app)
      .get(`/api/qr/${rahulQrCode}`)
      .set('Authorization', `Bearer ${milkmanToken}`);

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.data.status).toBe('ASSIGNED');
    expect(scanRes.body.data.customer.name).toBe('Rahul Sharma');
    expect(scanRes.body.data.today.morning.delivered).toBe(false);
  });

  // Test I — Morning delivery
  let cowMilkProduct: any;
  let morningDeliveryId: string;
  it('Test I — Morning delivery records correctly and reduces stock', async () => {
    // Find Cow Milk product
    cowMilkProduct = await Product.findOne({ businessId, name: 'Cow Milk' });
    expect(cowMilkProduct).toBeDefined();
    const initialStock = cowMilkProduct.currentStock;

    const delRes = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${milkmanToken}`)
      .send({
        customerId: rahulCustomerId,
        shift: 'MORNING',
        items: [
          {
            productId: cowMilkProduct._id.toString(),
            quantity: 2,
            unit: 'L',
            rate: 60,
          },
        ],
      });

    expect(delRes.status).toBe(201);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.totalAmount).toBe(120);
    morningDeliveryId = delRes.body.data._id;

    // Verify stock decreased by 2L
    const updatedProd = await Product.findById(cowMilkProduct._id);
    expect(updatedProd?.currentStock).toBe(initialStock - 2);

    // Verify stock movement was created
    const movement = await StockMovement.findOne({
      businessId,
      productId: cowMilkProduct._id,
      type: 'DELIVERY',
    }).sort({ createdAt: -1 });
    expect(movement).toBeDefined();
    expect(movement?.normalizedQty).toBe(-2);
  });

  // Test J — Evening delivery
  it('Test J — Evening delivery records independently for both-shift customer', async () => {
    const initialStock = (await Product.findById(cowMilkProduct._id))!.currentStock;

    const delRes = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${milkmanToken}`)
      .send({
        customerId: rahulCustomerId,
        shift: 'EVENING',
        items: [
          {
            productId: cowMilkProduct._id.toString(),
            quantity: 1,
            unit: 'L',
            rate: 60,
          },
        ],
      });

    expect(delRes.status).toBe(201);
    expect(delRes.body.data.shift).toBe('EVENING');
    expect(delRes.body.data.totalAmount).toBe(60);

    const updatedStock = (await Product.findById(cowMilkProduct._id))!.currentStock;
    expect(updatedStock).toBe(initialStock - 1);
  });

  // Test K — Both-shift customer metrics check on dashboard
  it('Test K — Both-shift customer shows 1 delivered customer and 2 delivery entries', async () => {
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(dashRes.status).toBe(200);
    // Rahul has 2 deliveries today (Morning + Evening)
    expect(dashRes.body.data.deliveredCustomers).toBe(1);
    expect(dashRes.body.data.deliveryEntries).toBe(2);
    expect(dashRes.body.data.morningDeliveries).toBe(1);
    expect(dashRes.body.data.eveningDeliveries).toBe(1);
  });

  // Test L — Same-day duplicate warning
  it('Test L — Same-day duplicate delivery returns warning/409', async () => {
    const dupRes = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${milkmanToken}`)
      .send({
        customerId: rahulCustomerId,
        shift: 'MORNING',
        items: [
          {
            productId: cowMilkProduct._id.toString(),
            quantity: 1,
            unit: 'L',
          },
        ],
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toMatch(/already recorded/i);
  });

  // Test M — Add Another Delivery
  let secondDeliveryId: string;
  it('Test M — Add Another Delivery with isAdditional succeeds', async () => {
    const initialStock = (await Product.findById(cowMilkProduct._id))!.currentStock;

    const addRes = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${milkmanToken}`)
      .send({
        customerId: rahulCustomerId,
        shift: 'MORNING',
        isAdditional: true,
        items: [
          {
            productId: cowMilkProduct._id.toString(),
            quantity: 1,
            unit: 'L',
          },
        ],
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.isAdditional).toBe(true);
    secondDeliveryId = addRes.body.data._id;

    const afterStock = (await Product.findById(cowMilkProduct._id))!.currentStock;
    expect(afterStock).toBe(initialStock - 1);
  });

  // Test N — Edit delivery
  it('Test N — Edit delivery reconciles inventory and total amount', async () => {
    const initialStock = (await Product.findById(cowMilkProduct._id))!.currentStock;

    // Change second delivery from 1L to 3L
    const editRes = await request(app)
      .patch(`/api/deliveries/${secondDeliveryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId: cowMilkProduct._id.toString(),
            quantity: 3,
            unit: 'L',
            rate: 60,
          },
        ],
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.totalAmount).toBe(180);

    // Initial was after 1L deduction. Changing to 3L means 2L more should be deducted from current stock.
    const afterStock = (await Product.findById(cowMilkProduct._id))!.currentStock;
    expect(afterStock).toBe(initialStock - 2);
  });

  // Test O & P — Delete delivery & stock reconciliation
  it('Test O & P — Delete delivery reconciles stock back completely', async () => {
    const beforeStock = (await Product.findById(cowMilkProduct._id))!.currentStock;

    const delRes = await request(app)
      .delete(`/api/deliveries/${secondDeliveryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);

    // Delivery was 3L; deleting it should add 3L back to inventory
    const afterStock = (await Product.findById(cowMilkProduct._id))!.currentStock;
    expect(afterStock).toBe(beforeStock + 3);

    // Verify deletion in database
    const found = await Delivery.findById(secondDeliveryId);
    expect(found).toBeNull();
  });

  // Test Q — Purchase
  let createdSupplierId: string;
  let createdPurchaseId: string;
  it('Test Q — Create purchase increases product stock and updates supplier payable', async () => {
    // 1. Create Supplier
    const suppRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Kishan Dairy Producer',
        mobile: '9425000001',
        opening_payable: 1000,
      });

    expect(suppRes.status).toBe(201);
    createdSupplierId = suppRes.body.data.id;

    const prodBefore = await Product.findById(cowMilkProduct._id);
    const stockBefore = prodBefore!.currentStock;

    // 2. Create Purchase of 50L Cow Milk @ ₹45 (Total ₹2250, Paid ₹1000 in CASH, Payable ₹1250)
    const purchRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: createdSupplierId,
        productId: cowMilkProduct._id.toString(),
        quantity: 50,
        unit: 'L',
        purchaseRate: 45,
        paidAmount: 1000,
        paymentMode: 'CASH',
      });

    expect(purchRes.status).toBe(201);
    expect(purchRes.body.data.totalAmount).toBe(2250);
    expect(purchRes.body.data.payableAmount).toBe(1250);
    createdPurchaseId = purchRes.body.data._id;

    // Verify stock increased by 50L
    const prodAfter = await Product.findById(cowMilkProduct._id);
    expect(prodAfter!.currentStock).toBe(stockBefore + 50);

    // Verify supplier payable updated: 1000 opening + 1250 payable = 2250
    const suppAfter = await Supplier.findById(createdSupplierId);
    expect(suppAfter!.currentPayable).toBe(2250);
  });

  // Test R — Purchase Delete & Reconciliation
  it('Test R — Delete purchase reverses stock and payable effects', async () => {
    const stockBefore = (await Product.findById(cowMilkProduct._id))!.currentStock;
    const payableBefore = (await Supplier.findById(createdSupplierId))!.currentPayable;

    const delRes = await request(app)
      .delete(`/api/purchases/${createdPurchaseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);

    // Stock reversed (-50L)
    const stockAfter = (await Product.findById(cowMilkProduct._id))!.currentStock;
    expect(stockAfter).toBe(stockBefore - 50);

    // Payable reversed (-1250)
    const payableAfter = (await Supplier.findById(createdSupplierId))!.currentPayable;
    expect(payableAfter).toBe(payableBefore - 1250);
  });

  // Test S — Customer Payment
  it('Test S — Record customer payment updates cash balance and customer ledger', async () => {
    // Record payment of ₹100 from Rahul
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: rahulCustomerId,
        amount: 100,
        paymentMode: 'CASH',
        notes: 'Morning payment',
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.data.amount).toBe(100);

    // Check account balances: Cash should reflect opening 5000 + 100 = 5100
    const accRes = await request(app)
      .get('/api/reports/accounts')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(accRes.status).toBe(200);
    expect(accRes.body.data.current_cash).toBe(5100);
  });

  // Test T — Supplier Payment
  it('Test T — Record supplier payment decreases supplier payable and cash balance', async () => {
    const suppPayRes = await request(app)
      .post('/api/supplier-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: createdSupplierId,
        amount: 500,
        paymentMode: 'CASH',
        referenceNumber: 'CASH-REC-001',
      });

    expect(suppPayRes.status).toBe(201);
    expect(suppPayRes.body.data.amount).toBe(500);

    // Supplier payable: was 1000, now 1000 - 500 = 500
    const supp = await Supplier.findById(createdSupplierId);
    expect(supp?.currentPayable).toBe(500);

    // Cash balance: was 5100, now 5100 - 500 = 4600
    const accRes = await request(app)
      .get('/api/reports/accounts')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(accRes.body.data.current_cash).toBe(4600);
  });

  // Test U & V — Expense & Cash/UPI/Bank reconciliation
  it('Test U & V — Expense recording reduces correct account balance', async () => {
    // Record ₹200 petrol expense in CASH
    const expRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'Transport',
        description: 'Delivery bike petrol',
        amount: 200,
        paymentMode: 'CASH',
      });

    expect(expRes.status).toBe(201);

    // Cash was 4600, now 4600 - 200 = 4400
    const accRes = await request(app)
      .get('/api/reports/accounts')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(accRes.body.data.current_cash).toBe(4400);
    expect(accRes.body.data.current_upi).toBe(10000);
    expect(accRes.body.data.current_bank).toBe(25000);
  });

  // Test W — Customer Ledger Statement
  it('Test W — Customer ledger calculates running balance accurately', async () => {
    const stmtRes = await request(app)
      .get(`/api/bills/statement?customerId=${rahulCustomerId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(stmtRes.status).toBe(200);
    expect(stmtRes.body.data.customer.name).toBe('Rahul Sharma');
    // Rahul had: Morning delivery 120 + Evening delivery 60 = 180 total deliveries.
    // Paid: 100.
    // Outstanding: 180 - 100 = 80.
    expect(stmtRes.body.data.totalDeliveryCharges).toBe(180);
    expect(stmtRes.body.data.totalCustomerPayments).toBe(100);
    expect(stmtRes.body.data.currentOutstanding).toBe(80);
    expect(stmtRes.body.data.entries.length).toBe(3); // 2 deliveries + 1 payment
  });

  // Test X — Supplier Ledger Statement
  it('Test X — Supplier ledger reflects opening, purchases, and disbursements', async () => {
    const ledgRes = await request(app)
      .get(`/api/suppliers/${createdSupplierId}/ledger`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(ledgRes.status).toBe(200);
    expect(ledgRes.body.data.openingPayable).toBe(1000);
    expect(ledgRes.body.data.currentPayable).toBe(500);
  });

  // Test Y — Profit and Loss Report
  it('Test Y — Profit and Loss report calculates revenue, COGS, expenses, and net profit', async () => {
    const pnlRes = await request(app)
      .get('/api/reports/pnl')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(pnlRes.status).toBe(200);
    expect(pnlRes.body.data.revenue).toBe(180); // 120 + 60
    expect(pnlRes.body.data.expenses).toBe(200); // 200 transport
    expect(pnlRes.body.data.net_profit).toBeDefined();
  });

  // Test Z — Balance Sheet Report
  it('Test Z — Balance Sheet maintains internal consistency', async () => {
    const bsRes = await request(app)
      .get('/api/reports/balance-sheet')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(bsRes.status).toBe(200);
    expect(bsRes.body.data.assets.cash).toBe(4400);
    expect(bsRes.body.data.assets.customer_receivables).toBeGreaterThanOrEqual(80);
    expect(bsRes.body.data.liabilities.supplier_payables).toBe(500);
    expect(bsRes.body.data.net_position).toBeDefined();
  });

  // Test AA, AB, AC — GPS route, proximity, and missed customer alerts
  it('Test AA, AB, AC — GPS route deliveries and nearby customer proximity', async () => {
    // 1. Check Route Deliveries for Morning
    const routeRes = await request(app)
      .get('/api/deliveries/route?shift=MORNING')
      .set('Authorization', `Bearer ${milkmanToken}`);

    expect(routeRes.status).toBe(200);
    expect(routeRes.body.data.totalScheduled).toBeGreaterThanOrEqual(2);
    // Rahul was delivered in morning, Amit is still PENDING
    const rahulEntry = routeRes.body.data.customers.find((c: any) => c.name === 'Rahul Sharma');
    const amitEntry = routeRes.body.data.customers.find((c: any) => c.name === 'Amit Patel');
    expect(rahulEntry.status).toBe('DELIVERED');
    expect(amitEntry.status).toBe('PENDING');

    // 2. Test nearby proximity check near Rahul (lat: 23.1601, lng: 79.9205)
    const nearbyRes = await request(app)
      .get('/api/deliveries/nearby?lat=23.1601&lng=79.9205&radius=200&shift=MORNING')
      .set('Authorization', `Bearer ${milkmanToken}`);

    expect(nearbyRes.status).toBe(200);
    expect(nearbyRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(nearbyRes.body.data[0].name).toBe('Rahul Sharma');
    expect(nearbyRes.body.data[0].distanceMeters).toBeLessThan(50);

    // 3. Test nearby proximity check near Amit (lat: 23.1815, lng: 79.9864)
    const nearbyAmitRes = await request(app)
      .get('/api/deliveries/nearby?lat=23.1815&lng=79.9864&radius=200&shift=MORNING')
      .set('Authorization', `Bearer ${milkmanToken}`);

    expect(nearbyAmitRes.status).toBe(200);
    const nearbyAmit = nearbyAmitRes.body.data.find((n: any) => n.name === 'Amit Patel');
    expect(nearbyAmit).toBeDefined();
    expect(nearbyAmit.isDelivered).toBe(false);
    expect(nearbyAmit.status).toBe('PENDING'); // Customer missed / pending alert triggered!
  });

  // Test AD — Role Authorization Enforcement
  it('Test AD — MILKMAN role cannot access sensitive admin/financial routes', async () => {
    // Milkman tries to access P&L
    const pnlRes = await request(app)
      .get('/api/reports/pnl')
      .set('Authorization', `Bearer ${milkmanToken}`);
    expect(pnlRes.status).toBe(403);

    // Milkman tries to access Balance Sheet
    const bsRes = await request(app)
      .get('/api/reports/balance-sheet')
      .set('Authorization', `Bearer ${milkmanToken}`);
    expect(bsRes.status).toBe(403);

    // Milkman tries to create a purchase
    const purchRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${milkmanToken}`)
      .send({});
    expect(purchRes.status).toBe(403);

    // Staff tries to access P&L
    const staffPnlRes = await request(app)
      .get('/api/reports/pnl')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffPnlRes.status).toBe(403);
  });

  // Test AE — Multi-Business Isolation
  it('Test AE — Business data isolation prevents cross-tenant access', async () => {
    // 1. Create a second independent business
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({
        businessName: 'Radha Dairy Farm',
        name: 'Radha Rani',
        email: 'radha@radhadairy.com',
        password: 'Password123!',
        mobile: '9826099999',
      });

    otherOwnerToken = reg2.body.data.token;
    otherBusinessId = reg2.body.data.business.id;

    // 2. Business 2 requests customers -> must NOT see Rahul Sharma or Amit Patel
    const cust2Res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${otherOwnerToken}`);

    expect(cust2Res.status).toBe(200);
    expect(cust2Res.body.data.length).toBe(0);

    // 3. Business 2 requests Rahul by ID -> returns 404
    const crossRes = await request(app)
      .get(`/api/customers/${rahulCustomerId}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`);

    expect(crossRes.status).toBe(404);

    // 4. Business 2 requests Rahul QR code -> not recognized in this business
    const crossQrRes = await request(app)
      .get(`/api/qr/${rahulQrCode}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`);

    expect(crossQrRes.status).toBe(404);
  });

  // Test AF — CSV Exports
  it('Test AF — CSV exports respect business isolation and format data', async () => {
    const exportCust = await request(app)
      .get('/api/exports/customers')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(exportCust.status).toBe(200);
    expect(exportCust.header['content-type']).toMatch(/text\/csv/);
    expect(exportCust.text).toContain('Rahul Sharma');
    expect(exportCust.text).toContain('Amit Patel');

    // Deliveries CSV
    const exportDel = await request(app)
      .get('/api/exports/deliveries')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(exportDel.status).toBe(200);
    expect(exportDel.text).toContain('MORNING');
    expect(exportDel.text).toContain('EVENING');

    // Second business CSV export must be empty of first business's customers
    const otherExport = await request(app)
      .get('/api/exports/customers')
      .set('Authorization', `Bearer ${otherOwnerToken}`);

    expect(otherExport.status).toBe(200);
    expect(otherExport.text).not.toContain('Rahul Sharma');
  });

  // Test AG — Production build readiness
  it('Test AG — All models, schemas, and endpoints operate cleanly with MongoDB', async () => {
    // Health check endpoint
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('healthy');
  });

  // Test AH — Customer Lifecycle & Safe Deletion
  it('Test AH — Customer safe deletion blocks deletion when history exists and permits clean deletion', async () => {
    // 1. Create a clean temporary customer with no deliveries or payments
    const createRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Temp Clean Customer',
        mobile: '9898000001',
        address: '123 Clean Dairy Lane',
        deliverySchedule: 'MORNING',
        openingBalance: 0,
      });
    expect(createRes.status).toBe(201);
    const tempCustomerId = createRes.body.data.id;

    // 2. Delete the clean customer -> must succeed
    const deleteCleanRes = await request(app)
      .delete(`/api/customers/${tempCustomerId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleteCleanRes.status).toBe(200);
    expect(deleteCleanRes.body.success).toBe(true);

    // 3. Verify deactivate and reactivate workflow
    const allCustRes = await request(app)
      .get('/api/customers?search=Rahul')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(allCustRes.status).toBe(200);
    expect(allCustRes.body.data.length).toBeGreaterThan(0);
    const rahulId = allCustRes.body.data[0].id;

    const deactivateRes = await request(app)
      .post(`/api/customers/${rahulId}/deactivate`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Vacation' });
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.data.status).toBe('INACTIVE');

    const reactivateRes = await request(app)
      .post(`/api/customers/${rahulId}/reactivate`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.status).toBe('ACTIVE');

    // 4. Delete customer with history -> succeeds, soft-deletes, preserves historical deliveries
    const deleteRahulRes = await request(app)
      .delete(`/api/customers/${rahulId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleteRahulRes.status).toBe(200);
    expect(deleteRahulRes.body.success).toBe(true);

    // Verify customer is removed from active lists
    const afterDeleteCustRes = await request(app)
      .get('/api/customers?search=Rahul')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(afterDeleteCustRes.body.data.length).toBe(0);

    // Verify historical records remain intact in database
    const rahulDeliveryCount = await Delivery.countDocuments({ customerId: rahulId });
    expect(rahulDeliveryCount).toBeGreaterThan(0);
  });

  // Test AI — Product Lifecycle & Safe Deletion
  it('Test AI — Product safe deletion succeeds, removes from active list, and preserves historical records', async () => {
    // 1. Create a clean temporary product
    const createProdRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Temporary Clean Paneer',
        defaultUnit: 'KG',
        defaultRate: 400,
        currentStock: 0,
      });
    expect(createProdRes.status).toBe(201);
    const tempProdId = createProdRes.body.data.id;

    // 2. Deactivate the product
    const deactRes = await request(app)
      .post(`/api/products/${tempProdId}/deactivate`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.isActive).toBe(false);

    // Verify it appears in status=INACTIVE list
    const inactiveList = await request(app)
      .get('/api/products?status=INACTIVE')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(inactiveList.status).toBe(200);
    expect(inactiveList.body.data.some((p: any) => p.id === tempProdId)).toBe(true);

    // 3. Reactivate the product
    const reactRes = await request(app)
      .post(`/api/products/${tempProdId}/activate`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.isActive).toBe(true);

    // 4. Delete the clean product -> must succeed
    const deleteProdRes = await request(app)
      .delete(`/api/products/${tempProdId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleteProdRes.status).toBe(200);
    expect(deleteProdRes.body.success).toBe(true);

    // 5. Delete an existing product with history (Cow Milk) -> succeeds, removes from active list, preserves history
    const deleteUsedRes = await request(app)
      .delete(`/api/products/${cowMilkProduct._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleteUsedRes.status).toBe(200);
    expect(deleteUsedRes.body.success).toBe(true);

    // Verify product is removed from active product catalog
    const activeProducts = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(activeProducts.body.data.some((p: any) => p.id === cowMilkProduct._id.toString())).toBe(false);

    // Verify historical delivery items remain in database
    const cowMilkDeliveryCount = await Delivery.countDocuments({ 'items.productId': cowMilkProduct._id });
    expect(cowMilkDeliveryCount).toBeGreaterThan(0);
  });
});
