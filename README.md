# Sangati ✨

> **"Where interests meet people."** — Find your people. Create together.

Sangati is a modern, colorful, human, editorial social community platform centered around intentional interaction rather than follower counts, engagement manipulation, or endless scrolling.

$$\text{INTERESTS} \longrightarrow \text{ACTIVITIES} \longrightarrow \text{PEOPLE} \longrightarrow \text{CONNECTIONS} \longrightarrow \text{CONVERSATIONS} \longrightarrow \text{COLLABORATION}$$

---

## 🌟 Visual Philosophy & Aesthetics

Sangati is built on creative, human visual principles inspired by modern editorial design:
- **No Vanity Metrics**: No follower counts, no clout rankings, no "likes" counters.
- **Vibrant & Controlled Palette**: Rich Indigo (`#4f46e5`), Violet (`#7c3aed`), Pink (`#ec4899`), Amber (`#f59e0b`), Teal (`#14b8a6`), and Coral accents on a soft off-white background (`#fcfbfe`).
- **Activity Intent Identity**:
  - 🔨 **BUILD**: Creative productive visual treatment (Amber / Orange)
  - 🧠 **LEARN**: Knowledge curiosity visual treatment (Indigo / Purple)
  - 💬 **CONVERSATION**: Dialogue social visual treatment (Pink / Rose)
  - ✨ **EXPLORE**: Discovery adventure visual treatment (Teal / Emerald)
- **3-Column Asymmetric Layout**:
  - **Left**: Compact sidebar navigation with active pill highlights & unread notification badges.
  - **Center**: Primary editorial content stream (`Feed`, `Discover`, `Activity`, `Posts`, `Connections`, `Messages`, `Profile`).
  - **Right**: Contextual discovery widgets ("What are you up to today?", "Suggested People", "Trending Interest Chips").
- **Mobile Responsive**: Sleek top bar + fixed bottom navigation bar for effortless mobile exploration.

---

## 🏛️ System Architecture

```
                          INTERNET / BROWSER
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Next.js (3000)  │
                         │ App Router + UI │
                         └────────┬────────┘
                                  │
                        HTTPS (Bearer Token)
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ FastAPI (8000)  │
                         │   /api/v1/...   │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
         Auth Verify       Pydantic Valid.      Business Rules
        (Supabase JWT)     (RegEx, Schemas)    (Feed & Service)
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                           SQLAlchemy / ORM
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  PostgreSQL DB  │
                         │  (Supabase DB)  │
                         └─────────────────┘

Supabase Auth Flow:
Browser -> Supabase Auth -> Access Token (JWT) -> Sent to FastAPI in Authorization Header -> FastAPI verifies signature/claims -> Queries PostgreSQL.
```

> [!IMPORTANT]
> The browser **never** connects directly to PostgreSQL. FastAPI is the single source of truth for authorization, ownership verification, input sanitization, messaging rules, and data access.

---

## 📦 Features & Completed Modules

1. **Authentication & Profile**: Supabase Auth (email/password), custom username registration (`@handle`), bio, avatar URL, and interest tags.
2. **Activity Selection**: Set and switch your current active intent (`BUILD`, `LEARN`, `CONVERSATION`, `EXPLORE`).
3. **People Discovery**: Intent-matched discovery grid showing match reasons, active intent, and interest tags with 1-click connection actions.
4. **Connections System**: Mutual connection request flow (`Connect` $\rightarrow$ `Pending` $\rightarrow$ `Accept`/`Decline` $\rightarrow$ `Connected`).
5. **Activity Posts**: Share real-time posts tagged with activity types. Features post composer, filter tabs, edit, and deletion controls.
6. **Personalized Feed**: Transparent rule-based score ranking combining activity relevance ($+3$), connection status ($+3$), interest overlap ($+1$ per match), and exponential recency decay.
7. **Conversations & Messaging**: Private **1-to-1** and **small group** conversations between connected users with chronological message streams and active intent badges.
8. **Notifications Center**: Calm in-app notifications for `CONNECTION_REQUEST`, `CONNECTION_ACCEPTED`, and `NEW_MESSAGE` with unread badges and quick action links.
9. **Production Hardening & Vercel Readiness**: Environment configuration, CORS hardening, security & authorization audits, Alembic migrations, and Vercel monorepo deployment config (`vercel.json`).

---

## 💬 Group Conversations Architecture

Sangati supports both 1-to-1 and small group conversations seamlessly using the unified database architecture:
- `conversations`: Stores `id`, `title` (optional), `is_group` (boolean), `created_at`, `updated_at`, `last_message_at`.
- `conversation_participants`: Links `conversation_id` and `user_id`.
- `messages`: Stores `id`, `conversation_id`, `sender_id` (derived strictly from JWT), `content`, `created_at`.

### Group Security & Rules:
- Only mutual connected users can be added to a group conversation.
- Sender identity is derived strictly from the verified JWT token (`current_user.id`).
- Only conversation participants can view or send messages in a group.

---

## 📁 Project Structure

```
Social_Media_App/
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions (secrets, node_modules, .venv, .vercel)
├── vercel.json               # Vercel deployment monorepo routes
├── README.md                 # Project documentation
│
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── api/v1/           # Versioned API endpoints (/health, /profile, /activity, /discover, /connections, /posts, /feed, /conversations, /notifications)
│   │   ├── core/             # Config, Supabase JWT security, custom error handlers
│   │   ├── db/               # SQLAlchemy engine & session dependency
│   │   ├── models/           # PostgreSQL ORM models (Profile, Activity, Connection, Post, Conversation, Message, Notification)
│   │   ├── schemas/          # Pydantic request & response schemas
│   │   ├── services/         # Business logic layer & Feed Ranker
│   │   └── main.py           # FastAPI application entrypoint
│   ├── alembic/              # Database migration scripts (001 to 008)
│   ├── alembic.ini           # Alembic migration configuration
│   ├── .env.example          # Backend environment variable template
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # Automated pytest suite (52 test cases)
│
└── frontend/                 # Next.js TypeScript Frontend
    ├── src/
    │   ├── app/              # App router pages (/, /login, /signup, /profile, /feed, /discover, /activity, /connections, /messages, /notifications)
    │   ├── components/       # AppShell, PostComposer, PostCard, NotificationPopover, UI primitives
    │   ├── lib/              # Supabase browser client, API client, utils
    │   └── types/            # TypeScript data models
    ├── .env.example          # Frontend environment variable template
    ├── package.json          # Node dependencies
    ├── tailwind.config.ts    # Sangati design tokens & color system
    └── tsconfig.json         # TypeScript configuration
```

---

## 🚀 Quick Start Guide (Local Development)

### 1. Prerequisites
- **Node.js** >= 18
- **Python** >= 3.10
- A free [Supabase](https://supabase.com) project for PostgreSQL and Auth

---

### 2. Environment Variables Setup

Copy `.env.example` to `.env` in `backend/` and `frontend/`:

**Backend Environment (`backend/.env`)**:
```env
PROJECT_NAME="Sangati"
API_V1_STR="/api/v1"
ENVIRONMENT="development"
DATABASE_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
ALLOWED_ORIGINS="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
```

**Frontend Environment (`frontend/.env.local`)**:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

---

### 3. Backend Setup & Launch

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows PowerShell
# source .venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI dev server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API Root**: `http://127.0.0.1:8000`
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`

---

### 4. Frontend Setup & Launch

In a separate terminal:

```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js dev server
npm run dev
```

- **Web Application**: `http://localhost:3000`

---

## 🧪 Automated Testing

### Backend Test Suite (52 Test Cases)
Run the complete backend test suite covering authentication, ownership verification, connection lifecycle, feed ranker, notifications, and group conversations:

```bash
cd backend
.venv\Scripts\python.exe -m pytest -v
```
Output: `52 passed in 9.63s`

### Frontend Type Verification
Verify TypeScript type safety across all components:

```bash
cd frontend
npx tsc --noEmit
```
Output: `0 errors`

---

## 🌐 Vercel Production Deployment

### 1. Unified Deployment via `vercel.json`
The repository includes a root `vercel.json` configured for Vercel Monorepo deployment:
- **Frontend App**: Next.js builder (`@vercel/next`)
- **Backend API**: Python builder (`@vercel/python`) mapping `/api/v1/(.*)` to `backend/app/main.py`.

### 2. Vercel Environment Variables Configuration
In the Vercel Project Dashboard:
- Add `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS` for the backend.
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` for the frontend.
