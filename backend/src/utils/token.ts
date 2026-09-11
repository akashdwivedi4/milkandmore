import crypto from 'crypto';

/**
 * Generate a unique, stable customer QR token
 * Formats as e.g. "qr_c_a1b2c3d4e5f67890"
 */
export const generateCustomerQRToken = (): string => {
  const randomBytes = crypto.randomBytes(12).toString('hex');
  return `qr_c_${randomBytes}`;
};
