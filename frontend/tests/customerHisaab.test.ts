import { describe, it, expect } from 'vitest';

describe('iRujul Dairy Customer Hisaab & Ledger Calculations', () => {
  describe('Hisaab Math: Opening Balance + Deliveries - Payments = Current Outstanding', () => {
    it('calculates correct outstanding when unpaid previous balance exists', () => {
      const openingBalance = 6500;
      const totalDeliveries = 6500;
      const totalPayments = 0;

      const currentOutstanding = openingBalance + totalDeliveries - totalPayments;
      expect(currentOutstanding).toBe(13000);
      expect(currentOutstanding > 0).toBe(true);
    });

    it('calculates correct outstanding with partial payment', () => {
      const openingBalance = 6500;
      const totalDeliveries = 6500;
      const totalPayments = 5000;

      const currentOutstanding = openingBalance + totalDeliveries - totalPayments;
      expect(currentOutstanding).toBe(8000);
    });

    it('calculates correct outstanding when fully paid', () => {
      const openingBalance = 6500;
      const totalDeliveries = 6500;
      const totalPayments = 13000;

      const currentOutstanding = openingBalance + totalDeliveries - totalPayments;
      expect(currentOutstanding).toBe(0);
      expect(currentOutstanding <= 0).toBe(true);
    });

    it('calculates advance balance when customer overpays', () => {
      const openingBalance = 0;
      const totalDeliveries = 2500;
      const totalPayments = 3000;

      const currentOutstanding = openingBalance + totalDeliveries - totalPayments;
      expect(currentOutstanding).toBe(-500);
      // In dairy hisaab, negative outstanding represents advance credit
      expect(Math.abs(currentOutstanding)).toBe(500);
    });
  });

  describe('Ledger Running Balance Computation', () => {
    interface LedgerRow {
      date: string;
      type: 'DELIVERY' | 'PAYMENT';
      amount: number;
    }

    it('computes chronological running balance correctly', () => {
      const openingBalance = 500;
      const entries: LedgerRow[] = [
        { date: '2026-09-01', type: 'DELIVERY', amount: 120 },
        { date: '2026-09-02', type: 'DELIVERY', amount: 120 },
        { date: '2026-09-03', type: 'PAYMENT', amount: 500 },
        { date: '2026-09-04', type: 'DELIVERY', amount: 120 },
      ];

      let running = openingBalance;
      const balances: number[] = [];

      for (const entry of entries) {
        if (entry.type === 'DELIVERY') {
          running += entry.amount;
        } else if (entry.type === 'PAYMENT') {
          running -= entry.amount;
        }
        balances.push(running);
      }

      // Step 1: 500 + 120 = 620
      // Step 2: 620 + 120 = 740
      // Step 3: 740 - 500 = 240
      // Step 4: 240 + 120 = 360
      expect(balances).toEqual([620, 740, 240, 360]);
      expect(running).toBe(360);
    });
  });

  describe('A-Z Alphabet Filtering Logic', () => {
    const customerList = [
      { id: '1', name: 'Amit Kumar' },
      { id: '2', name: 'Anil Sharma' },
      { id: '3', name: 'Bharat Patel' },
      { id: '4', name: 'Chetan Rao' },
      { id: '5', name: 'Deepak Verma' },
      { id: '6', name: 'dilkhush dairy' },
      { id: '7', name: 'Rahul Yadav' },
    ];

    it('filters customers starting with specific letter regardless of case', () => {
      const filterByLetter = (list: typeof customerList, letter: string) => {
        if (letter === 'ALL') return list;
        return list.filter((c) => c.name.trim().toUpperCase().startsWith(letter.toUpperCase()));
      };

      const resultA = filterByLetter(customerList, 'A');
      expect(resultA.length).toBe(2);
      expect(resultA.map((c) => c.name)).toEqual(['Amit Kumar', 'Anil Sharma']);

      const resultD = filterByLetter(customerList, 'D');
      expect(resultD.length).toBe(2);
      expect(resultD.map((c) => c.name)).toEqual(['Deepak Verma', 'dilkhush dairy']);

      const resultR = filterByLetter(customerList, 'R');
      expect(resultR.length).toBe(1);
      expect(resultR[0].name).toBe('Rahul Yadav');

      const resultZ = filterByLetter(customerList, 'Z');
      expect(resultZ.length).toBe(0);

      const resultAll = filterByLetter(customerList, 'ALL');
      expect(resultAll.length).toBe(7);
    });
  });

  describe('Outstanding Status Badge & Highlight Styling', () => {
    it('returns rose due highlight classes when outstanding is positive', () => {
      const outstanding = 13000;
      const isDue = outstanding > 0;
      const badgeClasses = isDue
        ? 'bg-rose-50 border-rose-300 text-rose-800'
        : 'bg-emerald-50 border-emerald-300 text-emerald-800';

      expect(badgeClasses).toContain('bg-rose-50');
      expect(badgeClasses).toContain('text-rose-800');
    });

    it('returns emerald cleared highlight classes when outstanding is zero or negative', () => {
      const outstanding = 0;
      const isDue = outstanding > 0;
      const badgeClasses = isDue
        ? 'bg-rose-50 border-rose-300 text-rose-800'
        : 'bg-emerald-50 border-emerald-300 text-emerald-800';

      expect(badgeClasses).toContain('bg-emerald-50');
      expect(badgeClasses).toContain('text-emerald-800');
    });
  });

  describe('Section 8 & 11: 7-Metric Account Summary & Payment Register Collections', () => {
    it('verifies 7-metric summary card values correctly', () => {
      const openingBalance = 1500;
      const todayDrops = [{ amount: 120 }, { amount: 140 }];
      const periodDeliveries = [{ amount: 120 }, { amount: 140 }, { amount: 1500 }];
      const periodPayments = [{ amount: 1000 }, { amount: 500 }];
      const previousBalance = 1500;

      const todayCharges = todayDrops.reduce((s, d) => s + d.amount, 0);
      const totalDeliveriesCount = periodDeliveries.length;
      const totalCharges = periodDeliveries.reduce((s, d) => s + d.amount, 0);
      const totalPayments = periodPayments.reduce((s, p) => s + p.amount, 0);
      const currentOutstanding = openingBalance + totalCharges - totalPayments;

      expect(openingBalance).toBe(1500);
      expect(todayCharges).toBe(260);
      expect(totalDeliveriesCount).toBe(3);
      expect(totalCharges).toBe(1760);
      expect(totalPayments).toBe(1500);
      expect(previousBalance).toBe(1500);
      expect(currentOutstanding).toBe(1760);
    });

    it('aggregates Payment Register collections by payment mode', () => {
      const payments = [
        { amount: 500, payment_mode: 'CASH' },
        { amount: 1200, payment_mode: 'UPI' },
        { amount: 800, payment_mode: 'UPI' },
        { amount: 3000, payment_mode: 'BANK_TRANSFER' },
        { amount: 200, payment_mode: 'CASH' },
      ];

      const totalCollections = payments.reduce((s, p) => s + p.amount, 0);
      const cashCollections = payments.filter((p) => p.payment_mode === 'CASH').reduce((s, p) => s + p.amount, 0);
      const upiCollections = payments.filter((p) => p.payment_mode === 'UPI').reduce((s, p) => s + p.amount, 0);
      const bankCollections = payments.filter((p) => p.payment_mode === 'BANK_TRANSFER').reduce((s, p) => s + p.amount, 0);

      expect(totalCollections).toBe(5700);
      expect(cashCollections).toBe(700);
      expect(upiCollections).toBe(2000);
      expect(bankCollections).toBe(3000);
    });
  });
});
