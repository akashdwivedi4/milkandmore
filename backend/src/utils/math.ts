import BigNumber from 'bignumber.js';

// Configure BigNumber for financial calculations
BigNumber.config({
  DECIMAL_PLACES: 2,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
});

/**
 * Multiply quantity by rate safely with precision
 */
export const calculateAmount = (quantity: number, rate: number): number => {
  const q = new BigNumber(quantity);
  const r = new BigNumber(rate);
  return q.multipliedBy(r).decimalPlaces(2, BigNumber.ROUND_HALF_UP).toNumber();
};

/**
 * Normalize a quantity to base units (e.g. 500 ML with factor 0.001 -> 0.5 L)
 */
export const normalizeQuantity = (quantity: number, factor: number): number => {
  const q = new BigNumber(quantity);
  const f = new BigNumber(factor);
  return q.multipliedBy(f).decimalPlaces(3, BigNumber.ROUND_HALF_UP).toNumber();
};

/**
 * Safe addition of numbers
 */
export const safeAdd = (...numbers: (number | undefined | null)[]): number => {
  return numbers
    .reduce((acc: BigNumber, curr) => acc.plus(new BigNumber(curr || 0)), new BigNumber(0))
    .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
    .toNumber();
};

/**
 * Safe subtraction: a - b
 */
export const safeSubtract = (a: number, b: number): number => {
  return new BigNumber(a || 0)
    .minus(new BigNumber(b || 0))
    .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
    .toNumber();
};

/**
 * Round money to 2 decimals
 */
export const roundMoney = (amount: number): number => {
  return new BigNumber(amount || 0).decimalPlaces(2, BigNumber.ROUND_HALF_UP).toNumber();
};

/**
 * Round stock to 3 decimals
 */
export const roundStock = (stock: number): number => {
  return new BigNumber(stock || 0).decimalPlaces(3, BigNumber.ROUND_HALF_UP).toNumber();
};
