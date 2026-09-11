/**
 * Converts a numeric amount into Indian Currency Words.
 * e.g. 1030 => "One Thousand and Thirty Rupees only"
 * e.g. 120.50 => "One Hundred Twenty Rupees and Fifty Paise only"
 * e.g. 0 => "Zero Rupees only"
 */

const units = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  let result = '';

  if (n >= 100) {
    result += units[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }

  if (n > 0) {
    if (result !== '') {
      result += 'and ';
    }
    if (n < 20) {
      result += units[n] + ' ';
    } else {
      result += tens[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) {
        result += units[n % 10] + ' ';
      }
    }
  }

  return result.trim();
}

export function numberToIndianWords(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Zero Rupees only';
  }

  const rounded = Math.round(amount * 100) / 100;
  if (rounded === 0) {
    return 'Zero Rupees only';
  }

  const isNegative = rounded < 0;
  const absAmount = Math.abs(rounded);

  const integerPart = Math.floor(absAmount);
  const paisePart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && paisePart === 0) {
    return 'Zero Rupees only';
  }

  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  const hundreds = remainder;

  if (crore > 0) {
    words += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (hundreds > 0) {
    words += convertBelowThousand(hundreds) + ' ';
  }

  words = words.trim();

  let finalString = '';
  if (words) {
    finalString = words + ' Rupees';
  }

  if (paisePart > 0) {
    const paiseWords = convertBelowThousand(paisePart);
    if (finalString) {
      finalString += ' and ' + paiseWords + ' Paise';
    } else {
      finalString = paiseWords + ' Paise';
    }
  }

  finalString = (isNegative ? 'Minus ' : '') + finalString + ' only';

  return finalString.replace(/\s+/g, ' ').trim();
}
