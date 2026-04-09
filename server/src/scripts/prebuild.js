/**
 * Pre-generates historical context for every verse in the Bible.
 * Uses the Batches API + Claude Haiku for max efficiency (~$10-15 total).
 * Run with: node src/scripts/prebuild.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { buildContextPrompt } from '../utils/promptBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../../cache/context-cache.json');
const PROGRESS_FILE = path.join(__dirname, '../../cache/prebuild-progress.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// All 66 books with chapter counts
const BOOKS = [
  { id: 'GEN', name: 'Genesis', chapters: 50 },
  { id: 'EXO', name: 'Exodus', chapters: 40 },
  { id: 'LEV', name: 'Leviticus', chapters: 27 },
  { id: 'NUM', name: 'Numbers', chapters: 36 },
  { id: 'DEU', name: 'Deuteronomy', chapters: 34 },
  { id: 'JOS', name: 'Joshua', chapters: 24 },
  { id: 'JDG', name: 'Judges', chapters: 21 },
  { id: 'RUT', name: 'Ruth', chapters: 4 },
  { id: '1SA', name: '1 Samuel', chapters: 31 },
  { id: '2SA', name: '2 Samuel', chapters: 24 },
  { id: '1KI', name: '1 Kings', chapters: 22 },
  { id: '2KI', name: '2 Kings', chapters: 25 },
  { id: '1CH', name: '1 Chronicles', chapters: 29 },
  { id: '2CH', name: '2 Chronicles', chapters: 36 },
  { id: 'EZR', name: 'Ezra', chapters: 10 },
  { id: 'NEH', name: 'Nehemiah', chapters: 13 },
  { id: 'EST', name: 'Esther', chapters: 10 },
  { id: 'JOB', name: 'Job', chapters: 42 },
  { id: 'PSA', name: 'Psalms', chapters: 150 },
  { id: 'PRO', name: 'Proverbs', chapters: 31 },
  { id: 'ECC', name: 'Ecclesiastes', chapters: 12 },
  { id: 'SNG', name: 'Song of Solomon', chapters: 8 },
  { id: 'ISA', name: 'Isaiah', chapters: 66 },
  { id: 'JER', name: 'Jeremiah', chapters: 52 },
  { id: 'LAM', name: 'Lamentations', chapters: 5 },
  { id: 'EZK', name: 'Ezekiel', chapters: 48 },
  { id: 'DAN', name: 'Daniel', chapters: 12 },
  { id: 'HOS', name: 'Hosea', chapters: 14 },
  { id: 'JOL', name: 'Joel', chapters: 3 },
  { id: 'AMO', name: 'Amos', chapters: 9 },
  { id: 'OBA', name: 'Obadiah', chapters: 1 },
  { id: 'JON', name: 'Jonah', chapters: 4 },
  { id: 'MIC', name: 'Micah', chapters: 7 },
  { id: 'NAH', name: 'Nahum', chapters: 3 },
  { id: 'HAB', name: 'Habakkuk', chapters: 3 },
  { id: 'ZEP', name: 'Zephaniah', chapters: 3 },
  { id: 'HAG', name: 'Haggai', chapters: 2 },
  { id: 'ZEC', name: 'Zechariah', chapters: 14 },
  { id: 'MAL', name: 'Malachi', chapters: 4 },
  { id: 'MAT', name: 'Matthew', chapters: 28 },
  { id: 'MRK', name: 'Mark', chapters: 16 },
  { id: 'LUK', name: 'Luke', chapters: 24 },
  { id: 'JHN', name: 'John', chapters: 21 },
  { id: 'ACT', name: 'Acts', chapters: 28 },
  { id: 'ROM', name: 'Romans', chapters: 16 },
  { id: '1CO', name: '1 Corinthians', chapters: 16 },
  { id: '2CO', name: '2 Corinthians', chapters: 13 },
  { id: 'GAL', name: 'Galatians', chapters: 6 },
  { id: 'EPH', name: 'Ephesians', chapters: 6 },
  { id: 'PHP', name: 'Philippians', chapters: 4 },
  { id: 'COL', name: 'Colossians', chapters: 4 },
  { id: '1TH', name: '1 Thessalonians', chapters: 5 },
  { id: '2TH', name: '2 Thessalonians', chapters: 3 },
  { id: '1TI', name: '1 Timothy', chapters: 6 },
  { id: '2TI', name: '2 Timothy', chapters: 4 },
  { id: 'TIT', name: 'Titus', chapters: 3 },
  { id: 'PHM', name: 'Philemon', chapters: 1 },
  { id: 'HEB', name: 'Hebrews', chapters: 13 },
  { id: 'JAS', name: 'James', chapters: 5 },
  { id: '1PE', name: '1 Peter', chapters: 5 },
  { id: '2PE', name: '2 Peter', chapters: 3 },
  { id: '1JN', name: '1 John', chapters: 5 },
  { id: '2JN', name: '2 John', chapters: 1 },
  { id: '3JN', name: '3 John', chapters: 1 },
  { id: 'JUD', name: 'Jude', chapters: 1 },
  { id: 'REV', name: 'Revelation', chapters: 22 },
];

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

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch {}
  return { completedBatches: [], failedKeys: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function fetchChapter(bookId, chapter) {
  const bookName = BOOK_URL_NAMES[bookId];
  const url = `https://bible-api.com/${bookName}+${chapter}?verse_numbers=true&translation=kjv`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed: ${bookId} ${chapter}`);
  const data = await resp.json();
  return data.verses || [];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🕊️  Bible in Context — Pre-generation Script');
  console.log('=============================================');

  const cache = loadCache();
  const progress = loadProgress();
  const existingKeys = new Set(Object.keys(cache));

  console.log(`✅ Already cached: ${existingKeys.size} verses`);

  // Step 1: Fetch all Bible text and build the list of verses to generate
  console.log('\n📖 Step 1: Fetching Bible text from bible-api.com...');
  const allVerses = []; // { key, bookId, bookName, chapter, verse, text }

  for (const book of BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        const verses = await fetchChapter(book.id, ch);
        for (const v of verses) {
          const key = `${book.id}:${ch}:${v.verse}`;
          if (!existingKeys.has(key)) {
            allVerses.push({
              key,
              bookId: book.id,
              bookName: book.name,
              chapter: ch,
              verse: v.verse,
              text: v.text.trim()
            });
          }
        }
        process.stdout.write(`\r  ${book.name} ch.${ch}/${book.chapters} — ${allVerses.length} new verses queued`);
        await sleep(200); // be gentle to the free API
      } catch (err) {
        console.error(`\n  ⚠️  Skipped ${book.id} ${ch}: ${err.message}`);
      }
    }
  }

  console.log(`\n\n✅ ${allVerses.length} verses need context generation`);

  if (allVerses.length === 0) {
    console.log('🎉 All verses already cached! Nothing to do.');
    return;
  }

  // Step 2: Submit in batches of 10,000 (API limit is 100,000)
  const BATCH_SIZE = 5000;
  const batches = [];
  for (let i = 0; i < allVerses.length; i += BATCH_SIZE) {
    batches.push(allVerses.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n⚡ Step 2: Submitting ${batches.length} batch(es) to Claude Haiku...`);
  console.log(`   Estimated cost: $${(allVerses.length * 0.00095).toFixed(2)}\n`);

  const batchIds = [];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`  Submitting batch ${b + 1}/${batches.length} (${batch.length} verses)...`);

    const requests = batch.map(v => ({
      custom_id: v.key,
      params: {
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: buildContextPrompt({
            bookName: v.bookName,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text
          })
        }]
      }
    }));

    const messageBatch = await client.messages.batches.create({ requests });
    batchIds.push({ id: messageBatch.id, verses: batch });
    console.log(`  ✅ Batch ${b + 1} submitted: ${messageBatch.id}`);

    saveProgress({ ...progress, pendingBatches: batchIds.map(b => b.id) });
  }

  // Step 3: Poll until all batches are done
  console.log('\n⏳ Step 3: Waiting for batches to complete...');
  console.log('   (This usually takes 5–30 minutes for the full Bible)\n');

  let allDone = false;
  while (!allDone) {
    allDone = true;
    let totalProcessed = 0;
    let totalSucceeded = 0;

    for (const { id } of batchIds) {
      const batch = await client.messages.batches.retrieve(id);
      if (batch.processing_status !== 'ended') {
        allDone = false;
        totalProcessed += batch.request_counts.processing || 0;
      }
      totalSucceeded += batch.request_counts.succeeded || 0;
    }

    process.stdout.write(`\r  Succeeded: ${totalSucceeded} | Still processing: ${totalProcessed}   `);

    if (!allDone) await sleep(15000); // check every 15s
  }

  // Step 4: Collect results and save to cache
  console.log('\n\n💾 Step 4: Saving results to cache...');

  for (const { id, verses } of batchIds) {
    const verseMap = Object.fromEntries(verses.map(v => [v.key, v]));

    for await (const result of await client.messages.batches.results(id)) {
      if (result.result.type === 'succeeded') {
        const block = result.result.message.content.find(b => b.type === 'text');
        if (block) {
          cache[result.custom_id] = block.text.trim();
        }
      } else {
        console.warn(`\n  ⚠️  Failed: ${result.custom_id} — ${result.result.type}`);
      }
    }
  }

  saveCache(cache);

  console.log(`\n🎉 Done! ${Object.keys(cache).length} total verses cached.`);
  console.log(`   Cache saved to: ${CACHE_FILE}`);
  console.log('\n   Every verse in your Bible now loads instantly! ✨');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
