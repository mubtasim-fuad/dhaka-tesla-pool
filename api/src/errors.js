import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function handleError(error, _req, res, _next) {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Invalid input', issues: error.issues.map(x => ({ path: x.path.join('.'), message: x.message })) });
  if (error.code === '23505') return res.status(409).json({ error: 'An active request or account already exists' });
  if (error instanceof AppError) return res.status(error.status).json({ error: error.message });
  console.error('Request failed', { message: error.message, code: error.code });
  res.status(500).json({ error: 'Internal server error' });
}
