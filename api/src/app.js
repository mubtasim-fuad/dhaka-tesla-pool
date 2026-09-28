import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import auth, { requireAuth } from './auth.js';
import { ZONES } from './domain.js';
import { handleError } from './errors.js';
import passenger from './passenger.js';
import driver from './driver.js';

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.get('/health', async (_req,res) => { await pool.query('SELECT 1'); res.json({ ok: true }); });
app.get('/api/zones', (_req,res) => res.json({ zones: ZONES }));
app.use('/api/auth',auth);
app.use('/api/requests',requireAuth,passenger);
app.use('/api/driver',requireAuth,driver);
app.use(handleError);

// The same Express app runs under Docker and as a Vercel Function.
export default app;
