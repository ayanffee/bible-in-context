import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import cors from 'cors';
import bibleRouter from './routes/bible.js';
import contextRouter from './routes/context.js';
import explainRouter from './routes/explain.js';
import didyouknowRouter from './routes/didyouknow.js';
import socialRouter from './routes/social.js';
import musicRouter from './routes/music.js';
import chatRouter from './routes/chat.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/bible', bibleRouter);
app.use('/api/context', contextRouter);
app.use('/api/explain', explainRouter);
app.use('/api/didyouknow', didyouknowRouter);
app.use('/api/social', socialRouter);
app.use('/api/music', musicRouter);
app.use('/api/chat', chatRouter);

export default app;
