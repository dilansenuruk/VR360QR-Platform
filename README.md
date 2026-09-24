# VR360 QR Platform

A video/QR code management platform built for use alongside a VR application (Meta Quest 3 / Unity).
Admins manage a library of videos; users generate QR codes that encode a stable video code plus a
unique per-generation tracking ID, which the Unity app later scans and parses.

**Stack:** React + TypeScript + Vite, Tailwind CSS, a small Node.js + Express API, Postgres (hosted
free on [Neon](https://neon.tech)), `qrcode`, `recharts`, `lucide-react`. Every one of these is free.
Deployed to [Vercel](https://vercel.com) (also free for this scale of project).

---

## 1. How the pieces fit together

- **Frontend** (`src/`): a React app that calls a small REST API for everything -- it never touches
  the database directly.
- **Backend** (`server/`): a small Express app. It hashes passwords, issues/verifies login tokens,
  handles thumbnail uploads, and is the **real** security boundary: every admin-only action is
  checked with `requireAdmin` middleware on the server (`server/middleware.ts`), so a regular user
  cannot perform it no matter what the frontend does or what URL they type. The frontend also hides
  admin-only UI and redirects away from admin routes, but that's a convenience layer, not the actual
  enforcement.
- **Database**: Postgres, hosted for free on Neon. The same database is used for local development
  and for the deployed app (there's no separate local database) -- one connection string
  (`DATABASE_URL`), used everywhere.
- **Thumbnails**: stored directly in the database as binary data and served through
  `/api/thumbnails/:id`, rather than as files on disk. This matters because Vercel's serverless
  functions don't have a persistent local disk -- anything written to disk there disappears after
  the request finishes.
- **Login sessions**: a signed token (JWT) stored in an `httpOnly` cookie -- the browser can't read
  it via JavaScript, and the server verifies its signature on every request. This is used instead of
  a traditional server-side session because Vercel runs the backend as independent, short-lived
  function calls that don't share memory with each other.
- **QR codes**: never store the video itself. They only encode `VIDEO_CODE-TRACKING_ID` (e.g.
  `00001-7K4P9X2M`). The existing VR/Unity app is responsible for locating and playing the actual
  video file using that code.

---

## 2. Prerequisites

1. **Node.js version 18 or later**. Download from https://nodejs.org. Check with:
   ```
   node --version
   ```
2. **A code editor**, e.g. [VS Code](https://code.visualstudio.com/) (free).
3. **A free Neon account** -- https://neon.tech (no credit card needed). This hosts the Postgres
   database, for local development and production alike.
4. **A free Vercel account** -- https://vercel.com -- only needed when you get to deployment
   (Section 9). Signing in with your GitHub account is the easiest option.
5. **A GitHub account** (or another git host) if you want to push this project to git, which
   Vercel deploys from.

---

## 3. Create your Neon database

1. Go to https://neon.tech, sign up, and create a new project (any name/region is fine).
2. On the project dashboard, find the **Connection string**. Use the **pooled** connection (its
   hostname usually contains `-pooler`) -- this matters once deployed, since a serverless backend
   opens many short-lived connections and the pooled connection handles that gracefully.
3. Copy that connection string -- you'll need it in the next step.

You don't need to create any tables yourself -- the app creates its own schema automatically the
first time it connects (see `server/db.ts`).

---

## 4. Configure environment variables

1. In the project folder, copy `.env.example` to a new file named `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in:
   ```
   DATABASE_URL=the-connection-string-you-copied-from-neon
   JWT_SECRET=some-long-random-string
   ```
   Generate a `JWT_SECRET` with:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Save the file. `.env` is already excluded from git (see `.gitignore`) so it's never committed.

---

## 5. Install dependencies and run locally

```
npm install
npm run dev
```

This starts **both** the frontend (Vite, on `http://localhost:5173`) and the backend API (Express,
on `http://localhost:3001`) together, in one terminal. The first time it connects to your Neon
database, it automatically creates all tables and seeds the two initial accounts (see below).

Open **http://localhost:5173** in your browser.

(If you ever want to run just one side: `npm run dev:web` for the frontend alone, or
`npm run dev:server` for the backend alone.)

---

## 6. The initial accounts

Two accounts are created automatically the first time the app connects to your database:

| Username | Password | Role  |
|----------|----------|-------|
| `admin`  | `admin`  | admin |
| `user`   | `user`   | user  |

Passwords are hashed with bcrypt in the database -- never stored in plain text, and never present
in any frontend code. Change these passwords (or add real accounts) before giving anyone else access
to a deployed copy of this app -- see the next section.

To add more accounts, the simplest way for now is directly against the database (there's no
"create user" UI, since the spec calls for a small set of controlled accounts):

```
npx tsx --env-file-if-exists=.env -e "
import { pool, newId } from './server/db.ts';
import bcrypt from 'bcryptjs';
await pool.query(
  'INSERT INTO profiles (id, username, password_hash, role, created_at) VALUES (\$1,\$2,\$3,\$4,\$5)',
  [newId(), 'newusername', bcrypt.hashSync('their-password', 10), 'user', new Date().toISOString()]
);
console.log('done');
process.exit(0);
"
```
(Change `'user'` to `'admin'` for an admin account.) This works against whichever database your
`.env` currently points at -- local or deployed. Run it from a bash-like shell (Git Bash, macOS/Linux
terminal, WSL); the `\$` escaping shown here is specific to bash.

---

## 7. Test the accounts

**As `user` / `user`:**
- Log in, browse the video grid, search by name/code.
- Click "Generate QR Code" on a video -- a modal appears with the QR image, payload
  (`VIDEOCODE-TRACKINGID`), and Download/Print buttons.
- Visit "My QR Generations" -- see your own history only.
- Try navigating directly to `/admin/videos` in the address bar -- you'll be redirected back to the
  dashboard. Even if you called the API directly, the server would reject it with 403 Forbidden.

**As `admin` / `admin`:**
- See the dashboard stats (Total Videos, Total QR Codes generated, Today, This Month) and charts.
- Add a video (name, description, optional thumbnail) -- note the auto-assigned code.
- Edit a video, delete (soft-delete) a video, confirm the confirmation dialog.
- Open "QR Generation History" -- search/filter by video, tracking ID, date range, and user.
- Open "Statistics" -- see QR counts per video; click a row to jump to its filtered history.

---

## 8. Resetting the data

To wipe everything and start over (fresh accounts, empty video library), open your Neon project's
**SQL Editor** (in the Neon dashboard) and run:

```sql
TRUNCATE qr_generations, videos, profiles;
UPDATE video_code_counter SET next_value = 1;
```

Everything will be recreated (fresh accounts, empty video list, codes starting at `00001` again)
the next time the app starts or receives a request.

---

## 9. Putting this in git and deploying to Vercel

**Push to git:**
```
git init
git add .
git commit -m "Initial commit"
```
Then create a new (empty) repository on GitHub and follow its instructions to push this repo to it
(`git remote add origin <url>`, `git branch -M main`, `git push -u origin main`).

**Deploy on Vercel:**
1. Go to https://vercel.com, sign in (GitHub sign-in is simplest), and click **Add New > Project**.
2. Import the GitHub repository you just pushed.
3. Vercel will detect the Vite frontend automatically. Before deploying, open **Environment
   Variables** and add the same two variables from your `.env` file:
   - `DATABASE_URL` -- your Neon connection string
   - `JWT_SECRET` -- your random secret (use a *different* one than local, ideally)
4. Click **Deploy**. Vercel builds the frontend (`npm run build`) and deploys the API
   (`api/index.ts`) as a serverless function automatically -- both `vercel.json` and `api/index.ts`
   in this repo are already set up for this, no extra configuration needed.
5. Once deployed, open the URL Vercel gives you and log in with the same accounts as local
   (`admin`/`admin`, `user`/`user`) -- they live in the same Neon database.

Every future `git push` to your main branch redeploys automatically.

**Before sharing the deployed link with anyone:** change the default admin/user passwords (Section
6 shows how to update the database directly), since `admin`/`admin` is not a secret once this code
is public.

---

## Project structure

```
src/                  Frontend (React + TypeScript)
  components/         Reusable UI building blocks (VideoCard, QRModal, Sidebar, forms, tables, ...)
  pages/              One file per screen, grouped by auth/user/admin
  layouts/            AppLayout - the sidebar + content shell for logged-in pages
  services/           API calls, grouped by domain (auth, videos, qr, stats)
  hooks/              useAuth (session/role state), useQrGeneration (generate-QR flow)
  lib/                Small fetch() wrapper for calling the API
  types/              Shared TypeScript types matching the database schema
  utils/              Formatting, error messages, QR image generation

server/               Backend (Node.js + Express + Postgres)
  app.ts              Express app setup (middleware + routes) -- no .listen() here
  index.ts            Local dev entry point (calls app.listen())
  db.ts               Database schema, atomic video-code sequence, initial seeding
  middleware.ts       requireAuth / requireAdmin -- the real authorization boundary
  routes/             auth, videos, qr, stats, users endpoints

api/
  index.ts            Vercel entry point -- wraps server/app.ts as a serverless function

vercel.json           Routes /api/* to the serverless function, everything else to the frontend
```

## Permissions reference

| Action                     | User | Admin |
|-----------------------------|:----:|:-----:|
| View videos                 | ✅   | ✅    |
| Generate QR codes           | ✅   | ✅    |
| View own QR history         | ✅   | ✅    |
| Add / edit / delete videos  | ❌   | ✅    |
| View all QR history         | ❌   | ✅    |
| View statistics             | ❌   | ✅    |

Enforced both in the UI (hidden buttons, redirected routes) and on the server (every admin route is
wrapped in `requireAdmin` -- see `server/middleware.ts` and `server/routes/`).
