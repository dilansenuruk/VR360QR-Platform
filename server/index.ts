import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.ts'; // ensures the database is created/seeded before routes are registered
import { authRouter } from './routes/auth.ts';
import { videosRouter } from './routes/videos.ts';
import { qrRouter } from './routes/qr.ts';
import { statsRouter } from './routes/stats.ts';
import { usersRouter } from './routes/users.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  console.warn(
    'Warning: SESSION_SECRET is not set. Using a development-only default. ' +
      'Set SESSION_SECRET in your environment before using this outside local development.'
  );
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    name: 'vr360.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set to true if this is ever served over HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api', videosRouter);
app.use('/api', qrRouter);
app.use('/api', statsRouter);
app.use('/api', usersRouter);

// In production mode, serve the built frontend from the same process/port
// so the whole app runs as a single `node` process (no Vite dev server).
const distDir = path.join(__dirname, '..', 'dist');
if (isProduction && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`VR360 QR Platform API listening on http://localhost:${PORT}`);
});
