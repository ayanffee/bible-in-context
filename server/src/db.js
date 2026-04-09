import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Vercel the filesystem is read-only except for /tmp
const DB_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../data');
const DB_PATH = path.join(DB_DIR, 'bible-social.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    displayName TEXT NOT NULL,
    avatar      TEXT,          -- emoji avatar
    createdAt   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id         TEXT PRIMARY KEY,
    fromUserId TEXT NOT NULL REFERENCES users(id),
    toUserId   TEXT NOT NULL REFERENCES users(id),
    status     TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
    createdAt  TEXT NOT NULL,
    UNIQUE(fromUserId, toUserId)
  );

  CREATE TABLE IF NOT EXISTS shared_bookmarks (
    id          TEXT PRIMARY KEY,
    userId      TEXT NOT NULL REFERENCES users(id),
    bookId      TEXT NOT NULL,
    bookName    TEXT NOT NULL,
    chapter     INTEGER NOT NULL,
    verse       INTEGER NOT NULL,
    text        TEXT NOT NULL,
    category    TEXT,
    note        TEXT,          -- optional personal note when sharing
    createdAt   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id           TEXT PRIMARY KEY,
    bookmarkId   TEXT NOT NULL REFERENCES shared_bookmarks(id) ON DELETE CASCADE,
    userId       TEXT NOT NULL REFERENCES users(id),
    content      TEXT NOT NULL,
    createdAt    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_friendships_from ON friendships(fromUserId);
  CREATE INDEX IF NOT EXISTS idx_friendships_to   ON friendships(toUserId);
  CREATE INDEX IF NOT EXISTS idx_shared_user      ON shared_bookmarks(userId);
  CREATE INDEX IF NOT EXISTS idx_comments_bm      ON comments(bookmarkId);
`);

export default db;
