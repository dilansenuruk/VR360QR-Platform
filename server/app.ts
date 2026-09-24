import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireDb } from './middleware.ts';
import { authRouter } from './routes/auth.ts';
import { videosRouter } from './routes/videos.ts';
import { qrRouter } from './routes/qr.ts';
import { statsRouter } from './routes/stats.ts';
import { usersRouter } from './routes/users.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Ensures the database schema exists (and initial accounts are seeded)
// before any request is handled -- runs once per cold start, cached after.
app.use('/api', requireDb);

app.use('/api/auth', authRouter);
app.use('/api', videosRouter);
app.use('/api', qrRouter);
app.use('/api', statsRouter);
app.use('/api', usersRouter);

// Lets `npm start` (see server/index.ts) serve the built frontend from the
// same process/port for a simple single-process local run. On Vercel, the
// built frontend is served directly by the platform, so this code path is
// never hit there -- but it doesn't hurt to leave it in.
const distDir = path.join(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;
