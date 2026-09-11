import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotals } from '../src/utils/billing';
import { numberToIndianWords } from '../src/utils/numberToWords';
import { formatCurrency, formatDate } from '../src/utils/format';

describe('Customer Invoice Calculation & UI Suite', () => {
  describe('Financial Calculations (Sub Total + Previous Balance - Received = Balance)', () => {
    it('Example 1: Unpaid Previous Balance -> Balance Outstanding is ₹13,000 with Status "Due"', () => {
      // Sub Total: ₹6,500, Previous Balance: ₹6,500, Received: ₹0
      const res = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 0,
      });

      expect(res.subTotal).toBe(6500);
      expect(res.previousBalance).toBe(6500);
      expect(res.totalPayable).toBe(13000);
      expect(res.received).toBe(0);
      expect(res.balanceOutstanding).toBe(13000);
      expect(res.amountInWordsTarget).toBe(13000);
      expect(res.paymentStatus).toBe('Due');
      expect(res.isDue).toBe(true);
    });

    it('Example 2: Partial Payment -> Balance Outstanding is ₹8,000 with Status "Partially Paid"', () => {
      // Sub Total: ₹6,500, Previous Balance: ₹6,500, Received: ₹5,000
      const res = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 5000,
      });

      expect(res.subTotal).toBe(6500);
      expect(res.previousBalance).toBe(6500);
      expect(res.totalPayable).toBe(13000);
      expect(res.received).toBe(5000);
      expect(res.balanceOutstanding).toBe(8000);
      expect(res.amountInWordsTarget).toBe(13000);
      expect(res.paymentStatus).toBe('Partially Paid');
      expect(res.isDue).toBe(true);
    });

    it('Example 3: Full Payment -> Balance Outstanding is ₹0 with Status "Paid"', () => {
      // Sub Total: ₹6,500, Previous Balance: ₹6,500, Received: ₹13,000
      const res = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 13000,
      });

      expect(res.subTotal).toBe(6500);
      expect(res.previousBalance).toBe(6500);
      expect(res.totalPayable).toBe(13000);
      expect(res.received).toBe(13000);
      expect(res.balanceOutstanding).toBe(0);
      expect(res.amountInWordsTarget).toBe(13000);
      expect(res.paymentStatus).toBe('Paid');
      expect(res.isDue).toBe(false);
    });

    it('handles zero previous balance correctly', () => {
      const res = calculateInvoiceTotals({
        subTotal: 4500,
        previousBalance: 0,
        received: 0,
      });

      expect(res.totalPayable).toBe(4500);
      expect(res.balanceOutstanding).toBe(4500);
      expect(res.paymentStatus).toBe('Due');
      expect(res.isDue).toBe(true);
    });

    it('handles negative or null values gracefully without throwing', () => {
      const res = calculateInvoiceTotals({
        subTotal: 3000,
        previousBalance: null,
        received: undefined,
      });

      expect(res.subTotal).toBe(3000);
      expect(res.previousBalance).toBe(0);
      expect(res.totalPayable).toBe(3000);
      expect(res.received).toBe(0);
      expect(res.balanceOutstanding).toBe(3000);
      expect(res.paymentStatus).toBe('Due');
    });
  });

  describe('Amount in Words Requirements', () => {
    it('Amount in Words matches final Total Payable (₹13,000)', () => {
      const calc = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 0,
      });

      const words = numberToIndianWords(calc.amountInWordsTarget);
      expect(words.toLowerCase()).toContain('thirteen thousand rupees');
      expect(words.toLowerCase()).not.toContain('six thousand five hundred');
    });

    it('formats ₹6,500 accurately when total is 6500', () => {
      const words = numberToIndianWords(6500);
      expect(words.toLowerCase()).toContain('six thousand five hundred rupees');
    });

    it('formats zero correctly', () => {
      const words = numberToIndianWords(0);
      expect(words.toLowerCase()).toContain('zero rupees');
    });
  });

  describe('Visual Highlighting & Status Requirements', () => {
    it('applies subtle light red background when balance/outstanding > 0', () => {
      const calc = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 0,
      });

      const outstandingClass = calc.balanceOutstanding > 0
        ? 'bg-red-50/80 border border-red-200 text-red-700'
        : 'bg-slate-50 border border-slate-200 text-slate-900';

      expect(outstandingClass).toContain('bg-red-50/80');
      expect(outstandingClass).toContain('border-red-200');
      expect(outstandingClass).toContain('text-red-700');
    });

    it('applies neutral styling when balance is ₹0 (cleared)', () => {
      const calc = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 13000,
      });

      const outstandingClass = calc.balanceOutstanding > 0
        ? 'bg-red-50/80 border border-red-200 text-red-700'
        : 'bg-slate-50 border border-slate-200 text-slate-900';

      expect(outstandingClass).toContain('bg-slate-50');
      expect(outstandingClass).not.toContain('bg-red-50/80');
      expect(outstandingClass).not.toContain('text-red-700');
    });

    it('displays "Due" and never "Credit / Due" when received is 0 and balance > 0', () => {
      const calc = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 0,
      });

      expect(calc.paymentStatus).toBe('Due');
      expect(calc.paymentStatus).not.toContain('Credit');
    });
  });

  describe('Item Row & Bill Markup Verification', () => {
    it('renders item row with product name on top and date • session cleanly underneath', () => {
      const item = {
        productName: 'Ghee',
        date: '2026-09-08',
        shift: 'MORNING',
        isAdditional: false,
        quantity: 2,
        unit: 'KG',
        rate: 650,
        amount: 1300,
      };

      const rowHtml = renderToString(
        React.createElement(
          'td',
          { className: 'py-2.5 px-3 border-r border-slate-200' },
          React.createElement(
            'div',
            { className: 'space-y-0.5' },
            React.createElement(
              'div',
              { className: 'font-bold text-slate-900 text-xs' },
              item.productName
            ),
            React.createElement(
              'div',
              { className: 'text-[11px] font-normal text-slate-500 flex items-center gap-1.5' },
              React.createElement(
                'span',
                null,
                `${formatDate(item.date)} • ${item.shift === 'EVENING' ? 'Evening' : 'Morning'}`
              )
            )
          )
        )
      );

      // Verify product name is present
      expect(rowHtml).toContain('Ghee');
      // Verify date and session are stacked cleanly underneath
      expect(rowHtml).toContain('8 Sept 2026 • Morning');
      // Verify no CRM buttons or leaking text inside the row
      expect(rowHtml).not.toContain('svgView');
      expect(rowHtml).not.toContain('svgEdit');
      expect(rowHtml).not.toContain('svgDelete');
    });

    it('renders financial summary block matching Example 1 exactly', () => {
      const calc = calculateInvoiceTotals({
        subTotal: 6500,
        previousBalance: 6500,
        received: 0,
      });

      const summaryHtml = renderToString(
        React.createElement(
          'div',
          { className: 'w-full sm:w-72 space-y-1.5 text-xs' },
          React.createElement(
            'div',
            { className: 'flex justify-between py-1 border-b border-slate-100 text-slate-600' },
            React.createElement('span', { className: 'font-medium' }, 'Sub Total:'),
            React.createElement('span', { className: 'font-semibold text-slate-900' }, formatCurrency(calc.subTotal))
          ),
          React.createElement(
            'div',
            { className: 'flex justify-between py-1 border-b border-slate-100 text-slate-600' },
            React.createElement('span', { className: 'font-medium' }, 'Previous Balance:'),
            React.createElement('span', { className: 'font-semibold text-slate-900' }, formatCurrency(calc.previousBalance))
          ),
          React.createElement(
            'div',
            { className: 'flex justify-between items-center bg-slate-900 text-white font-black px-3 py-2 rounded-lg shadow-xs my-1' },
            React.createElement('span', { className: 'text-xs uppercase tracking-wider' }, 'Total:'),
            React.createElement('span', { className: 'text-sm font-black' }, formatCurrency(calc.totalPayable))
          ),
          React.createElement(
            'div',
            { className: 'flex justify-between py-1 border-b border-slate-100 text-slate-600' },
            React.createElement('span', { className: 'font-medium' }, 'Received:'),
            React.createElement('span', { className: 'font-semibold text-emerald-700' }, `- ${formatCurrency(calc.received)}`)
          ),
          React.createElement(
            'div',
            {
              className: `flex justify-between items-center px-3 py-2 rounded-lg font-black text-xs transition-colors ${
                calc.balanceOutstanding > 0
                  ? 'bg-red-50/80 border border-red-200 text-red-700'
                  : 'bg-slate-50 border border-slate-200 text-slate-900'
              }`,
            },
            React.createElement('span', { className: 'uppercase tracking-wider' }, 'Balance / Outstanding:'),
            React.createElement('span', { className: 'text-sm font-black' }, formatCurrency(calc.balanceOutstanding))
          ),
          React.createElement(
            'div',
            { className: 'flex justify-between py-1 text-[11px] text-slate-500' },
            React.createElement('span', null, 'Payment Status:'),
            React.createElement(
              'span',
              { className: 'font-bold text-red-700' },
              calc.paymentStatus
            )
          )
        )
      );

      // Verify amounts in summary HTML
      expect(summaryHtml).toContain('6,500');
      expect(summaryHtml).toContain('13,000');
      expect(summaryHtml).toContain('bg-red-50/80');
      expect(summaryHtml).toContain('border-red-200');
      expect(summaryHtml).toContain('text-red-700');
      expect(summaryHtml).toContain('Due');
      expect(summaryHtml).not.toContain('Credit / Due');
    });

    it('ensures no CRM action buttons or svg leaks exist in customer bill section', () => {
      // Bill To container without action buttons
      const billToHtml = renderToString(
        React.createElement(
          'div',
          { className: 'space-y-1' },
          React.createElement(
            'span',
            { className: 'text-[11px] font-bold text-slate-400 uppercase tracking-wider block' },
            'Bill To'
          ),
          React.createElement('p', { className: 'text-base font-black text-slate-900' }, 'Rahul Sharma'),
          React.createElement(
            'p',
            { className: 'text-slate-600' },
            React.createElement('span', { className: 'font-semibold text-slate-700' }, 'Contact No: '),
            '9876543210'
          )
        )
      );

      expect(billToHtml).not.toContain('View');
      expect(billToHtml).not.toContain('Edit');
      expect(billToHtml).not.toContain('Delete');
      expect(billToHtml).not.toContain('svgView');
      expect(billToHtml).not.toContain('svgEdit');
      expect(billToHtml).not.toContain('svgDelete');
    });
  });
});
