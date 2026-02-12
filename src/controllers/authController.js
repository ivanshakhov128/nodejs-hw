import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import createHttpError from 'http-errors';

import { User } from '../models/user.js';
import { sendEmail } from '../utils/sendMail.js';

const templatePath = path.resolve(
  'src',
  'templates',
  'reset-password-email.html',
);

// ---------------- REGISTER ----------------
export const registerUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createHttpError(409, 'Email in use');
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hash,
      username: email,
    });

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------- LOGIN ----------------
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

    // Минимально: создаём access token
    const accessToken = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    // Кладём в cookie (раз ты уже подключил cookie-parser)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });

    res.status(200).json({
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------- REFRESH (заглушка) ----------------
export const refreshUserSession = async (req, res, next) => {
  try {
    // если у тебя есть своя логика refresh — вставишь сюда
    res.status(200).json({ message: 'Session refreshed' });
  } catch (error) {
    next(error);
  }
};

// ---------------- LOGOUT ----------------
export const logoutUser = async (req, res, next) => {
  try {
    res.clearCookie('accessToken');
    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

// ---------------- REQUEST RESET EMAIL ----------------
export const requestResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // По ТЗ: если пользователя нет — всё равно 200
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

    const html = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(html);

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

// ---------------- RESET PASSWORD ----------------
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
