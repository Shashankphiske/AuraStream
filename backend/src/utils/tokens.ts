import jwt from 'jsonwebtoken';
import { IJwtPayload } from '../types/index.js';
import { env } from '../config/env.js';

const ALGORITHM: jwt.Algorithm = 'HS256';

export function generateAccessToken(payload: IJwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_ACCESS_EXPIRATION as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: IJwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_REFRESH_EXPIRATION as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): IJwtPayload {
  // Reject 'none' algorithm and enforce HS256
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ALGORITHM],
  });
  return decoded as IJwtPayload;
}

export function verifyRefreshToken(token: string): IJwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [ALGORITHM],
  });
  return decoded as IJwtPayload;
}
