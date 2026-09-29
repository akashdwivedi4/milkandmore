/**
 * Utility functions for billing and invoice calculations.
 */

export interface InvoiceCalculationInput {
  subTotal: number;
  previousBalance?: number | null;
  previousCredit?: number | null;
  received?: number | null;
}

export interface InvoiceCalculationResult {
  subTotal: number;
  previousBalance: number;
  previousCredit: number;
  totalPayable: number;
  received: number;
  creditApplied: number;
  balanceOutstanding: number;
  customerCredit: number;
  amountInWordsTarget: number;
  paymentStatus: 'Due' | 'Partially Paid' | 'Paid';
  isDue: boolean;
}

/**
 * Calculates customer invoice financial totals:
 * Sub Total + Previous Balance = Total Payable
 * Total Payable - Received - Credit Applied = Balance / Outstanding (Minimum 0, Never negative)
 * Excess payments / advance credits = Customer Credit Available
 */
export function calculateInvoiceTotals(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const subTotal = Number(input.subTotal) || 0;
  const rawPrev = Number(input.previousBalance) || 0;
  const previousBalance = rawPrev > 0 ? rawPrev : 0;
  const previousCredit = Number(input.previousCredit) || (rawPrev < 0 ? Math.abs(rawPrev) : 0);
  const received = Number(input.received) || 0;

  const totalPayable = subTotal + previousBalance;
  const creditApplied = Math.min(previousCredit, Math.max(0, totalPayable - received));
  const effectivePaid = received + creditApplied;

  const balanceOutstanding = Math.max(0, totalPayable - effectivePaid);
  const customerCredit = Math.max(0, (previousCredit + received) - totalPayable);
  const amountInWordsTarget = totalPayable;

  let paymentStatus: 'Due' | 'Partially Paid' | 'Paid';
  if (effectivePaid === 0 && balanceOutstanding > 0) {
    paymentStatus = 'Due';
  } else if (balanceOutstanding === 0) {
    paymentStatus = 'Paid';
  } else {
    paymentStatus = 'Partially Paid';
  }

  return {
    subTotal,
    previousBalance,
    previousCredit,
    totalPayable,
    received,
    creditApplied,
    balanceOutstanding,
    customerCredit,
    amountInWordsTarget,
    paymentStatus,
    isDue: balanceOutstanding > 0,
  };
}
