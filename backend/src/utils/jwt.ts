import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  businessId: string;
  role: string;
}

export const signToken = (payload: TokenPayload, expiresIn: string = '7d'): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as any);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};
