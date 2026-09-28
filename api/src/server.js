import { app } from './app.js';
import { pool } from './db.js';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('DATABASE_URL and a JWT_SECRET of at least 32 characters are required');
}
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
process.on('SIGTERM', () => server.close(() => pool.end()));
