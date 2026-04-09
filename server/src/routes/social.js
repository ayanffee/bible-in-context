import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── Users ──────────────────────────────────────────────────────────────────

// POST /api/social/users  { username, displayName, avatar }
router.post('/users', (req, res) => {
  const { username, displayName, avatar } = req.body;
  if (!username || !displayName) return res.status(400).json({ error: 'username and displayName required' });

  const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscore)' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(clean);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const user = {
    id: randomUUID(),
    username: clean,
    displayName: displayName.trim().slice(0, 40),
    avatar: avatar || '✝️',
    createdAt: new Date().toISOString()
  };

  db.prepare('INSERT INTO users VALUES (@id,@username,@displayName,@avatar,@createdAt)').run(user);
  res.json(user);
});

// GET /api/social/users/:username
router.get('/users/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/social/users/by-id/:id
router.get('/users/by-id/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── Friends ─────────────────────────────────────────────────────────────────

// POST /api/social/friends  { toUsername }  (auth required — fromUserId from token)
router.post('/friends', requireAuth, (req, res) => {
  const { toUsername } = req.body;
  const fromUserId = req.userId;
  if (!toUsername) return res.status(400).json({ error: 'toUsername required' });

  const toUser = db.prepare('SELECT * FROM users WHERE username = ?').get(toUsername.toLowerCase());
  if (!toUser) return res.status(404).json({ error: 'User not found' });
  if (toUser.id === fromUserId) return res.status(400).json({ error: "Can't add yourself" });

  const existing = db.prepare(`
    SELECT * FROM friendships
    WHERE (fromUserId=? AND toUserId=?) OR (fromUserId=? AND toUserId=?)
  `).get(fromUserId, toUser.id, toUser.id, fromUserId);

  if (existing) return res.status(409).json({ error: 'Friend request already exists', status: existing.status });

  const friendship = {
    id: randomUUID(),
    fromUserId,
    toUserId: toUser.id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.prepare('INSERT INTO friendships VALUES (@id,@fromUserId,@toUserId,@status,@createdAt)').run(friendship);
  res.json({ ...friendship, toUser });
});

// PUT /api/social/friends/:id/accept  (auth required)
router.put('/friends/:id/accept', requireAuth, (req, res) => {
  const friendship = db.prepare('SELECT * FROM friendships WHERE id=?').get(req.params.id);
  if (!friendship) return res.status(404).json({ error: 'Not found' });
  if (friendship.toUserId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

  db.prepare("UPDATE friendships SET status='accepted' WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// DELETE /api/social/friends/:id  (auth required)
router.delete('/friends/:id', requireAuth, (req, res) => {
  const friendship = db.prepare('SELECT * FROM friendships WHERE id=?').get(req.params.id);
  if (!friendship) return res.status(404).json({ error: 'Not found' });
  if (friendship.fromUserId !== req.userId && friendship.toUserId !== req.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  db.prepare('DELETE FROM friendships WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/social/friends/:userId  — all accepted friends + pending requests
router.get('/friends/:userId', (req, res) => {
  const { userId } = req.params;

  const accepted = db.prepare(`
    SELECT f.id, f.status, f.createdAt,
           CASE WHEN f.fromUserId=? THEN f.toUserId ELSE f.fromUserId END as friendId
    FROM friendships f
    WHERE (f.fromUserId=? OR f.toUserId=?) AND f.status='accepted'
  `).all(userId, userId, userId);

  const pending = db.prepare(`
    SELECT f.id, f.status, f.fromUserId, f.toUserId, f.createdAt
    FROM friendships f
    WHERE f.toUserId=? AND f.status='pending'
  `).all(userId);

  const sent = db.prepare(`
    SELECT f.id, f.status, f.toUserId, f.createdAt
    FROM friendships f
    WHERE f.fromUserId=? AND f.status='pending'
  `).all(userId);

  const enrichFriend = (friendId) => db.prepare('SELECT * FROM users WHERE id=?').get(friendId);

  res.json({
    friends: accepted.map(f => ({ ...f, user: enrichFriend(f.friendId) })),
    pendingRequests: pending.map(f => ({ ...f, fromUser: enrichFriend(f.fromUserId) })),
    sentRequests: sent.map(f => ({ ...f, toUser: enrichFriend(f.toUserId) }))
  });
});

// ── Shared Bookmarks ─────────────────────────────────────────────────────────

// POST /api/social/bookmarks  (auth required — userId from token)
router.post('/bookmarks', requireAuth, (req, res) => {
  const { bookId, bookName, chapter, verse, text, category, note } = req.body;
  const userId = req.userId;
  if (!bookId || !chapter || !verse || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const existing = db.prepare(
    'SELECT id FROM shared_bookmarks WHERE userId=? AND bookId=? AND chapter=? AND verse=?'
  ).get(userId, bookId, chapter, verse);
  if (existing) return res.status(409).json({ error: 'Already shared', id: existing.id });

  const bookmark = {
    id: randomUUID(),
    userId,
    bookId,
    bookName,
    chapter,
    verse,
    text,
    category: category || null,
    note: note || null,
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO shared_bookmarks VALUES
    (@id,@userId,@bookId,@bookName,@chapter,@verse,@text,@category,@note,@createdAt)
  `).run(bookmark);

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  res.json({ ...bookmark, user, commentCount: 0 });
});

// DELETE /api/social/bookmarks/:id  (auth required)
router.delete('/bookmarks/:id', requireAuth, (req, res) => {
  const bm = db.prepare('SELECT * FROM shared_bookmarks WHERE id=?').get(req.params.id);
  if (!bm) return res.status(404).json({ error: 'Not found' });
  if (bm.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  db.prepare('DELETE FROM shared_bookmarks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/social/feed/:userId  — bookmarks from friends + own
router.get('/feed/:userId', (req, res) => {
  const { userId } = req.params;

  const friendRows = db.prepare(`
    SELECT CASE WHEN fromUserId=? THEN toUserId ELSE fromUserId END as friendId
    FROM friendships WHERE (fromUserId=? OR toUserId=?) AND status='accepted'
  `).all(userId, userId, userId);

  const friendIds = friendRows.map(r => r.friendId);
  const allIds = [userId, ...friendIds];

  if (allIds.length === 0) return res.json([]);

  const placeholders = allIds.map(() => '?').join(',');
  const bookmarks = db.prepare(`
    SELECT sb.*, u.username, u.displayName, u.avatar,
           COUNT(c.id) as commentCount
    FROM shared_bookmarks sb
    JOIN users u ON sb.userId = u.id
    LEFT JOIN comments c ON c.bookmarkId = sb.id
    WHERE sb.userId IN (${placeholders})
    GROUP BY sb.id
    ORDER BY sb.createdAt DESC
    LIMIT 100
  `).all(...allIds);

  res.json(bookmarks);
});

// GET /api/social/bookmarks/user/:userId — just one user's shared bookmarks
router.get('/bookmarks/user/:userId', (req, res) => {
  const bookmarks = db.prepare(`
    SELECT sb.*, u.username, u.displayName, u.avatar,
           COUNT(c.id) as commentCount
    FROM shared_bookmarks sb
    JOIN users u ON sb.userId = u.id
    LEFT JOIN comments c ON c.bookmarkId = sb.id
    WHERE sb.userId = ?
    GROUP BY sb.id
    ORDER BY sb.createdAt DESC
  `).all(req.params.userId);
  res.json(bookmarks);
});

// ── Comments ──────────────────────────────────────────────────────────────────

// GET /api/social/comments/:bookmarkId
router.get('/comments/:bookmarkId', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.displayName, u.avatar
    FROM comments c
    JOIN users u ON c.userId = u.id
    WHERE c.bookmarkId = ?
    ORDER BY c.createdAt ASC
  `).all(req.params.bookmarkId);
  res.json(comments);
});

// POST /api/social/comments  (auth required — userId from token)
router.post('/comments', requireAuth, (req, res) => {
  const { bookmarkId, content } = req.body;
  const userId = req.userId;
  if (!bookmarkId || !content?.trim()) {
    return res.status(400).json({ error: 'bookmarkId and content required' });
  }

  const bm = db.prepare('SELECT id FROM shared_bookmarks WHERE id=?').get(bookmarkId);
  if (!bm) return res.status(404).json({ error: 'Bookmark not found' });

  const comment = {
    id: randomUUID(),
    bookmarkId,
    userId,
    content: content.trim().slice(0, 1000),
    createdAt: new Date().toISOString()
  };
  db.prepare('INSERT INTO comments VALUES (@id,@bookmarkId,@userId,@content,@createdAt)').run(comment);

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  res.json({ ...comment, username: user.username, displayName: user.displayName, avatar: user.avatar });
});

// DELETE /api/social/comments/:id  (auth required)
router.delete('/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
