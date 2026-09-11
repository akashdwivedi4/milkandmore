/**
 * Comprehensive Voice Command Parser for Milk & More
 * Supports Hindi (Devanagari), Hinglish, and English with phonetic normalization,
 * intent classification, dynamic customer name extraction, and delivery entity extraction.
 */

export type VoiceIntentType =
  | 'NAVIGATE_TODAYS_DELIVERY'
  | 'NAVIGATE_BILLS'
  | 'NAVIGATE_BLANK_QR'
  | 'NAVIGATE_QR_SCANNER'
  | 'NAVIGATE_CUSTOMERS'
  | 'NAVIGATE_PRODUCTS'
  | 'NAVIGATE_PAYMENTS'
  | 'NAVIGATE_PURCHASES'
  | 'NAVIGATE_EXPENSES'
  | 'NAVIGATE_INVENTORY'
  | 'NAVIGATE_FINANCIALS'
  | 'NAVIGATE_REPORTS'
  | 'NAVIGATE_SETTINGS'
  | 'NAVIGATE_DASHBOARD'
  | 'SEARCH_CUSTOMER'
  | 'VIEW_CUSTOMER_PROFILE'
  | 'RECORD_DELIVERY'
  | 'ADD_CUSTOMER'
  | 'ADD_PRODUCT'
  | 'DELETE_CUSTOMER'
  | 'DELETE_PRODUCT'
  | 'UNKNOWN';

export interface ParsedDeliveryItem {
  productName: string;
  quantity: number;
  unit: string;
}

export interface ParsedDeliveryDetails {
  customerName: string;
  items: ParsedDeliveryItem[];
  deliveryDate?: string;
  isAdditional?: boolean;
}

export interface ParsedVoiceCommand {
  rawInput: string;
  normalizedText: string;
  intent: VoiceIntentType;
  confidence: number;
  customerName?: string;
  deliveryDetails?: ParsedDeliveryDetails;
  feedbackSpeech: string;
  feedbackText: string;
  navigationPath?: string;
  requiresConfirmation?: boolean;
  confirmationDetails?: {
    type: string;
    title: string;
    description: string;
  };
  examples?: string[];
}

/**
 * Transliterates Devanagari Hindi characters into standard Romanized Hinglish.
 */
export function transliterateDevanagariToLatin(input: string): string {
  const devanagariToLatinMap: Record<string, string> = {
    // Vowels
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
    // Matras (dependent vowels)
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h',
    // Consonants
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f', 'ज़': 'z', 'ख़': 'kh', 'ग़': 'g',
    // Virama
    '्': '',
    // Numerals
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };

  // Check if string contains Devanagari characters (U+0900 - U+097F)
  if (!/[\u0900-\u097F]/.test(input)) {
    return input;
  }

  let result = '';
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const char = input[i];
    const code = char.charCodeAt(0);

    // If within Devanagari range
    if (code >= 0x0900 && code <= 0x097f) {
      if (devanagariToLatinMap[char] !== undefined) {
        result += devanagariToLatinMap[char];
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Normalizes input text:
 * 1. Trims and cleans text.
 * 2. Applies Devanagari domain replacements (without ASCII \b limitations).
 * 3. Replaces known speech errors.
 * 4. Transliterates remaining Devanagari characters.
 * 5. Cleans punctuation and standardizes English/Hinglish words.
 */
export function normalizeVoiceInput(raw: string): string {
  if (!raw) return '';

  let text = raw.trim();

  // Normalize Devanagari numerals
  text = text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));

  // Handle English possessives before stripping punctuation ("Today's" -> "todays")
  text = text.replace(/'s\b/gi, 's');

  // Devanagari domain and speech recognition replacements (Unicode aware)
  // Blank QR variations: "ब्लैक के", "ब्लैक qr", "black k", "black qr", "blank k", "blek k", "ब्लैंक QR"
  text = text.replace(/ब्लैक\s*(?:के|k|qr|क्यूआर)/giu, 'blank qr');
  text = text.replace(/\bblack\s*(?:k|qr|key)\b/gi, 'blank qr');
  text = text.replace(/\bblank\s*k\b/gi, 'blank qr');
  text = text.replace(/\bblek\s*(?:k|qr)\b/gi, 'blank qr');
  text = text.replace(/ब्लैंक\s*(?:क्यूआर|क्यू\s*आर|qr)/giu, 'blank qr');
  text = text.replace(/ब्लैंक/giu, 'blank');

  // QR scanner variations
  text = text.replace(/क्यू\s*आर\s*स्कैनर|क्यूआर\s*स्कैनर/giu, 'qr scanner');
  text = text.replace(/क्यू\s*आर|क्यूआर/giu, 'qr');
  text = text.replace(/\bq\s*r\b/gi, 'qr');
  text = text.replace(/\bcur\s*scanner\b/gi, 'qr scanner');

  // Today's delivery variations
  text = text.replace(/आज\s*की\s*डिलिवरी(?:ज़|ज|)/giu, 'aaj ki delivery');
  text = text.replace(/आज\s*की\s*डिलीवरी(?:ज़|ज|)/giu, 'aaj ki delivery');
  text = text.replace(/आज\s*का\s*डिलिवरी/giu, 'aaj ki delivery');
  text = text.replace(/आज\s*का\s*डिलीवरी/giu, 'aaj ki delivery');
  text = text.replace(/डिलिवरी(?:ज़|ज|)/giu, 'delivery');
  text = text.replace(/डिलीवरी(?:ज़|ज|)/giu, 'delivery');
  text = text.replace(/डिलिवरीज|डिलीवरीज/giu, 'deliveries');

  // Bills & Invoices
  text = text.replace(/बिल्स?/giu, 'bills');
  text = text.replace(/बिल/giu, 'bill');
  text = text.replace(/इनवॉइस|इन्वॉइस/giu, 'invoice');
  text = text.replace(/हिसाब|खाता\s*बही|खाता/giu, 'khata');

  // Actions
  text = text.replace(/खोलो|खोलें|खोलिए/giu, 'kholo');
  text = text.replace(/दिखाओ|दिखाइए|दिखाना|देखें|देखो/giu, 'dikhao');
  text = text.replace(/ढूंढो|खोजो|सर्च/giu, 'search');
  text = text.replace(/डिलीट|हटाओ|हटाएं/giu, 'delete');
  text = text.replace(/रिकॉर्ड/giu, 'record');
  text = text.replace(/प्रोफ़ाइल|प्रोफाइल/giu, 'profile');

  // Customers & Products
  text = text.replace(/कस्टमर[ा-्a-zA-Z]*|ग्राहक|पार्टी/giu, 'customer');
  text = text.replace(/प्रोडक्ट[ा-्a-zA-Z]*|सामान|माल/giu, 'product');
  text = text.replace(/रेट्स?|रेट|भाव|दर/giu, 'rates');
  text = text.replace(/पेमेंट्स?|पेमेंट|भुगतान|जमा/giu, 'payment');

  // Units
  text = text.replace(/लीटर|ली\./gu, 'litre');
  text = text.replace(/मिलीलीटर|मिली/gu, 'ml');
  text = text.replace(/किलोग्राम|किलो|किग्रा/gu, 'kg');
  text = text.replace(/ग्राम|ग्रा\./gu, 'gram');
  text = text.replace(/पैकेट/gu, 'packet');

  // Dairy items
  text = text.replace(/गाय\s*का\s*दूध/gu, 'cow milk');
  text = text.replace(/भैंस\s*का\s*दूध/gu, 'buffalo milk');
  text = text.replace(/दूध/gu, 'milk');
  text = text.replace(/दही/gu, 'dahi');
  text = text.replace(/पनीर/gu, 'paneer');
  text = text.replace(/घी/gu, 'ghee');
  text = text.replace(/छाछ|मट्ठा/gu, 'buttermilk');

  // Transliterate any remaining Devanagari words (e.g. customer names like "राहुल" -> "rahul")
  text = transliterateDevanagariToLatin(text);

  // Lowercase
  text = text.toLowerCase();

  // Remove punctuation (keep alphanumeric and spaces)
  text = text.replace(/[.,?!;:'"()_\-।]/g, ' ');

  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ').trim();

  // Normalize common phonetic variations in English/Hinglish
  text = text
    .replace(/\bdelivry\b/g, 'delivery')
    .replace(/\bdelivary\b/g, 'delivery')
    .replace(/\bdeliverys\b/g, 'deliveries')
    .replace(/\bbil\b/g, 'bill')
    .replace(/\bbils\b/g, 'bills')
    .replace(/\binvois\b/g, 'invoice')
    .replace(/\binvoise\b/g, 'invoice')
    .replace(/\bcustomar\b/g, 'customer')
    .replace(/\bcustmer\b/g, 'customer')
    .replace(/\bproduc\b/g, 'product')
    .replace(/\bprodut\b/g, 'product')
    .replace(/\bpaymnt\b/g, 'payment')
    .replace(/\bpaymet\b/g, 'payment')
    .replace(/\bprofeil\b/g, 'profile')
    .replace(/\bprofil\b/g, 'profile');

  return text;
}

/**
 * Convert Hindi quantity words into numeric values.
 */
function normalizeQuantityWord(word: string): number | null {
  const w = word.toLowerCase().trim();
  const map: Record<string, number> = {
    'half': 0.5,
    'aadha': 0.5,
    'adha': 0.5,
    'paun': 0.75,
    'ek': 1,
    'one': 1,
    'do': 2,
    'two': 2,
    'teen': 3,
    'three': 3,
    'char': 4,
    'four': 4,
    'paanch': 5,
    'panch': 5,
    'five': 5,
    'chhah': 6,
    'chhe': 6,
    'six': 6,
    'saat': 7,
    'seven': 7,
    'aath': 8,
    'eight': 8,
    'nau': 9,
    'nine': 9,
    'das': 10,
    'ten': 10,
    'sawa': 1.25,
    'dedh': 1.5,
    'dhai': 2.5,
    'sau': 100,
    'hundred': 100,
    'dhai sau': 250,
    'paanch sau': 500,
    'panch sau': 500,
    'hazaar': 1000,
    'hazar': 1000,
  };

  if (map[w] !== undefined) return map[w];
  const num = parseFloat(w);
  return isNaN(num) ? null : num;
}

/**
 * Extracts delivery item entities (products, quantities, units) from delivery commands.
 * Handles single items: "2 litre cow milk"
 * Handles multiple items: "1 litre milk aur 500 gram dahi"
 */
export function extractDeliveryItems(text: string): ParsedDeliveryItem[] {
  const items: ParsedDeliveryItem[] = [];

  // Units pattern
  const unitPattern = '(?:litre|liter|ltr|l|kg|kilo|gram|gm|g|ml|packet|pkt|bottle)';
  // Split on conjunctions 'aur' or 'and' to support multi-item commands
  const segments = text.split(/\s+(?:aur|and)\s+/i);

  for (const seg of segments) {
    // Look for: [quantity] [unit] [product]
    // Example: "2 litre cow milk", "500 gram dahi", "1 litre milk"
    const regex = new RegExp(
      `(\\d+(?:\\.\\d+)?|aadha|adha|half|ek|do|teen|char|paanch|panch|dedh|dhai|sawa|paun|sau|\\d+\\s+sau)\\s*(${unitPattern})s?\\s+([a-z\\s]+?)(?:\\s+(?:do|de\\s*do|dena|daliye|record|karo)|$)`,
      'i'
    );
    const match = seg.match(regex);

    if (match) {
      const rawQty = match[1].trim();
      const rawUnit = match[2].trim().toLowerCase();
      let rawProd = match[3].trim();

      // Clean up product string
      rawProd = rawProd.replace(/\b(?:ko|ki|ka|ke|do|de\s*do|karo)\b/g, '').trim();

      const qty = normalizeQuantityWord(rawQty) || 1;
      let unit = rawUnit;
      if (['litre', 'liter', 'ltr', 'l'].includes(unit)) unit = 'litre';
      if (['kg', 'kilo'].includes(unit)) unit = 'kg';
      if (['gram', 'gm', 'g'].includes(unit)) unit = 'gram';
      if (['packet', 'pkt'].includes(unit)) unit = 'packet';

      if (rawProd) {
        items.push({
          productName: rawProd,
          quantity: qty,
          unit,
        });
      }
    }
  }

  return items;
}

/**
 * Main intent-based Voice Command Parser.
 */
export function parseVoiceCommand(rawInput: string): ParsedVoiceCommand {
  const raw = rawInput || '';
  const normalized = normalizeVoiceInput(raw);

  // 3 fallback examples to show when intent is unknown
  const defaultExamples = [
    'Aaj ki delivery',
    'Bills kholo',
    'Rahul ki profile kholo',
  ];

  if (!normalized) {
    return {
      rawInput: raw,
      normalizedText: '',
      intent: 'UNKNOWN',
      confidence: 0,
      feedbackSpeech: "I didn't understand that. Please try again.",
      feedbackText: "I didn't understand that. Please try again.",
      examples: defaultExamples,
    };
  }

  // -------------------------------------------------------------
  // 1. SENSITIVE / DESTRUCTIVE ACTIONS (Highest Priority)
  // -------------------------------------------------------------
  if (
    /\b(?:delete|remove|hatao)\s+customer\b/i.test(normalized) ||
    /\bcustomer\s+(?:delete|remove|hatao)\b/i.test(normalized) ||
    /\bgrahak\s+(?:delete|hatao)\b/i.test(normalized)
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'DELETE_CUSTOMER',
      confidence: 0.95,
      feedbackSpeech: 'Confirm deleting customer.',
      feedbackText: 'Confirm deleting customer.',
      navigationPath: '/customers',
      requiresConfirmation: true,
      confirmationDetails: {
        type: 'DELETE_CUSTOMER',
        title: 'Delete Customer Confirmation',
        description: 'Voice requested customer deletion. Proceed to customer directory?',
      },
    };
  }

  if (
    /\b(?:delete|remove|hatao)\s+product\b/i.test(normalized) ||
    /\bproduct\s+(?:delete|remove|hatao)\b/i.test(normalized) ||
    /\bsaman\s+(?:delete|hatao)\b/i.test(normalized)
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'DELETE_PRODUCT',
      confidence: 0.95,
      feedbackSpeech: 'Confirm deleting product.',
      feedbackText: 'Confirm deleting product.',
      navigationPath: '/products',
      requiresConfirmation: true,
      confirmationDetails: {
        type: 'DELETE_PRODUCT',
        title: 'Delete Product Confirmation',
        description: 'Voice requested product deletion. Proceed to product catalog?',
      },
    };
  }

  // -------------------------------------------------------------
  // 2. DELIVERY COMMANDS (Entity Extraction)
  // Examples:
  // - "Rahul ko delivery do"
  // - "Rahul ki delivery record karo"
  // - "Rahul ko 2 litre cow milk do"
  // - "Rahul ko 1 litre milk aur 500 gram dahi do"
  // - "Rahul ki aaj ki delivery"
  // -------------------------------------------------------------
  const deliveryRegex =
    /^([a-z0-9\s]+?)\s+(?:ko|ki|ka)\s+(?:(aaj\s*ki|ek\s*aur|additional)\s+)?(?:delivery|deliveries)(?:\s+(?:do|record|karo|dikhao|dena|record\s*karo|de\s*do))?$/i;

  const deliveryWithItemsRegex =
    /^([a-z0-9\s]+?)\s+(?:ko|ki|ka)\s+(.+?\s+(?:litre|liter|ltr|l|kg|kilo|gram|gm|g|packet|bottle)\b.+?)(?:\s+(?:do|de\s*do|dena|daliye|record|karo))?$/i;

  const deliveryMatch = normalized.match(deliveryRegex);
  const deliveryItemsMatch = normalized.match(deliveryWithItemsRegex);

  if (deliveryItemsMatch && !normalized.includes('profile') && !normalized.includes('search')) {
    const rawCustomer = deliveryItemsMatch[1].trim();
    const itemsPart = deliveryItemsMatch[2].trim();

    // Check that rawCustomer is not an action word
    if (!['search', 'find', 'open', 'kholo', 'aaj', 'today'].includes(rawCustomer)) {
      const items = extractDeliveryItems(itemsPart);
      const isAdditional = /\b(?:aur|ek\s*aur|additional)\b/i.test(normalized);

      // Capitalize customer name properly
      const customerName = rawCustomer
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const itemsDesc = items.map((it) => `${it.quantity} ${it.unit} ${it.productName}`).join(' aur ');
      const feedback = items.length > 0
        ? `${customerName} के लिए ${itemsDesc} डिलीवरी रिकॉर्ड खोल रहा हूँ.`
        : `${customerName} की डिलीवरी खोल रहा हूँ.`;

      return {
        rawInput: raw,
        normalizedText: normalized,
        intent: 'RECORD_DELIVERY',
        confidence: 0.95,
        customerName,
        deliveryDetails: {
          customerName,
          items,
          deliveryDate: 'today',
          isAdditional,
        },
        feedbackSpeech: `${customerName} की delivery खोल रहा हूँ.`,
        feedbackText: feedback,
        navigationPath: `/customers?search=${encodeURIComponent(customerName)}`,
        requiresConfirmation: items.length > 0,
        confirmationDetails: items.length > 0
          ? {
              type: 'RECORD_DELIVERY',
              title: `Record Delivery for ${customerName}`,
              description: `Confirm recording ${itemsDesc} for ${customerName}?`,
            }
          : undefined,
      };
    }
  }

  if (deliveryMatch && !normalized.includes('profile') && !normalized.includes('search')) {
    const rawCustomer = deliveryMatch[1].trim();
    const modifier = deliveryMatch[2] ? deliveryMatch[2].trim() : '';

    if (!['search', 'find', 'open', 'kholo', 'aaj', 'today'].includes(rawCustomer)) {
      const customerName = rawCustomer
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const isAdditional = modifier.includes('aur') || modifier.includes('additional');

      return {
        rawInput: raw,
        normalizedText: normalized,
        intent: 'RECORD_DELIVERY',
        confidence: 0.9,
        customerName,
        deliveryDetails: {
          customerName,
          items: [],
          deliveryDate: 'today',
          isAdditional,
        },
        feedbackSpeech: `${customerName} की delivery खोल रहा हूँ.`,
        feedbackText: `${customerName} की delivery खोल रहा हूँ.`,
        navigationPath: `/customers?search=${encodeURIComponent(customerName)}`,
      };
    }
  }

  // -------------------------------------------------------------
  // 3. CUSTOMER PROFILE COMMANDS (Dynamic Customer Extraction)
  // Examples:
  // - "Rahul ki profile kholo"
  // - "Rahul ka account kholo"
  // - "Rahul ki details dikhao"
  // - "Open Rahul's profile"
  // - "Rahul profile"
  // -------------------------------------------------------------
  const profileRegexes = [
    /^([a-z0-9\s]+?)\s+(?:ki|ka|ke)\s+(?:profile|account|details|khata)(?:\s+(?:kholo|dikhao|dekho))?$/i,
    /^(?:open|show|view)\s+(?:profile\s+of\s+)?([a-z0-9\s]+?)(?:s)?\s+(?:profile|account|details)$/i,
    /^([a-z0-9\s]+?)\s+(?:profile|account)$/i,
  ];

  for (const pReg of profileRegexes) {
    const pMatch = normalized.match(pReg);
    if (pMatch && pMatch[1]) {
      const candidate = pMatch[1].trim();
      // Exclude generic navigation targets
      if (!['my', 'app', 'system', 'admin', 'user', 'settings'].includes(candidate)) {
        const customerName = candidate
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        return {
          rawInput: raw,
          normalizedText: normalized,
          intent: 'VIEW_CUSTOMER_PROFILE',
          confidence: 0.95,
          customerName,
          feedbackSpeech: `${customerName} की profile खोल रहा हूँ.`,
          feedbackText: `${customerName} की profile खोल रहा हूँ.`,
          navigationPath: `/customers?search=${encodeURIComponent(customerName)}`,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 4. CUSTOMER SEARCH COMMANDS (Dynamic Extraction)
  // Examples:
  // - "Rahul ko search karo"
  // - "Search Rahul"
  // - "Customer search karo Rahul"
  // - "Rahul dhundho"
  // - "Find Rahul"
  // -------------------------------------------------------------
  const searchPatterns = [
    /^(?:search|find|dhundho|khojo)\s+(?:customer\s+)?([a-z0-9\s]+)$/i,
    /^(?:customer\s+)?search\s+(?:karo\s+)?([a-z0-9\s]+)$/i,
    /^([a-z0-9\s]+?)\s+(?:ko\s+)?(?:search\s+karo|dhundho|khojo)$/i,
    /^([a-z0-9\s]+?)\s+search$/i,
  ];

  for (const sReg of searchPatterns) {
    const sMatch = normalized.match(sReg);
    if (sMatch && sMatch[1]) {
      const candidate = sMatch[1].trim();
      // Exclude generic queries
      if (candidate && !['customer', 'bill', 'delivery', 'product', 'payment'].includes(candidate)) {
        const customerName = candidate
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        return {
          rawInput: raw,
          normalizedText: normalized,
          intent: 'SEARCH_CUSTOMER',
          confidence: 0.95,
          customerName,
          feedbackSpeech: `Searching customers for ${customerName}.`,
          feedbackText: `Searching customers for "${customerName}"`,
          navigationPath: `/customers?search=${encodeURIComponent(customerName)}`,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 5. STATIC NAVIGATION INTENTS (Hindi, Hinglish, English)
  // -------------------------------------------------------------

  // A. Today's Deliveries:
  if (
    normalized === 'aaj ki delivery' ||
    normalized === 'aaj ki deliveries' ||
    normalized.includes('aaj ki delivery') ||
    normalized.includes('aaj ki deliveries') ||
    normalized.includes('aaj delivery') ||
    normalized.includes('today delivery') ||
    normalized.includes('todays delivery') ||
    normalized.includes('todays deliveries') ||
    normalized === 'deliveries' ||
    (normalized.includes('delivery') && (normalized.includes('aaj') || normalized.includes('today') || normalized.includes('dikhao') || normalized.includes('kholo')))
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_TODAYS_DELIVERY',
      confidence: 0.95,
      feedbackSpeech: "Opening today's deliveries.",
      feedbackText: "Navigated to Today's Deliveries",
      navigationPath: '/today',
    };
  }

  // B. Bills & Invoices:
  if (
    normalized === 'bills' ||
    normalized === 'bill' ||
    normalized.includes('bill kholo') ||
    normalized.includes('bills kholo') ||
    normalized.includes('invoice kholo') ||
    normalized.includes('invoices kholo') ||
    normalized.includes('bills and invoice') ||
    normalized.includes('bills & invoice') ||
    normalized.includes('bill dikhao') ||
    normalized.includes('invoice dikhao') ||
    normalized === 'bills and invoices' ||
    normalized === 'bills & invoices' ||
    normalized === 'invoices' ||
    normalized === 'invoice' ||
    (normalized.includes('bill') && !normalized.includes('delivery'))
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_BILLS',
      confidence: 0.95,
      feedbackSpeech: 'Opening bills and invoices.',
      feedbackText: 'Navigated to Monthly Bills & Invoices',
      navigationPath: '/bills',
    };
  }

  // C. Blank QR Tags:
  if (
    normalized.includes('blank qr') ||
    normalized.includes('qr tag') ||
    normalized.includes('qr sticker') ||
    normalized === 'blank qr' ||
    normalized === 'blank qr kholo' ||
    normalized === 'blank qr tags'
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_BLANK_QR',
      confidence: 0.95,
      feedbackSpeech: 'Opening blank QR tags.',
      feedbackText: 'Navigated to Blank QR Tags',
      navigationPath: '/blank-qr',
    };
  }

  // D. QR Scanner:
  if (
    normalized.includes('qr scanner') ||
    normalized.includes('qr scan') ||
    normalized.includes('scanner kholo') ||
    normalized.includes('door qr') ||
    normalized === 'scan qr' ||
    normalized === 'scanner' ||
    normalized === 'qr scanner kholo'
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_QR_SCANNER',
      confidence: 0.95,
      feedbackSpeech: 'Opening QR scanner.',
      feedbackText: 'Opened Door QR Scanner',
      navigationPath: '/scan',
    };
  }

  // E. Customers:
  if (
    normalized === 'customers' ||
    normalized === 'customer' ||
    normalized.includes('customer kholo') ||
    normalized.includes('customers kholo') ||
    normalized.includes('customer list') ||
    normalized.includes('customer page') ||
    normalized.includes('grahak list') ||
    normalized === 'open customers'
  ) {
    const isAdd = /\b(?:add|naya|new|jodo)\b/i.test(normalized);
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: isAdd ? 'ADD_CUSTOMER' : 'NAVIGATE_CUSTOMERS',
      confidence: 0.9,
      feedbackSpeech: isAdd ? 'Opening add customer.' : 'Opening customers directory.',
      feedbackText: isAdd ? 'Navigated to Add Customer' : 'Navigated to Customers Directory',
      navigationPath: isAdd ? '/customers?action=add' : '/customers',
    };
  }

  // F. Products & Rates:
  if (
    normalized === 'products' ||
    normalized === 'product' ||
    normalized.includes('product kholo') ||
    normalized.includes('products kholo') ||
    normalized.includes('products and rates') ||
    normalized.includes('products & rates') ||
    normalized.includes('rate list') ||
    normalized.includes('product rates') ||
    normalized.includes('bhav list') ||
    normalized === 'rates' ||
    normalized === 'rates kholo'
  ) {
    const isAdd = /\b(?:add|naya|new|jodo)\b/i.test(normalized);
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: isAdd ? 'ADD_PRODUCT' : 'NAVIGATE_PRODUCTS',
      confidence: 0.9,
      feedbackSpeech: isAdd ? 'Opening add product.' : 'Opening products and rates.',
      feedbackText: isAdd ? 'Navigated to Add Product' : 'Navigated to Products & Rates',
      navigationPath: isAdd ? '/products?action=add' : '/products',
    };
  }

  // G. Customer Payments:
  if (
    normalized === 'payments' ||
    normalized === 'payment' ||
    normalized.includes('payment kholo') ||
    normalized.includes('payments kholo') ||
    normalized.includes('customer payment') ||
    normalized.includes('customer payments') ||
    normalized.includes('payment page') ||
    normalized.includes('bhugtan') ||
    normalized.includes('jama collection')
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_PAYMENTS',
      confidence: 0.95,
      feedbackSpeech: 'Opening customer payments.',
      feedbackText: 'Navigated to Customer Payments',
      navigationPath: '/payments',
    };
  }

  // H. Purchases / Suppliers:
  if (
    normalized.includes('purchase') ||
    normalized.includes('kharid') ||
    normalized.includes('supplier') ||
    normalized.includes('vendor')
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_PURCHASES',
      confidence: 0.9,
      feedbackSpeech: 'Opening purchases.',
      feedbackText: 'Navigated to Purchases',
      navigationPath: '/purchases',
    };
  }

  // I. Expenses:
  if (
    normalized.includes('expense') ||
    normalized.includes('kharcha') ||
    normalized.includes('diesel') ||
    normalized.includes('fata')
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_EXPENSES',
      confidence: 0.9,
      feedbackSpeech: 'Opening expenses.',
      feedbackText: 'Navigated to Expenses',
      navigationPath: '/expenses',
    };
  }

  // J. Inventory:
  if (
    normalized.includes('stock') ||
    normalized.includes('inventory') ||
    normalized.includes('godown')
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_INVENTORY',
      confidence: 0.9,
      feedbackSpeech: 'Opening live inventory.',
      feedbackText: 'Navigated to Live Inventory',
      navigationPath: '/inventory',
    };
  }

  // K. Financials & Books:
  if (
    normalized.includes('financial') ||
    normalized.includes('ledger') ||
    normalized.includes('profit') ||
    normalized.includes('khata bahi') ||
    normalized.includes('books')
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_FINANCIALS',
      confidence: 0.9,
      feedbackSpeech: 'Opening books and financials.',
      feedbackText: 'Navigated to Books & Financials',
      navigationPath: '/financials',
    };
  }

  // L. Reports:
  if (normalized.includes('report') || normalized.includes('ageing')) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_REPORTS',
      confidence: 0.9,
      feedbackSpeech: 'Opening business reports.',
      feedbackText: 'Navigated to Business Reports',
      navigationPath: '/reports',
    };
  }

  // M. Settings:
  if (
    (normalized.includes('setting') || normalized === 'settings') &&
    !normalized.includes('customer')
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_SETTINGS',
      confidence: 0.9,
      feedbackSpeech: 'Opening settings.',
      feedbackText: 'Navigated to Settings',
      navigationPath: '/settings',
    };
  }

  // N. Dashboard / Home:
  if (
    normalized.includes('dashboard') ||
    normalized.includes('home') ||
    normalized === 'main page' ||
    normalized === 'shuruat'
  ) {
    return {
      rawInput: raw,
      normalizedText: normalized,
      intent: 'NAVIGATE_DASHBOARD',
      confidence: 0.9,
      feedbackSpeech: 'Opening dashboard.',
      feedbackText: 'Navigated to Dashboard',
      navigationPath: '/',
    };
  }

  // -------------------------------------------------------------
  // 6. UNRECOGNIZED / LOW CONFIDENCE FALLBACK
  // -------------------------------------------------------------
  return {
    rawInput: raw,
    normalizedText: normalized,
    intent: 'UNKNOWN',
    confidence: 0.2,
    feedbackSpeech: "I didn't understand that. Please try again.",
    feedbackText: "I didn't understand that. Please try again.",
    examples: defaultExamples,
  };
}
