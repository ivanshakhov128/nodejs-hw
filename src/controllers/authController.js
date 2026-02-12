import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import createHttpError from 'http-errors';

import { User } from '../models/user.js';
import { Session } from '../models/session.js';

import { createSession } from '../utils/createSession.js';
import { setSessionCookies } from '../utils/setSessionCookies.js';
import { sendEmail } from '../utils/sendMail.js';

const templatePath = path.resolve(
  'src',
  'templates',
  'reset-password-email.html',
);

export const registerUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw createHttpError(400, 'Email in use');
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hash,
      username: email,
    });

    const session = await createSession(user._id);
    setSessionCookies(res, session);

    // ✅ вернуть документ пользователя напрямую (toJSON уберёт password)
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw createHttpError(401, 'Email or password is wrong');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw createHttpError(401, 'Email or password is wrong');
    }

    // ✅ удалить старые сессии пользователя
    await Session.deleteMany({ userId: user._id });

    // ✅ создать новую
    const session = await createSession(user._id);
    setSessionCookies(res, session);

    // ✅ вернуть пользователя (а не accessToken)
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const { sessionId } = req.cookies;

    if (sessionId) {
      await Session.findByIdAndDelete(sessionId);
    }

    res.clearCookie('sessionId');
    res.clearCookie('refreshToken');

    // ✅ 204 без тела
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const refreshUserSession = async (req, res, next) => {
  try {
    const { sessionId, refreshToken } = req.cookies;

    if (!sessionId || !refreshToken) {
      throw createHttpError(401, 'Unauthorized');
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      throw createHttpError(401, 'Unauthorized');
    }

    if (session.refreshToken !== refreshToken) {
      throw createHttpError(401, 'Unauthorized');
    }

    if (new Date() > session.refreshTokenValidUntil) {
      await Session.findByIdAndDelete(sessionId);
      throw createHttpError(401, 'Unauthorized');
    }

    // ✅ удалить старую сессию и создать новую
    await Session.findByIdAndDelete(sessionId);
    const newSession = await createSession(session.userId);
    setSessionCookies(res, newSession);

    const user = await User.findById(session.userId);

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const requestResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: 'Password reset email sent successfully',
      });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    const source = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(source);

    const link = `${process.env.FRONTEND_DOMAIN}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset password',
      html: template({ name: user.username, link }),
    });

    res.status(200).json({
      message: 'Password reset email sent successfully',
    });
  } catch {
    next(
      createHttpError(500, 'Failed to send the email, please try again later.'),
    );
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw createHttpError(401, 'Invalid or expired token');
    }

    const user = await User.findOne({
      _id: payload.sub,
      email: payload.email,
    });

    if (!user) {
      throw createHttpError(404, 'User not found');
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};
