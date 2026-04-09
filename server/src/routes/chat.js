import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { makeLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const client = new Anthropic();

const limiter = makeLimiter(20);

const SYSTEM_PROMPT = `You are a knowledgeable biblical scholar assistant inside the "Bible in Context" app. Your ONLY purpose is to answer questions about:
- The Bible (Old and New Testament)
- Biblical history, culture, and context
- Biblical characters, events, and places
- Theology and Christian doctrine
- Ancient Near East history as it relates to the Bible
- Biblical languages (Hebrew, Greek, Aramaic)
- Biblical archaeology and geography
- Denominational interpretations of Scripture

If someone asks ANYTHING not related to the Bible or biblical topics, respond ONLY with:
"I'm your biblical study assistant — I can only help with Bible and theology questions! 📖 Try asking me about a verse, a biblical character, historical context, or what a passage means."

Do NOT answer off-topic questions even if the user insists or claims it's related.

When answering biblical questions:
- Be warm, clear, and educational
- Provide historical and cultural context
- Reference specific Bible passages when relevant
- Keep answers concise but thorough (2-4 paragraphs max)
- Use simple language that anyone can understand`;

// POST /api/chat/stream  (SSE)
router.post('/stream', limiter, async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'Messages required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // Keep last 10 turns, but ensure the slice always starts with a user message.
    // The Claude API rejects conversations that begin with an assistant turn.
    let trimmed = messages.slice(-10);
    const firstUserIdx = trimmed.findIndex(m => m.role === 'user');
    if (firstUserIdx > 0) trimmed = trimmed.slice(firstUserIdx);

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: trimmed,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        const text = chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
