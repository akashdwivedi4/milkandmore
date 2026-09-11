/**
 * Utility functions for billing and invoice calculations.
 */

export interface InvoiceCalculationInput {
  subTotal: number;
  previousBalance?: number | null;
  received?: number | null;
}

export interface InvoiceCalculationResult {
  subTotal: number;
  previousBalance: number;
  totalPayable: number;
  received: number;
  balanceOutstanding: number;
  amountInWordsTarget: number;
  paymentStatus: 'Due' | 'Partially Paid' | 'Paid';
  isDue: boolean;
}

/**
 * Calculates customer invoice financial totals:
 * Sub Total + Previous Balance = Total Payable
 * Total Payable - Received = Balance / Outstanding
 *
 * Example 1:
 * Sub Total: 6500, Previous: 6500, Received: 0
 * -> Total Payable: 13000, Balance: 13000, Status: 'Due'
 *
 * Example 2:
 * Sub Total: 6500, Previous: 6500, Received: 5000
 * -> Total Payable: 13000, Balance: 8000, Status: 'Partially Paid'
 *
 * Example 3:
 * Sub Total: 6500, Previous: 6500, Received: 13000
 * -> Total Payable: 13000, Balance: 0, Status: 'Paid'
 */
export function calculateInvoiceTotals(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const subTotal = Number(input.subTotal) || 0;
  const previousBalance = Number(input.previousBalance) || 0;
  const totalPayable = subTotal + (previousBalance > 0 ? previousBalance : 0);
  const received = Number(input.received) || 0;
  const balanceOutstanding = Math.max(0, totalPayable - received);
  const amountInWordsTarget = totalPayable;

  let paymentStatus: 'Due' | 'Partially Paid' | 'Paid';
  if (received === 0 && balanceOutstanding > 0) {
    paymentStatus = 'Due';
  } else if (balanceOutstanding === 0) {
    paymentStatus = 'Paid';
  } else {
    paymentStatus = 'Partially Paid';
  }

  return {
    subTotal,
    previousBalance,
    totalPayable,
    received,
    balanceOutstanding,
    amountInWordsTarget,
    paymentStatus,
    isDue: balanceOutstanding > 0,
  };
}
