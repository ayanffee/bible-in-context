import db from '../db.js';

/**
 * Validates `Authorization: Bearer <userId>` and sets req.userId.
 * The user's UUID stored in localStorage acts as the bearer token.
 */
export function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7).trim();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(token);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  req.userId = user.id;
  next();
}
