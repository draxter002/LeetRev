# LeetRevision

Personal LeetCode tracker with multi-track spaced-repetition revisions. Built with Next.js, Tailwind CSS, and Supabase.

## Features

- **Home** — today’s revision queue (including overdue/missed tracks, highlighted separately from high priority)
- **Solved** — stats ring, expandable problem list, add/edit with Brute / Better / Optimal notes
- **Profile** — timezone for day boundaries, public LeetCode username stats (GraphQL, best-effort)
- Independent revision tracks per interval; completing late does **not** drift the cadence (`next = scheduled + interval`)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run the migration in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
3. Authentication → Providers → enable **Email** (disable “Confirm email” for solo use if you want instant signup)
4. Copy **Project URL** and **anon public** key from Settings → API

### 2. Local env

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, then add problems from **Solved**.

## Deploy (Vercel)

1. Push the repo and import into Vercel
2. Set the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
3. Deploy

In Supabase → Authentication → URL Configuration, add your Vercel URL to **Site URL** and **Redirect URLs**.

## Scheduling notes

For intervals `[5, 12]` solved on day 0:

| Track | Due sequence |
|-------|----------------|
| 5-day | 5, 10, 15, 20… |
| 12-day | 12, 24, 36… |

If the 5-day track is due on day 5 but completed on day 6, the next due is still day **10** (5 + 5), not day 11.

Missed items stay on Home (red left border + “Missed” badge) until checked off.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase Auth + Postgres (RLS per user)
- TanStack React Query
- `react-syntax-highlighter` for solution display
