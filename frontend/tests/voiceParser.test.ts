import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { parseVoiceCommand, normalizeVoiceInput, extractDeliveryItems } from '../src/utils/voiceParser';
import { QUICK_COMMANDS } from '../src/components/VoiceAssistant';

describe('Voice Command Parser Suite', () => {
  describe('Normalization and Transliteration', () => {
    it('normalizes Devanagari Hindi text to clean lowercase tokens', () => {
      expect(normalizeVoiceInput('आज की डिलीवरी दिखाओ')).toContain('delivery');
      expect(normalizeVoiceInput('बिल खोलो')).toContain('bill');
      expect(normalizeVoiceInput('ब्लैंक QR खोलो')).toContain('blank qr');
    });

    it('corrects speech recognition phonetic errors', () => {
      // Speech recognition variation: "ब्लैक के" -> "blank qr"
      expect(normalizeVoiceInput('ब्लैक के')).toContain('blank qr');
      expect(normalizeVoiceInput('black k')).toContain('blank qr');
      expect(normalizeVoiceInput('क्यू आर स्कैनर')).toContain('qr scanner');
    });
  });

  describe('English Navigation Commands', () => {
    it("handles Today's Deliveries", () => {
      const res = parseVoiceCommand("Today's deliveries");
      expect(res.intent).toBe('NAVIGATE_TODAYS_DELIVERY');
      expect(res.navigationPath).toBe('/today');
    });

    it('handles Bills & Invoices', () => {
      const res = parseVoiceCommand('Bills and invoices');
      expect(res.intent).toBe('NAVIGATE_BILLS');
      expect(res.navigationPath).toBe('/bills');
    });

    it('handles Blank QR', () => {
      const res = parseVoiceCommand('Blank QR tags');
      expect(res.intent).toBe('NAVIGATE_BLANK_QR');
      expect(res.navigationPath).toBe('/blank-qr');
    });

    it('handles QR Scanner', () => {
      const res = parseVoiceCommand('QR scanner');
      expect(res.intent).toBe('NAVIGATE_QR_SCANNER');
      expect(res.navigationPath).toBe('/scan');
    });

    it('handles Customers', () => {
      const res = parseVoiceCommand('Open customers');
      expect(res.intent).toBe('NAVIGATE_CUSTOMERS');
      expect(res.navigationPath).toBe('/customers');
    });

    it('handles Products & Rates', () => {
      const res = parseVoiceCommand('Products and rates');
      expect(res.intent).toBe('NAVIGATE_PRODUCTS');
      expect(res.navigationPath).toBe('/products');
    });

    it('handles Customer Payments', () => {
      const res = parseVoiceCommand('Customer payments');
      expect(res.intent).toBe('NAVIGATE_PAYMENTS');
      expect(res.navigationPath).toBe('/payments');
    });
  });

  describe('Hindi / Devanagari Commands', () => {
    it('handles "आज की डिलीवरी दिखाओ"', () => {
      const res = parseVoiceCommand('आज की डिलीवरी दिखाओ');
      expect(res.intent).toBe('NAVIGATE_TODAYS_DELIVERY');
      expect(res.navigationPath).toBe('/today');
    });

    it('handles "आज की डिलीवरी"', () => {
      const res = parseVoiceCommand('आज की डिलीवरी');
      expect(res.intent).toBe('NAVIGATE_TODAYS_DELIVERY');
      expect(res.navigationPath).toBe('/today');
    });

    it('handles "बिल खोलो"', () => {
      const res = parseVoiceCommand('बिल खोलो');
      expect(res.intent).toBe('NAVIGATE_BILLS');
      expect(res.navigationPath).toBe('/bills');
    });

    it('handles "इनवॉइस खोलो"', () => {
      const res = parseVoiceCommand('इनवॉइस खोलो');
      expect(res.intent).toBe('NAVIGATE_BILLS');
      expect(res.navigationPath).toBe('/bills');
    });

    it('handles "ब्लैंक QR खोलो"', () => {
      const res = parseVoiceCommand('ब्लैंक QR खोलो');
      expect(res.intent).toBe('NAVIGATE_BLANK_QR');
      expect(res.navigationPath).toBe('/blank-qr');
    });

    it('handles "ब्लैंक क्यूआर"', () => {
      const res = parseVoiceCommand('ब्लैंक क्यूआर');
      expect(res.intent).toBe('NAVIGATE_BLANK_QR');
      expect(res.navigationPath).toBe('/blank-qr');
    });

    it('handles "क्यूआर स्कैनर खोलो"', () => {
      const res = parseVoiceCommand('क्यूआर स्कैनर खोलो');
      expect(res.intent).toBe('NAVIGATE_QR_SCANNER');
      expect(res.navigationPath).toBe('/scan');
    });

    it('handles "कस्टमर खोलो"', () => {
      const res = parseVoiceCommand('कस्टमर खोलो');
      expect(res.intent).toBe('NAVIGATE_CUSTOMERS');
      expect(res.navigationPath).toBe('/customers');
    });

    it('handles "प्रोडक्ट खोलो"', () => {
      const res = parseVoiceCommand('प्रोडक्ट खोलो');
      expect(res.intent).toBe('NAVIGATE_PRODUCTS');
      expect(res.navigationPath).toBe('/products');
    });

    it('handles "पेमेंट खोलो"', () => {
      const res = parseVoiceCommand('पेमेंट खोलो');
      expect(res.intent).toBe('NAVIGATE_PAYMENTS');
      expect(res.navigationPath).toBe('/payments');
    });
  });

  describe('Hinglish Commands', () => {
    it('handles "Aaj ki delivery"', () => {
      const res = parseVoiceCommand('Aaj ki delivery');
      expect(res.intent).toBe('NAVIGATE_TODAYS_DELIVERY');
      expect(res.navigationPath).toBe('/today');
    });

    it('handles "Aaj ki delivery dikhao"', () => {
      const res = parseVoiceCommand('Aaj ki delivery dikhao');
      expect(res.intent).toBe('NAVIGATE_TODAYS_DELIVERY');
      expect(res.navigationPath).toBe('/today');
    });

    it('handles "Bills kholo"', () => {
      const res = parseVoiceCommand('Bills kholo');
      expect(res.intent).toBe('NAVIGATE_BILLS');
      expect(res.navigationPath).toBe('/bills');
    });

    it('handles "Blank QR kholo"', () => {
      const res = parseVoiceCommand('Blank QR kholo');
      expect(res.intent).toBe('NAVIGATE_BLANK_QR');
      expect(res.navigationPath).toBe('/blank-qr');
    });

    it('handles "QR scanner kholo"', () => {
      const res = parseVoiceCommand('QR scanner kholo');
      expect(res.intent).toBe('NAVIGATE_QR_SCANNER');
      expect(res.navigationPath).toBe('/scan');
    });

    it('handles "Customers kholo"', () => {
      const res = parseVoiceCommand('Customers kholo');
      expect(res.intent).toBe('NAVIGATE_CUSTOMERS');
      expect(res.navigationPath).toBe('/customers');
    });

    it('handles "Products and rates kholo"', () => {
      const res = parseVoiceCommand('Products and rates kholo');
      expect(res.intent).toBe('NAVIGATE_PRODUCTS');
      expect(res.navigationPath).toBe('/products');
    });

    it('handles "Customer payments kholo"', () => {
      const res = parseVoiceCommand('Customer payments kholo');
      expect(res.intent).toBe('NAVIGATE_PAYMENTS');
      expect(res.navigationPath).toBe('/payments');
    });
  });

  describe('Fuzzy Speech Recognition Variations', () => {
    it('corrects "ब्लैक के" to Blank QR intent', () => {
      const res = parseVoiceCommand('ब्लैक के');
      expect(res.intent).toBe('NAVIGATE_BLANK_QR');
      expect(res.navigationPath).toBe('/blank-qr');
    });

    it('corrects "black k" to Blank QR intent', () => {
      const res = parseVoiceCommand('black k');
      expect(res.intent).toBe('NAVIGATE_BLANK_QR');
    });

    it('handles phonetic typo "delivry" or "delivary"', () => {
      const res = parseVoiceCommand('Aaj ki delivry dikhao');
      expect(res.intent).toBe('NAVIGATE_TODAYS_DELIVERY');
    });

    it('handles phonetic typo "invois"', () => {
      const res = parseVoiceCommand('invois kholo');
      expect(res.intent).toBe('NAVIGATE_BILLS');
    });
  });

  describe('Dynamic Customer Name Extraction', () => {
    it('extracts customer name from "Rahul ki profile kholo"', () => {
      const res = parseVoiceCommand('Rahul ki profile kholo');
      expect(res.intent).toBe('VIEW_CUSTOMER_PROFILE');
      expect(res.customerName).toBe('Rahul');
      expect(res.feedbackSpeech).toContain('Rahul');
    });

    it('extracts customer name from "Rahul ka account kholo"', () => {
      const res = parseVoiceCommand('Rahul ka account kholo');
      expect(res.intent).toBe('VIEW_CUSTOMER_PROFILE');
      expect(res.customerName).toBe('Rahul');
    });

    it('extracts customer name from "Rahul ki details dikhao"', () => {
      const res = parseVoiceCommand('Rahul ki details dikhao');
      expect(res.intent).toBe('VIEW_CUSTOMER_PROFILE');
      expect(res.customerName).toBe('Rahul');
    });

    it('extracts customer name from "Rahul ko search karo"', () => {
      const res = parseVoiceCommand('Rahul ko search karo');
      expect(res.intent).toBe('SEARCH_CUSTOMER');
      expect(res.customerName).toBe('Rahul');
      expect(res.navigationPath).toContain('Rahul');
    });

    it('extracts customer name from "Search Rahul"', () => {
      const res = parseVoiceCommand('Search Rahul');
      expect(res.intent).toBe('SEARCH_CUSTOMER');
      expect(res.customerName).toBe('Rahul');
    });

    it('extracts customer name from "Customer search karo Rahul"', () => {
      const res = parseVoiceCommand('Customer search karo Rahul');
      expect(res.intent).toBe('SEARCH_CUSTOMER');
      expect(res.customerName).toBe('Rahul');
    });

    it('works with arbitrary customer names (e.g. Suresh, Priya Sharma)', () => {
      const res1 = parseVoiceCommand('Priya Sharma ki profile kholo');
      expect(res1.intent).toBe('VIEW_CUSTOMER_PROFILE');
      expect(res1.customerName).toBe('Priya Sharma');

      const res2 = parseVoiceCommand('Search Amit Verma');
      expect(res2.intent).toBe('SEARCH_CUSTOMER');
      expect(res2.customerName).toBe('Amit Verma');
    });
  });

  describe('Delivery Voice Commands Entity Extraction', () => {
    it('handles "Rahul ko delivery do"', () => {
      const res = parseVoiceCommand('Rahul ko delivery do');
      expect(res.intent).toBe('RECORD_DELIVERY');
      expect(res.customerName).toBe('Rahul');
    });

    it('handles "Rahul ki delivery record karo"', () => {
      const res = parseVoiceCommand('Rahul ki delivery record karo');
      expect(res.intent).toBe('RECORD_DELIVERY');
      expect(res.customerName).toBe('Rahul');
    });

    it('extracts entities from "Rahul ko 2 litre cow milk do"', () => {
      const res = parseVoiceCommand('Rahul ko 2 litre cow milk do');
      expect(res.intent).toBe('RECORD_DELIVERY');
      expect(res.customerName).toBe('Rahul');
      expect(res.deliveryDetails).toBeDefined();
      expect(res.deliveryDetails?.items.length).toBe(1);
      expect(res.deliveryDetails?.items[0].productName).toBe('cow milk');
      expect(res.deliveryDetails?.items[0].quantity).toBe(2);
      expect(res.deliveryDetails?.items[0].unit).toBe('litre');
      expect(res.requiresConfirmation).toBe(true);
    });

    it('extracts multiple entities from "Rahul ko 1 litre milk aur 500 gram dahi do"', () => {
      const res = parseVoiceCommand('Rahul ko 1 litre milk aur 500 gram dahi do');
      expect(res.intent).toBe('RECORD_DELIVERY');
      expect(res.customerName).toBe('Rahul');
      expect(res.deliveryDetails?.items.length).toBe(2);

      const item1 = res.deliveryDetails?.items[0];
      expect(item1?.productName).toBe('milk');
      expect(item1?.quantity).toBe(1);
      expect(item1?.unit).toBe('litre');

      const item2 = res.deliveryDetails?.items[1];
      expect(item2?.productName).toBe('dahi');
      expect(item2?.quantity).toBe(500);
      expect(item2?.unit).toBe('gram');
    });

    it('handles "Rahul ki aaj ki delivery"', () => {
      const res = parseVoiceCommand('Rahul ki aaj ki delivery');
      expect(res.intent).toBe('RECORD_DELIVERY');
      expect(res.customerName).toBe('Rahul');
      expect(res.deliveryDetails?.deliveryDate).toBe('today');
    });
  });

  describe('Sensitive Actions Confirmation', () => {
    it('requires confirmation for "delete customer"', () => {
      const res = parseVoiceCommand('delete customer');
      expect(res.intent).toBe('DELETE_CUSTOMER');
      expect(res.requiresConfirmation).toBe(true);
    });

    it('requires confirmation for "delete product"', () => {
      const res = parseVoiceCommand('delete product');
      expect(res.intent).toBe('DELETE_PRODUCT');
      expect(res.requiresConfirmation).toBe(true);
    });
  });

  describe('Unknown Commands and Fallback Guidance', () => {
    it('returns unknown intent with friendly message and 3 examples for gibberish', () => {
      const res = parseVoiceCommand('asdfghjkl random unknown phrase');
      expect(res.intent).toBe('UNKNOWN');
      expect(res.feedbackText).toBe("I didn't understand that. Please try again.");
      expect(res.examples).toBeDefined();
      expect(res.examples?.length).toBe(3);
    });
  });

  describe('Quick Commands UI and Icon Rendering', () => {
    it('contains all 7 required quick navigation commands', () => {
      const labels = QUICK_COMMANDS.map((c) => c.label);
      expect(labels).toEqual([
        "Today's Deliveries",
        'Bills & Invoices',
        'Blank QR Tags',
        'QR Scanner',
        'Customers',
        'Products & Rates',
        'Customer Payments',
      ]);
    });

    it('each quick command parses to the correct navigation intent', () => {
      const expectedIntents: Record<string, string> = {
        "Today's Deliveries": 'NAVIGATE_TODAYS_DELIVERY',
        'Bills & Invoices': 'NAVIGATE_BILLS',
        'Blank QR Tags': 'NAVIGATE_BLANK_QR',
        'QR Scanner': 'NAVIGATE_QR_SCANNER',
        'Customers': 'NAVIGATE_CUSTOMERS',
        'Products & Rates': 'NAVIGATE_PRODUCTS',
        'Customer Payments': 'NAVIGATE_PAYMENTS',
      };

      for (const chip of QUICK_COMMANDS) {
        const parsed = parseVoiceCommand(chip.cmd);
        expect(parsed.intent).toBe(expectedIntents[chip.label]);
        expect(parsed.navigationPath).toBeDefined();
      }
    });

    it('each quick command has a valid React icon component that renders without leaking "svg" text', () => {
      for (const chip of QUICK_COMMANDS) {
        expect(chip.icon).toBeDefined();
        // Render icon
        const iconHtml = renderToString(React.createElement(chip.icon, { className: 'w-4 h-4', 'aria-hidden': true, focusable: false }));
        expect(iconHtml).toContain('<svg');
        expect(iconHtml).toContain('aria-hidden="true"');

        // Render button markup as in VoiceAssistant
        const buttonHtml = renderToString(
          React.createElement(
            'button',
            { 'aria-label': chip.label },
            React.createElement(chip.icon, { className: 'w-4 h-4', 'aria-hidden': true, focusable: false }),
            React.createElement('span', null, chip.label)
          )
        );

        // Ensure literal "svg" does NOT leak into button text (e.g. "Today's Deliveriessvg")
        expect(buttonHtml).not.toContain(`${chip.label}svg`);
        expect(buttonHtml).not.toContain(`svg${chip.label}`);
        expect(buttonHtml).not.toMatch(/Deliveriessvg|Invoicessvg|Tagssvg|Scannersvg|Customerssvg|Ratessvg|Paymentsvg/);
        // Ensure the icon is placed before the label inside the button
        expect(buttonHtml).toMatch(/<svg[\s\S]*?<\/svg><span>/);
      }
    });
  });
});
