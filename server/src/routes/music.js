import { Router } from 'express';
import { makeLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const limiter = makeLimiter(30);

const SKIP_KEYWORDS = /\bnonstop\b|non-stop|non stop|\bcompilation\b|\bmashup\b|all songs|24\/7|full album|greatest hits|\bmedley\b|full concert|all episodes|livestream/i;

async function ytSearch(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  const html = await r.text();
  const m = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if (!m) return [];
  let data;
  try { data = JSON.parse(m[1]); } catch { return []; }
  // YouTube can return results under different structures — try each path
  const sectionList =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ??
    data?.contents?.sectionListRenderer?.contents ??
    [];

  const items = [];

  // Collect video renderers from both itemSectionRenderer and richGridRenderer layouts
  const videoRenderers = [];
  for (const section of sectionList) {
    // Standard layout
    for (const item of (section?.itemSectionRenderer?.contents ?? [])) {
      if (item?.videoRenderer) videoRenderers.push(item.videoRenderer);
    }
    // Rich grid layout (used on some YouTube variants)
    for (const item of (section?.richItemRenderer?.content ? [section.richItemRenderer] : [])) {
      if (item?.content?.videoRenderer) videoRenderers.push(item.content.videoRenderer);
    }
    for (const item of (section?.richGridRenderer?.contents ?? [])) {
      const v = item?.richItemRenderer?.content?.videoRenderer;
      if (v) videoRenderers.push(v);
    }
  }

  for (const v of videoRenderers) {
      if (!v?.videoId) continue;
      const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || '';
      const channel = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || '';
      const durationStr = v.lengthText?.simpleText || '';
      const thumbnail = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
      if (!title || !durationStr) continue;
      if (SKIP_KEYWORDS.test(title)) continue;
      const secs = parseDuration(durationStr);
      if (secs > 900 || secs < 30) continue;
      items.push({ videoId: v.videoId, title, channel, duration: durationStr, thumbnail });
  }
  return items;
}

// GET /api/music/search?q=don+moen
router.get('/search', limiter, async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    // Run 3 searches in parallel with different angles to get more songs
    const [r1, r2, r3] = await Promise.all([
      ytSearch(q),
      ytSearch(`${q} official`),
      ytSearch(`${q} song`),
    ]);

    // Merge and deduplicate by videoId
    const seen = new Set();
    const results = [];
    for (const item of [...r1, ...r2, ...r3]) {
      if (!seen.has(item.videoId)) {
        seen.add(item.videoId);
        results.push(item);
        if (results.length >= 20) break;
      }
    }

    if (!results.length) return res.status(404).json({ error: 'No results found' });
    res.json({ results });

  } catch (err) {
    console.error('Music search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

function parseDuration(str) {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export default router;
