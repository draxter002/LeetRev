# 🚀 LeetRevision

> **Master LeetCode with Spaced Repetition.**  
> Track your solved problems, maintain active streaks, and schedule smart revision intervals so you never forget a solution again.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🧠 **Spaced Repetition Engine**  
  Automatically schedules periodic revision reminders (e.g. after 5, 12, 30 days). The algorithm maintains a strict cadence from your scheduled date so your review cycle never drifts even if you review late.

- 🔑 **1-Click LeetCode Cookie Sync**  
  Import **100% of your solved LeetCode problems** in seconds using your browser's `LEETCODE_SESSION` cookie. Saves your cookie privately to your profile for 1-click updates anytime.

- 📋 **Bulk Paste Import**  
  Paste a raw text list of problem titles to import multiple problems at once with pre-seeded revision schedules.

- 🔥 **Smart Streak Tracking**  
  - **Home Page**: Displays your **Current Streak** with a live flame badge 🔥.  
  - **Profile Page**: Tracks your **Longest Streak** 🏆.  
  - **Rest-Day Protection**: Days without any scheduled revisions do *not* break your streak!

- 📊 **Retention Analytics & Graphs**  
  Visual dual-ring progress charts tracking total solved problems and your active revision retention percentage, along with top topic breakdowns.

- 💡 **3-Tier Solution Notebook**  
  Save code implementations and time/space complexity notes for **Brute Force**, **Better**, and **Optimal** solutions for every problem.

- ⏸️ **Turn Off Revision (Pause Problem)**  
  Pause revision for specific problems anytime. Disabled problems won't clutter your daily queue, and retention charts adjust automatically.

- ✉️ **Daily Email Reminders**  
  Optional automated email reminders sent directly to your inbox with a link to today's revision queue. *Smart condition: emails are only sent on days when you actually have due revisions.*

- 🔒 **Enterprise-Grade Security**  
  Built on Supabase Row-Level Security (RLS) and HttpOnly session cookies. Your solved problems and notes are 100% private to your account.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Actions) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + RLS + Auth) |
| **State & Caching** | [TanStack React Query v5](https://tanstack.com/query) |
| **Email Service** | [Resend API](https://resend.com/) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- A free [Supabase](https://supabase.com/) account

### 1. Clone the repository

```bash
git clone https://github.com/your-username/leet-revision.git
cd leet-revision
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Email reminders & feedback delivery
RESEND_API_KEY=re_your_resend_api_key
FEEDBACK_RECIPIENT_EMAIL=your-email@example.com
```

### 4. Database Setup (Supabase Migrations)

Run the SQL migration scripts in order in your Supabase SQL Editor (`supabase/migrations/`):

1. `001_initial.sql` — Base tables (`problems`, `revision_entries`)
2. `002_profiles.sql` — User profiles
3. `003_solutions.sql` — Solution code storage
4. `004_leetcode_slug.sql` — LeetCode integration metadata
5. `005_nullable_priority.sql` — Priority defaults
6. `006_leetcode_session_cookie.sql` — Persistent session cookie
7. `007_feedback.sql` — User feedback table
8. `008_email_reminders.sql` — Email reminder preferences
9. `009_revision_disabled.sql` — Revision toggle state

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 How to Sync LeetCode Problems (15 Seconds)

1. Log into [LeetCode](https://leetcode.com) in your web browser.
2. Press <kbd>F12</kbd> (or right-click → **Inspect**) to open Developer Tools.
3. Navigate to **Application** (or Storage) → **Cookies** → `https://leetcode.com`.
4. Double-click and copy the value of `LEETCODE_SESSION`.
5. Open **Profile** in LeetRevision, paste the cookie, and click **Save & Sync All Problems**.

---

## 📂 Project Structure

```
leet-revision/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── page.tsx            # Home (Daily Revision Queue & Streak)
│   │   ├── solved/             # Solved Problems list & analytics
│   │   ├── profile/            # Profile, Cookie Sync & Settings
│   │   ├── feedback/           # User feedback form
│   │   └── api/                # Backend API routes
│   │       ├── account/delete  # Account hard deletion API
│   │       ├── feedback/       # Feedback processing & email
│   │       ├── leetcode/       # Authenticated LeetCode import API
│   │       ├── profile/        # Profile settings API
│   │       └── reminders/send  # Email reminder dispatcher API
│   ├── components/             # Reusable UI components
│   └── lib/                    # Scheduling algorithms & Supabase clients
├── supabase/
│   └── migrations/             # SQL database migrations
├── PROJECT_EXPLANATION.txt     # Detailed architectural breakdown
└── README.md
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
