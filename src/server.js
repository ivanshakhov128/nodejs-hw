import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { connectMongoDB } from './db/connectMongoDB.js';

import notesRoutes from './routes/notesRoutes.js';
import authRoutes from './routes/authRoutes.js';

import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

import { errors as celebrateErrors } from 'celebrate';

dotenv.config();

const app = express();

// middleware
app.use(logger);
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// routes
app.use(notesRoutes);
app.use(authRoutes);

// celebrate validation errors
app.use(celebrateErrors());

// 404
app.use(notFoundHandler);

// global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectMongoDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
