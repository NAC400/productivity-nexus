# Productivity Nexus — Technical Guide

> A plain-English explanation of every part of the app for non-developers.
> Version 1.3 · Last updated March 2026

---

## What Kind of App Is This?

Productivity Nexus is a **desktop app** — it runs on your computer like Spotify or Discord, not in a browser tab. It is built using a combination of three technologies working together:

1. **The window** (what you see) — built with React + Electron
2. **The brain** (logic and data) — built with Node.js + Express
3. **The memory** (storing your projects, tasks, scores) — stored in a local SQLite database file on your computer

All three run on your own machine. No cloud server is required to run the app (except when calling the AI, which requires an internet connection).

---

## The Technology Stack (Plain English)

| Technology | What It Is | Why We Use It |
|------------|------------|---------------|
| **Electron** | Wraps a web app into a desktop window | Lets us ship a .exe / .dmg app that looks and feels like a game client |
| **React** | JavaScript library for building UI | Makes it easy to build interactive screens that update live |
| **Vite** | Build tool / dev server | Makes development fast — live-reloads the UI when you save a file |
| **Tailwind CSS** | CSS styling framework | Lets us style components with short class names instead of writing raw CSS |
| **Node.js** | JavaScript runtime outside the browser | Runs our backend server (the "brain") |
| **Express** | Web server framework for Node.js | Handles API requests from the frontend |
| **sql.js** | SQLite database in pure JavaScript | Stores all your data in a file on your computer — no installation needed |
| **Gemini 2.0 Flash** | Google's free AI model | Generates tasks, scores submissions, powers the AI chat |
| **dotenv** | Environment variable loader | Reads your `.env` file so the app knows your API key |
| **UUID** | Unique ID generator | Creates unique IDs for every user, project, task, etc. |

---

## File Structure — What Every Folder and File Does

```
productivity-nexus/
│
├── main.js                    ← Electron: creates the app window, starts the backend
├── preload.js                 ← Electron: secure bridge between frontend and system
├── package.json               ← Lists all dependencies and npm scripts
├── .env                       ← YOUR SECRET KEYS (never commit this to git)
├── .env.example               ← Template showing what .env should contain
├── vite.config.js             ← Tells Vite how to build the React frontend
├── tailwind.config.js         ← Tailwind color theme (nexus-bg, nexus-accent, etc.)
│
├── DOCUMENTATION.md           ← Business plan and product vision (this project)
├── TECHNICAL_GUIDE.md         ← This file
│
└── src/
    ├── backend/               ← The "brain" — Node.js Express server
    │   ├── server.js          ← Entry point: starts Express, loads routes, inits DB
    │   ├── database/
    │   │   ├── db.js          ← Database connection + sql.js compatibility wrapper
    │   │   └── schema.sql     ← SQL that defines all database tables
    │   ├── routes/            ← Each file handles one group of API endpoints
    │   │   ├── users.js       ← Login, register, leaderboard, user stats
    │   │   ├── projects.js    ← Create/read/update/delete projects
    │   │   ├── tasks.js       ← Generate tasks, start/abandon tasks, roadmap
    │   │   ├── scoring.js     ← Submit task, get AI score, award XP
    │   │   ├── friends.js     ← Send/accept friend requests, list friends
    │   │   ├── messages.js    ← Send messages, read conversation history
    │   │   └── ai.js          ← AI chat assistant, API connection test
    │   └── services/
    │       ├── claudeService.js   ← All calls to the Gemini AI API
    │       └── scoringService.js  ← Wraps claudeService for task submission scoring
    │
    └── renderer/              ← The "window" — React frontend
        ├── index.html         ← HTML shell that React mounts into
        ├── index.jsx          ← React entry point
        ├── App.jsx            ← Root component: routes, user context, global layout
        ├── hooks/
        │   └── useSettings.js ← Settings hook + playSound() function
        └── components/        ← Each file is one screen or reusable piece of UI
            ├── Onboarding.jsx     ← Login / register screen
            ├── TitleBar.jsx       ← Top bar with logo, user info, settings, sign out
            ├── Dashboard.jsx      ← Main screen with tabs: Nexus, Leaderboard, Social
            ├── ProjectSetup.jsx   ← Wizard for creating a new project
            ├── TaskView.jsx       ← Active task screen with timer, editor, hints
            ├── Results.jsx        ← Post-task score screen
            ├── Leaderboard.jsx    ← Global rankings table
            ├── FriendChat.jsx     ← Friend list + chat window
            ├── Profile.jsx        ← User profile with avatar and stats
            ├── Settings.jsx       ← Settings page (audio, API, account)
            ├── AIChat.jsx         ← Floating AI assistant panel
            ├── RankBadge.jsx      ← Small reusable rank icon component
            └── XPBar.jsx          ← XP progress bar component
```

---

## The Backend — How It Works

The backend is an **Express web server** running on port **3001** on your own computer. The frontend (the React window) communicates with it by sending HTTP requests to `http://localhost:3001/api/...`.

### How the server starts
1. `main.js` (Electron) opens the window and forks `server.js` as a background process.
2. `server.js` loads your `.env` file (reads your API keys), initializes the database, then mounts all routes.
3. The app becomes usable once the server is ready.

### The API Endpoints (What the backend can do)

**Users** (`/api/users/...`)
- `POST /register` — create a new account
- `POST /login` — sign in with username + password
- `GET /leaderboard` — get all users sorted by XP
- `GET /:id/stats` — get a specific user's stats
- `PUT /:id/xp` — add XP to a user after completing a task

**Projects** (`/api/projects/...`)
- `POST /` — create a new project with all setup details
- `GET /user/:userId` — list all projects for a user
- `GET /:id` — get one project's full details + task counts
- `DELETE /:id` — delete a project

**Tasks** (`/api/tasks/...`)
- `POST /generate` — ask the AI to generate the next task for a project
- `GET /project/:projectId` — list all tasks for a project
- `GET /project/:projectId/roadmap` — get the AI-generated roadmap steps
- `PUT /:id/start` — mark a task as "in progress"
- `PUT /:id/abandon` — abandon a task (−50 XP)

**Scoring** (`/api/scoring/...`)
- `POST /submit` — submit task text → AI scores it → awards XP → checks achievements

**Friends** (`/api/friends/...`)
- `GET /?user_id=` — list accepted friends
- `GET /pending?user_id=` — list incoming friend requests
- `POST /request` — send a friend request
- `PUT /accept` — accept a friend request

**Messages** (`/api/messages/...`)
- `GET /conversation/:friendId?user_id=` — get chat history with a friend
- `POST /send` — send a message
- `GET /unread-count?user_id=` — count unread messages

**AI** (`/api/ai/...`)
- `POST /chat` — send a message to the AI assistant, get a reply
- `GET /test` — test that the Gemini API key is working

---

## The Database — What Data We Store

The database is a single file stored at:
```
C:\Users\[your-username]\.productivity-nexus\data.db
```
It is a **SQLite** database — a single file that works like a spreadsheet with multiple tables. You do not need to install any database software.

### Tables

**`users`** — one row per account
- `id` (unique identifier), `username`, `password_hash` (encrypted), `xp`, `rank`, `created_at`

**`projects`** — one row per project you create
- `id`, `user_id`, `title`, `goal`, `type` (short/long/ongoing), `publication_venue`, `deadline`
- `working_hours_per_day`, `outline`, `phase` (kickoff/early/mid/late/final/complete)
- `roadmap_json` — the full AI-generated roadmap stored as JSON text
- `roadmap_generated` — 0 or 1, whether the roadmap has been generated yet

**`tasks`** — one row per task generated
- `id`, `project_id`, `user_id`, `title`, `description`, `deliverable`
- `difficulty` (Bronze/Silver/Gold/Platinum/Diamond), `xp_reward`, `estimated_minutes`
- `status` (pending/active/completed/abandoned)
- `hints_json` — array of AI-generated hints for this task, stored as JSON text

**`task_submissions`** — one row per submitted task
- `id`, `task_id`, `user_id`, `submission_text`
- `grammar_score`, `idea_score`, `execution_score`, `pace_multiplier`, `xp_earned`
- `feedback_json` — the AI's written feedback for each score axis

**`friends`** — one row per friendship (pending or accepted)
- `id`, `requester_id`, `addressee_id`, `status` (pending/accepted/rejected)

**`messages`** — one row per chat message
- `id`, `sender_id`, `receiver_id`, `content`, `read` (0 or 1), `sent_at`

**`achievements`** — one row per achievement unlocked
- `id`, `user_id`, `achievement_key`, `title`, `description`, `unlocked_at`

---

## The AI Integration — How Gemini Is Used

All AI calls go through `src/backend/services/claudeService.js`. Every function calls the **Gemini 2.0 Flash** model via Google's API.

### What the AI does

**1. Generate a project roadmap** (`generateRoadmap`)
- Called once when you request your first task for a new project.
- Given your project title, goal, timeline, and outline, it returns a structured list of 6–15 steps.
- Each step has: a title, description, what to write (deliverable), how long it should take, and which phase (research/writing/review/polish).
- This roadmap is saved to your project so tasks follow it in order.

**2. Generate a task** (`generateTask`)
- Called every time you press "Generate Task".
- Uses your project context + current roadmap step + recent task history.
- Returns: task title, description, deliverable, estimated time, difficulty, XP reward, and 4–5 custom hints.

**3. Score a submission** (`scoreSubmission`)
- Called when you submit your written work.
- Evaluates your text on three axes (Writing Quality, Idea Quality, Execution), each 0–100.
- Returns scores + 1–2 sentences of specific feedback for each axis.
- If you submit gibberish, the AI is instructed to score 0–20 across all axes.

**4. AI Chat** (`chatWithAI` in `ai.js`)
- Powers the floating AI assistant.
- Has a system prompt that tells it it's helping a Productivity Nexus user with research and writing.
- Takes conversation history so it remembers earlier messages in your session.

### The API Key
The AI requires a **Gemini API key** from Google AI Studio (aistudio.google.com). It is free and gives approximately 1,500 requests per day.

Your key lives in the `.env` file at the project root:
```
GEMINI_API_KEY=your_key_here
```
**This file must never be committed to GitHub.** It is listed in `.gitignore` to prevent accidental uploads.

---

## How to Set Up and Run the App

### First-time setup
1. Install Node.js (v18 or higher) from nodejs.org
2. Open a terminal in the project folder
3. Copy `.env.example` to `.env`: `cp .env.example .env`
4. Edit `.env` and paste your Gemini API key
5. Run `npm install` (downloads all dependencies — takes 2–5 minutes)
6. Run `npm run dev` to start the app

### Every time after
```
npm run dev
```
This starts both the React dev server (Vite on port 5173) and the Electron window simultaneously.

### Building for distribution
```
npm run build
```
Creates a distributable installer in the `dist/` folder.

---

## How to Get a Gemini API Key (Free)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with a Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key and paste it into your `.env` file as `GEMINI_API_KEY=...`
5. The free tier gives ~1,500 requests/day and 1M tokens/day (more than enough for personal use)

---

## Security Notes

- Your `.env` file contains secret API keys. **Never share it, post it online, or commit it to GitHub.**
- The `.gitignore` file tells git to ignore `.env` automatically.
- If a key is ever accidentally committed to GitHub, immediately go to your Google AI Studio dashboard and delete/regenerate it. GitHub detects exposed keys and sends alerts.
- Your database file (`~/.productivity-nexus/data.db`) contains your personal data. It is stored locally on your machine only.
- Passwords are stored as hashed values (not plain text) — the original password cannot be recovered from the database.

---

## Future Technical Plans

| Feature | Technical approach |
|---------|-------------------|
| Cloud sync | Supabase (PostgreSQL + auth) to sync the local DB across devices |
| Real-time friend activity | Socket.io for live "friend is currently working on X" status |
| Mobile companion | React Native app that shows XP/rank, sends notifications |
| Offline mode | Full task generation cache so you can work without internet |
| Web version | Next.js + same backend, hosted on Vercel / Railway |
| LMS integration | REST webhooks that push scores to Canvas/Blackboard |

---

*This guide is maintained alongside the codebase. If you add a new component or route, add a line here.*
