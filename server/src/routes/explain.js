import { Router } from 'express';
import { makeLimiter } from '../middleware/rateLimiter.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const limiter = makeLimiter(40);

// GET /api/explain/stream?selection=...&verseText=...&bookName=...&chapter=...&verse=...
router.get('/stream', limiter, async (req, res) => {
  const { selection, verseText, bookName, chapter, verse } = req.query;

  if (!selection || !verseText) {
    return res.status(400).json({ error: 'Missing selection or verseText' });
  }

  const prompt = `You are a biblical scholar helping a modern reader understand the Bible.

The reader is studying this verse:
Book: ${bookName || ''}  Chapter: ${chapter || ''}  Verse: ${verse || ''}
Full verse: "${verseText}"

They highlighted this specific word or phrase: "${selection}"

Explain what "${selection}" means in this biblical context. Cover:
- What this word/phrase meant to the original audience
- Any historical, cultural, or linguistic background
- Why it matters for understanding the verse

Be direct and clear. Plain English only. 60–90 words max. No bullet points.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = getClient().messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    let full = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        full += event.delta.text;
        res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, full: full.trim() })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Explain stream error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to explain selection.' });
  }
});

export default router;
