# AuraStream 🎵 - Production-Ready Music Streaming Application

AuraStream is a modern, high-performance music streaming and discovery web platform inspired by the information architecture and fluid user experience of top-tier streaming services, featuring its own distinctive obsidian and neon violet/cyan glassmorphism visual identity. Powered by YouTube for audio and video streaming, it features content-based personal recommendations, playlist management, listening history analytics, and seamless audio-to-video mode switching.

---

## 🌟 Key Features

- 🎧 **High-Fidelity Streaming**: Powered by YouTube with dual-mode playback:
  - **Audio Mode**: Ambient waveform visualizer, album artwork, and low-distraction audio listening.
  - **Video Mode**: Expandable cinema-mode YouTube video player with synced playback state.
- 🎯 **Taste Onboarding & Personalization**:
  - Interactive multi-genre onboarding upon registration.
  - Dynamically generated daily mixes ("Made For You") tailored to user interests.
  - "Jump Back In" queue based on playback history.
  - Contextual time-of-day greetings ("Good morning, Alex").
- 🔍 **Music Discovery & Real-Time Search**:
  - Instant debounced search querying local catalog and live YouTube search.
  - Filter chips for songs, videos, and playlists.
  - Curated genre tiles (Electronic, Lo-Fi, Synthwave, Pop, Hip-Hop, R&B, Rock, Ambient) and mood soundscapes (Focus, Chill, Workout, Party, Sleep, Gaming).
- 📜 **Lyrics & Queue Management**:
  - Interactive slide-over queue drawer with play-next, reorder, and remove capabilities.
  - Integrated lyrics drawer with synced track presentation.
- 📚 **Personal Library & Playlists**:
  - Create and manage custom playlists with cover artwork and privacy toggles (Public/Private).
  - One-click track addition to any custom playlist.
  - Liked Songs collection with instant heart toggling and shuffle playback.
- 📊 **Listening History & Analytics**:
  - Chronological playback history tracking time listened and total streams.
  - User stats dashboard: Top genres, listening hours, and total play counts.
- 🛡️ **Admin Console**:
  - Platform overview: Registered users, catalog tracks, total playlists, stream count.
  - User management table with role badges and account moderation.
- 🔒 **Enterprise-Grade Security**:
  - JWT authentication with access token & refresh token rotation in `HttpOnly`, `SameSite=Lax` cookies.
  - Passwords hashed with bcrypt (salt rounds 12).
  - Rate limiting on API endpoints, auth routes, and search.
  - Input validation via Zod schemas.
  - Security headers enforced with Helmet.
  - Parameterized SQL queries preventing SQL injection.

---

## 🛠️ Technology Stack

### Monorepo Structure
```
Music/
├── backend/                  # Node.js + TypeScript REST API (Cloudflare D1 & Worker compatible)
│   ├── src/
│   │   ├── config/           # Environment validation (Zod) & Winston logger
│   │   ├── database/         # D1/SQLite adapter, schema.sql, and seed data
│   │   ├── middleware/       # JWT auth, RBAC, Zod validation, rate limiting, error handling
│   │   ├── modules/          # Feature modules (auth, users, youtube, music, playlists, favorites, history, recommendations, analytics, admin)
│   │   ├── routes/           # Central API v1 routing
│   │   ├── utils/            # JWT tokens, bcrypt password hashing, standard responses
│   │   ├── types/            # TypeScript interfaces
│   │   ├── app.ts            # Express application setup
│   │   ├── server.ts         # Local Node.js development server
│   │   └── worker.ts         # Cloudflare Worker entrypoint with D1 database binding
│   ├── tests/                # Automated Jest integration tests
│   ├── wrangler.toml         # Cloudflare Workers & D1 deployment configuration
│   └── package.json
│
├── frontend/                 # React.js + TypeScript + Vite SPA (Netlify ready)
│   ├── src/
│   │   ├── components/       # Reusable UI, layout, music rows/cards, and player components
│   │   ├── features/         # AuthModal, OnboardingInterestsModal
│   │   ├── pages/            # Home, Search, Library, Playlist, TrackDetail, Favorites, History, Admin
│   │   ├── routes/           # React Router DOM configuration
│   │   ├── services/         # Axios client with interceptors and feature API services
│   │   ├── store/            # Zustand stores (PlayerStore, AuthStore, UIStore)
│   │   ├── types/            # TypeScript models
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── netlify.toml          # Netlify SPA redirect & security headers configuration
│   ├── tailwind.config.js    # Aura obsidian & neon styling system
│   └── package.json
│
├── package.json              # Monorepo orchestration scripts
└── README.md
```

### Backend
- **Runtime**: Node.js & Cloudflare Workers (`nodejs_compat`)
- **Language**: TypeScript
- **Framework**: Express.js REST API
- **Database**: Cloudflare D1 / SQLite (`better-sqlite3` locally, `env.DB` on Cloudflare)
- **Authentication**: JWT (Access + Refresh Token rotation) + bcrypt password hashing
- **Validation**: Zod
- **Security**: Helmet, CORS, Express Rate Limit
- **Audio Provider**: YouTube Data API v3 + `yt-search` scraper fallback

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom obsidian glassmorphism theme
- **Icons**: Lucide React
- **Routing**: React Router DOM (v6)
- **State Management**: Zustand (Global audio/video player, auth session, UI modals)
- **Server State**: TanStack React Query (caching, optimistic updates, background refetch)
- **HTTP Client**: Axios with automatic 401 refresh token interceptor
- **Player**: YouTube IFrame API Bridge

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js >= 18 (Node.js 22 recommended)
- npm >= 9

### 1. Installation
Install all monorepo dependencies:
```bash
npm run install:all
```
*(Or run `npm install` inside `backend/` and `frontend/` individually)*

### 2. Environment Setup
The repository includes preconfigured `.env` files for immediate local development:

`backend/.env`:
```env
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
DB_PATH=./data/aurastream.db
JWT_ACCESS_SECRET=aurastream_super_secret_jwt_access_token_32chars_min
JWT_REFRESH_SECRET=aurastream_super_secret_jwt_refresh_token_32chars_min
CLIENT_URL=http://localhost:5173
YOUTUBE_API_KEY=  # Optional: app uses high-fidelity yt-search fallback automatically
```

`frontend/.env`:
```env
VITE_API_URL=/api/v1
```

### 3. Seed Database
Seed curated tracks, sample playlists, admin, and demo accounts:
```bash
npm run seed --prefix backend
```

**Default Accounts**:
- **Admin Account**:
  - Email: `admin@aurastream.io`
  - Password: `AdminPassword123!`
- **Demo User**:
  - Email: `demo@aurastream.io`
  - Password: `Password123!`

### 4. Running the Development Servers
Start both backend and frontend concurrently:
```bash
npm run dev
```

Or run them individually:
```bash
# Terminal 1: Backend (http://127.0.0.1:5000)
npm run dev --prefix backend

# Terminal 2: Frontend (http://127.0.0.1:5173)
npm run dev --prefix frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## 🧪 Running Automated Tests

Run the complete backend integration test suite:
```bash
npm test --prefix backend
```

**Test Coverage**:
- `auth.test.ts`: User registration, password hashing verification, duplicate prevention, JWT issuance, refresh rotation, profile retrieval.
- `music.test.ts`: Health check, category and genre discovery, trending tracks listing.
- `playlist.test.ts`: Creating playlists, adding tracks, authorization checks, owner-only deletion.

---

## ☁️ Deployment Guide

### Deploying the Backend to Cloudflare
The backend is ready to deploy to Cloudflare Workers with Cloudflare D1.

1. Create a Cloudflare D1 database:
   ```bash
   npx wrangler d1 create aurastream-db
   ```
2. Paste your `database_id` into `backend/wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "aurastream-db"
   database_id = "<your-d1-database-id-here>"
   ```
3. Run the schema migrations on your Cloudflare D1 database:
   ```bash
   npx wrangler d1 execute aurastream-db --file=src/database/schema.sql
   ```
4. Deploy the worker:
   ```bash
   npm run deploy --prefix backend
   ```

### Deploying the Frontend to Netlify
The frontend includes a preconfigured `frontend/netlify.toml` for zero-configuration Netlify deployment.

1. In the Netlify dashboard, connect your Git repository.
2. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: URL of your deployed backend (e.g. `https://aurastream-backend.<your-subdomain>.workers.dev/api/v1`)
4. Click **Deploy site**!

---

## 🔒 Security & Privacy Practices

- **Strict CORS**: Origin whitelist restricted to authorized frontend domains.
- **Content Security Policy**: Hardened with Helmet, whitelisting only trusted YouTube IFrame sources.
- **Rate Limiting**: Tiered limits across general API (200 req/15m), auth endpoints (25 req/15m), and search (60 req/1m).
- **Token Security**: Refresh tokens stored in `HttpOnly`, `SameSite=Lax` cookies, rotated on every refresh.
- **Zero Raw innerHTML**: Safe React JSX native escaping across all components.

---

## 📄 License
MIT License. Built for advanced web development and music streaming.
