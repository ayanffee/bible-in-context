import Anthropic from '@anthropic-ai/sdk';
import { buildContextPrompt } from '../utils/promptBuilder.js';

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Parses Claude's raw output into { context, terms }
export function parseResponse(raw) {
  const contextMatch = raw.match(/CONTEXT:\s*([\s\S]*?)(?=KEY TERMS:|$)/i);
  const termsMatch = raw.match(/KEY TERMS:\s*([\s\S]*?)$/i);

  const context = contextMatch ? contextMatch[1].trim() : raw.trim();

  const terms = [];
  if (termsMatch) {
    const lines = termsMatch[1].trim().split('\n');
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const term = line.slice(0, colonIdx).replace(/^[-•*]\s*/, '').trim();
      const definition = line.slice(colonIdx + 1).trim();
      if (term && definition) terms.push({ term, definition });
    }
  }

  return { context, terms };
}

// Streaming version — streams raw text chunks, sends parsed result at the end
export async function streamContext({ bookName, chapter, verse, text }, res) {
  const prompt = buildContextPrompt({ bookName, chapter, verse, text });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullText = '';

  const stream = getClient().messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      const chunk = event.delta.text;
      fullText += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
  }

  const parsed = parseResponse(fullText);
  res.write(`data: ${JSON.stringify({ done: true, ...parsed, raw: fullText })}\n\n`);
  res.end();

  return parsed;
}

// Non-streaming fallback (used by POST route + prebuild script)
export async function generateContext({ bookName, chapter, verse, text }) {
  const prompt = buildContextPrompt({ bookName, chapter, verse, text });

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const block = response.content.find(b => b.type === 'text');
  if (!block) throw new Error('No text in Claude response');

  return parseResponse(block.text);
}
