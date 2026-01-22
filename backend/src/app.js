import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cron from 'node-cron';

import { validateEnv, getConfig } from './config/envConfig.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pool } from './config/mySQLConfig.js';
import { paperRouter } from './routes/paperRouter.js';
import authRouter from './routes/authRouter.js';
import notificationRouter from './routes/notificationRouter.js';
import { ensureUserColumnsExist, checkSubscriptionExpirations } from './utils/helperFunctions.js';
import { initS3Mapping } from './utils/s3PathHelper.js';

dotenv.config();

validateEnv();

const config = getConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = config.server.port;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.use('/api/v1/paper', paperRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/notification', notificationRouter);

app.use(errorHandler);

process.on('SIGINT', async () => {
  console.log('\nClosing MySQL pool...');
  try {
    await pool.end();
    console.log('MySQL pool closed successfully.');
  } catch (e) {
    console.error('Error closing MySQL pool:', e);
  }
  process.exit(0);
});

app.get('/', (req, res) => {
  res.send('API Working');
});

app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
});

app.listen(port, async () => {
  try {
    initS3Mapping();
    await ensureUserColumnsExist();
    console.log('Database initialized successfully.');

    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily subscription expiration check...');
      await checkSubscriptionExpirations();
    });

  } catch (error) {
    console.error('Failed to initialize database schema. Check connection/permissions.');
  }
  console.log(`Server started on port ${port}`);
});

export default app;
