const BASE_URL = 'https://bible-api.com';

// bible-api.com book name mapping (it uses full names in URL)
const BOOK_URL_NAMES = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers',
  DEU: 'deuteronomy', JOS: 'joshua', JDG: 'judges', RUT: 'ruth',
  '1SA': '1+samuel', '2SA': '2+samuel', '1KI': '1+kings', '2KI': '2+kings',
  '1CH': '1+chronicles', '2CH': '2+chronicles', EZR: 'ezra', NEH: 'nehemiah',
  EST: 'esther', JOB: 'job', PSA: 'psalms', PRO: 'proverbs',
  ECC: 'ecclesiastes', SNG: 'song+of+solomon', ISA: 'isaiah', JER: 'jeremiah',
  LAM: 'lamentations', EZK: 'ezekiel', DAN: 'daniel', HOS: 'hosea',
  JOL: 'joel', AMO: 'amos', OBA: 'obadiah', JON: 'jonah',
  MIC: 'micah', NAH: 'nahum', HAB: 'habakkuk', ZEP: 'zephaniah',
  HAG: 'haggai', ZEC: 'zechariah', MAL: 'malachi',
  MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john',
  ACT: 'acts', ROM: 'romans', '1CO': '1+corinthians', '2CO': '2+corinthians',
  GAL: 'galatians', EPH: 'ephesians', PHP: 'philippians', COL: 'colossians',
  '1TH': '1+thessalonians', '2TH': '2+thessalonians', '1TI': '1+timothy',
  '2TI': '2+timothy', TIT: 'titus', PHM: 'philemon', HEB: 'hebrews',
  JAS: 'james', '1PE': '1+peter', '2PE': '2+peter', '1JN': '1+john',
  '2JN': '2+john', '3JN': '3+john', JUD: 'jude', REV: 'revelation'
};

const VALID_TRANSLATIONS = new Set(['kjv', 'web', 'darby', 'bbe']);

export async function fetchChapter(bookId, chapter, translation = 'kjv') {
  const bookName = BOOK_URL_NAMES[bookId.toUpperCase()];
  if (!bookName) throw new Error(`Unknown book ID: ${bookId}`);

  const t = VALID_TRANSLATIONS.has(translation) ? translation : 'kjv';
  const url = `${BASE_URL}/${bookName}+${chapter}?verse_numbers=true&translation=${t}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Bible API error: ${resp.status} for ${bookId} ${chapter}`);
  }

  const data = await resp.json();

  if (!data.verses || data.verses.length === 0) {
    throw new Error(`No verses found for ${bookId} ${chapter}`);
  }

  return data.verses.map(v => ({
    verse: v.verse,
    text: v.text.trim()
  }));
}
