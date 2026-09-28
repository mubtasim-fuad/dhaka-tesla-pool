import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';
import { AppError } from './errors.js';

const auth = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(72),
}).strict();
const loginSchema = z.object({ email: z.email().toLowerCase(), password: z.string() }).strict();

function tokenFor(user) {
  return jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, { expiresIn: '12h' });
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

auth.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body);
  const hash = await bcrypt.hash(input.password, 10);
  const result = await pool.query(
    `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'PASSENGER')
     RETURNING id,name,email,role`, [input.name,input.email,hash]
  );
  res.status(201).json({ user: publicUser(result.rows[0]), token: tokenFor(result.rows[0]) });
});

auth.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [input.email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) throw new AppError(401,'Invalid email or password');
  res.json({ user: publicUser(user), token: tokenFor(user) });
});

export async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new AppError(401,'Sign in required');
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const result = await pool.query('SELECT id,name,email,role FROM users WHERE id=$1', [decoded.sub]);
    if (!result.rowCount) throw new AppError(401,'Account unavailable');
    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error instanceof jwt.JsonWebTokenError ? new AppError(401,'Invalid session') : error);
  }
}

export function requireRole(role) {
  return (req, _res, next) => req.user.role === role ? next() : next(new AppError(403,'Role not allowed'));
}

export default auth;
