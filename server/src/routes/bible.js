import { Router } from 'express';
import { fetchChapter } from '../services/bibleService.js';

const router = Router();

router.get('/:bookId/:chapter', async (req, res) => {
  const { bookId, chapter } = req.params;
  const chapterNum = parseInt(chapter, 10);

  if (!bookId || isNaN(chapterNum) || chapterNum < 1) {
    return res.status(400).json({ error: 'Invalid bookId or chapter' });
  }

  try {
    const translation = req.query.translation || 'kjv';
    const verses = await fetchChapter(bookId.toUpperCase(), chapterNum, translation);
    res.json({ bookId: bookId.toUpperCase(), chapter: chapterNum, verses });
  } catch (err) {
    console.error('Bible fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
