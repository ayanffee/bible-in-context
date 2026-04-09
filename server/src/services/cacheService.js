import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../../cache/context-cache.json');

// Layer 1: in-memory
const memoryCache = new Map();

// Load from file on startup
function loadFromFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      for (const [key, value] of Object.entries(data)) {
        memoryCache.set(key, value);
      }
      console.log(`Cache loaded: ${memoryCache.size} entries`);
    }
  } catch (err) {
    console.warn('Could not load cache file:', err.message);
  }
}

function saveToFile() {
  try {
    const data = Object.fromEntries(memoryCache);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('Could not save cache file:', err.message);
  }
}

export function get(bookId, chapter, verse) {
  const key = `${bookId}:${chapter}:${verse}`;
  return memoryCache.get(key) || null;
}

export function set(bookId, chapter, verse, context) {
  const key = `${bookId}:${chapter}:${verse}`;
  memoryCache.set(key, context);
  saveToFile();
}

export function getSize() {
  return memoryCache.size;
}

// Initialize
loadFromFile();
