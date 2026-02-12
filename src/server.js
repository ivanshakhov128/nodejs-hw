import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { errors as celebrateErrors } from 'celebrate';

import { connectMongoDB } from './db/connectMongoDB.js';

import notesRoutes from './routes/notesRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(logger);
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// routes (без префиксов, как требует проверка)
app.use(notesRoutes);
app.use(authRoutes);
app.use(userRoutes);

// ✅ 404 СРАЗУ ПОСЛЕ РОУТОВ
app.use(notFoundHandler);

// ✅ celebrate errors ПОСЛЕ 404
app.use(celebrateErrors());

// ✅ последний
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectMongoDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
