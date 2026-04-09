import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please slow down.' }
});

// GET /api/didyouknow/stream?topics=topic1,topic2,...
router.get('/stream', limiter, async (req, res) => {
  const topicsParam = req.query.topics || '';
  const topics = topicsParam
    ? topicsParam.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5)
    : [];

  const topicPromptPart = topics.length > 0
    ? `The reader has recently been studying these topics/phrases: ${topics.join(', ')}.
Generate 3 fascinating, lesser-known biblical facts that CONNECT to or EXPAND on those topics — facts the reader would find surprising and relevant to their study.`
    : `Generate 3 fascinating, lesser-known biblical facts that a modern person would find surprising and eye-opening. Focus on cultural, historical, linguistic, or archaeological details that most people don't know.`;

  const prompt = `You are a biblical scholar and historian. ${topicPromptPart}

Output exactly 3 facts. For each fact, output it on its own line in this EXACT format:
FACT:{"title":"Short hook title (5-8 words)","fact":"2-3 sentence explanation that is fascinating and specific."}

Rules:
- Each FACT: line must be valid JSON after the colon
- title should be punchy and intriguing, like a headline
- fact should be 2-3 sentences, specific, surprising, and educational
- No markdown, no numbering, no extra text — ONLY the 3 FACT: lines
- Make the facts genuinely surprising and specific, not general knowledge`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = getClient().messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    let buffer = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        buffer += event.delta.text;

        // Try to extract complete FACT: lines from buffer
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('FACT:')) {
            const jsonStr = trimmed.slice(5).trim();
            try {
              const factObj = JSON.parse(jsonStr);
              if (factObj.title && factObj.fact) {
                res.write(`data: ${JSON.stringify({ fact: factObj })}\n\n`);
              }
            } catch {
              // Malformed JSON line — skip
            }
          }
        }
      }
    }

    // Process anything remaining in the buffer
    if (buffer.trim().startsWith('FACT:')) {
      const jsonStr = buffer.trim().slice(5).trim();
      try {
        const factObj = JSON.parse(jsonStr);
        if (factObj.title && factObj.fact) {
          res.write(`data: ${JSON.stringify({ fact: factObj })}\n\n`);
        }
      } catch {}
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Did You Know stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate facts.' });
    } else {
      res.write(`data: ${JSON.stringify({ done: true, error: true })}\n\n`);
      res.end();
    }
  }
});

export default router;
