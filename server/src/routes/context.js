import { Router } from 'express';
import { makeLimiter } from '../middleware/rateLimiter.js';
import * as cache from '../services/cacheService.js';
import { generateContext, streamContext } from '../services/claudeService.js';

const router = Router();

const limiter = makeLimiter(30);

// Streaming endpoint — returns SSE, text appears word by word
router.get('/stream', limiter, async (req, res) => {
  const { bookId, bookName, chapter, verse, text } = req.query;

  if (!bookId || !bookName || !chapter || !verse || !text) {
    return res.status(400).json({ error: 'Missing required query params' });
  }

  // If cached, send the full parsed object immediately
  const cached = cache.get(bookId, chapter, verse);
  if (cached) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ done: true, ...cached, cached: true })}\n\n`);
    return res.end();
  }

  try {
    const parsed = await streamContext({ bookName, chapter, verse, text }, res);
    cache.set(bookId, chapter, verse, parsed);
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate context.' });
    }
  }
});

// POST fallback
router.post('/', limiter, async (req, res) => {
  const { bookId, bookName, chapter, verse, text } = req.body;

  if (!bookId || !bookName || !chapter || !verse || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cached = cache.get(bookId, chapter, verse);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const parsed = await generateContext({ bookName, chapter, verse, text });
    cache.set(bookId, chapter, verse, parsed);
    res.json({ ...parsed, cached: false });
  } catch (err) {
    console.error('Context generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate context. Please try again.' });
  }
});

export default router;
