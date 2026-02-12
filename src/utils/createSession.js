import crypto from 'crypto';
import { Session } from '../models/session.js';

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export const createSession = async (userId) => {
  const refreshToken = crypto.randomBytes(40).toString('hex');

  const session = await Session.create({
    userId,
    refreshToken,
    refreshTokenValidUntil: new Date(Date.now() + FIFTEEN_DAYS_MS),
  });

  return session;
};
