# VR360 QR Platform

A video/QR code management platform built for use alongside a VR application (Meta Quest 3 / Unity).
Admins manage a library of videos; users generate QR codes that encode a stable video code plus a
unique per-generation tracking ID, which the Unity app later scans and parses.

**Stack:** React + TypeScript + Vite, Tailwind CSS, a small Node.js + Express API, SQLite (built
into Node.js itself -- no extra database software to install), `qrcode`, `recharts`, `lucide-react`.
Every one of these is free and open-source. There is no cloud account, Docker, or external service
of any kind involved -- everything runs as plain `node` processes on your own machine.

---

## 1. How the pieces fit together

- **Frontend** (`src/`): a React app that calls a small REST API for everything -- it never touches
  the database directly.
- **Backend** (`server/`): a single Express server. It owns the SQLite database file, hashes
  passwords, manages login sessions, handles thumbnail uploads, and is the **real** security
  boundary: every admin-only action is checked with `requireAdmin` middleware on the server
  (`server/middleware.ts`), so a regular user cannot perform it no matter what the frontend does or
  what URL they type. The frontend also hides admin-only UI and redirects away from admin routes,
  but that's a convenience layer, not the actual enforcement.
- **Database**: a single SQLite file at `server/data/app.db`, created and seeded automatically the
  first time you start the server. SQLite is part of Node.js itself (the `node:sqlite` module) --
  nothing extra to install or run.
- **QR codes**: never store the video itself. They only encode `VIDEO_CODE-TRACKING_ID` (e.g.
  `00001-7K4P9X2M`). The existing VR/Unity app is responsible for locating and playing the actual
  video file using that code.

---

## 2. Prerequisites

1. **Node.js version 22.5 or later** (this project uses Node's built-in SQLite support, which needs
   a fairly recent version). Download from https://nodejs.org. To check your version:
   ```
   node --version
   ```
2. **A code editor**, e.g. [VS Code](https://code.visualstudio.com/) (free).

That's it -- no database software, no Docker, no cloud account.

---

## 3. Install dependencies

From the project folder in a terminal:

```
npm install
```

---

## 4. Run the app

```
npm run dev
```

This starts **both** the frontend (Vite, on `http://localhost:5173`) and the backend API (Express,
on `http://localhost:3001`) together, in one terminal. The first time it runs, the backend
automatically:

- creates `server/data/app.db` (the SQLite database) with all tables, indexes, and constraints,
- seeds the two initial accounts (see below).

No demo videos are added -- the video library starts empty, ready for you to add your own from
Admin > Videos.

Open **http://localhost:5173** in your browser.

(If you ever want to run just one side: `npm run dev:web` for the frontend alone, or
`npm run dev:server` for the backend alone.)

---

## 5. The initial accounts

Two accounts are created automatically the first time the server starts -- no manual setup step
needed:

| Username | Password | Role  |
|----------|----------|-------|
| `admin`  | `admin`  | admin |
| `user`   | `user`   | user  |

Passwords are hashed with bcrypt in the database (`server/data/app.db`) -- never stored in plain
text, and never present in any frontend code.

To add more accounts, the simplest way for now is directly in the database (there's no "create
user" UI, since the spec calls for a small set of controlled accounts). Stop the server, then run:

```
npx tsx -e "
import { db, newId } from './server/db.ts';
import bcrypt from 'bcryptjs';
db.prepare('INSERT INTO profiles (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
  .run(newId(), 'newusername', bcrypt.hashSync('their-password', 10), 'user', new Date().toISOString());
console.log('done');
"
```
(Change `'user'` to `'admin'` for an admin account.)

---

## 6. Test the accounts

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

## 7. Resetting the data

To wipe everything and start over (fresh accounts, empty video library), stop the server and delete
the database file and any uploaded thumbnails:

```
rm -rf server/data server/uploads/*
```

(On Windows, just delete the `server/data` folder and the contents of `server/uploads` in File
Explorer.) They'll be recreated automatically next time you run `npm run dev`.

---

## 8. Building for production

Not required for local/personal use -- `npm run dev` is all you need day-to-day. If you ever want a
single optimized process serving both the built frontend and the API on one port:

```
npm run build
npm start
```

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

server/               Backend (Node.js + Express + SQLite)
  db.ts               Database schema, atomic video-code sequence, initial seeding
  middleware.ts        requireAuth / requireAdmin -- the real authorization boundary
  routes/             auth, videos, qr, stats, users endpoints
  data/               The SQLite database file (created automatically, gitignored)
  uploads/            Uploaded thumbnail images (created automatically, gitignored)
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
