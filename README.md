# 🐰 Habit Rabbit

> Build better habits, one day at a time

A beautiful habit tracking web application with GitHub-style contribution heatmaps, progress analytics, and streak tracking. Built with a dark iOS-inspired design system.

<!-- Screenshots placeholder: Replace with actual screenshots -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

---

## ✨ Features

- **Daily Habit Tracking** — Add habits, mark them complete with satisfying animations
- **Streak Tracking** — See your current consecutive-day streak
- **Progress Chart** — Line & bar chart showing completion trends (7 days / 30 days / 6 months)
- **GitHub-Style Heatmap** — 90-day contribution calendar per habit with month & weekday labels
- **Skeleton Loading** — Smooth loading states instead of blank screens
- **Character Counter** — Live input feedback with limit warnings
- **Delete Options** — Soft delete (keep history) or hard delete (remove everything)
- **Responsive Design** — Works on mobile, tablet, and desktop
- **JWT Authentication** — Secure register/login flow
- **Rate Limited Auth + AI** — Abuse protection for login/register and AI insights
- **Request Validation Layer** — Input schemas for write operations
- **Optimistic UI** — Instant feedback on task completion (reverts on API failure)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML / CSS / JS, Chart.js |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Design** | iOS-inspired dark theme, glassmorphism, SF Pro fonts |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18
- **MongoDB** running locally or a MongoDB Atlas connection string

### 1. Clone & Install

```bash
git clone <your-repo-url> habit-rabbit
cd habit-rabbit
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and frontend allowlist
```

### 3. (Optional) Seed Demo Data

Creates a demo user with 6 habits and 90 days of realistic history:

```bash
npm run seed
# Demo login: demo@habitrabbit.app / demo1234
```

### 4. Start the Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Open **http://localhost:5000** in your browser.

---

## 📁 Project Structure

```
habit-rabbit/
├── backend/
│   ├── config/db.js            # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Register, login, getMe
│   │   ├── taskController.js   # CRUD, toggle completion
│   │   └── analyticsController.js  # Progress, heatmap, stats
│   ├── middleware/authMiddleware.js # JWT verification
│   ├── models/
│   │   ├── User.js             # Email + hashed password
│   │   ├── Task.js             # Habit definition
│   │   └── TaskCompletion.js   # Daily completion records
│   ├── routes/                 # Express route files
│   ├── utils/seedData.js       # Demo data generator
│   └── server.js               # App entry point
├── frontend/
│   ├── assets/                 # SVG logos, favicon
│   ├── css/
│   │   ├── auth.css            # Login/Register page
│   │   └── dashboard.css       # Dashboard (900+ lines)
│   ├── js/
│   │   ├── api.js              # Fetch wrapper + token mgmt
│   │   ├── auth.js             # Auth page logic
│   │   └── dashboard.js        # Task mgmt + analytics
│   ├── index.html              # Auth page
│   └── dashboard.html          # Main dashboard
├── docs/                       # Architecture & spec docs
├── .env.example                # Environment template
├── Procfile                    # Heroku/Railway deploy
├── railway.toml                # Railway config
└── package.json
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, get JWT |
| GET  | `/api/auth/me` | Get current user |

### Tasks (🔒 Auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/starter-packs` | Get onboarding starter packs |
| POST | `/api/tasks/onboarding/setup` | Create starter habits for onboarding |
| PUT | `/api/tasks/onboarding/complete` | Mark onboarding as completed |
| POST | `/api/tasks` | Create habit |
| GET  | `/api/tasks/today` | Today's tasks + completion status |
| GET  | `/api/tasks` | All tasks |
| PUT  | `/api/tasks/:id/reminder` | Save task reminder settings |
| PUT  | `/api/tasks/:id/complete` | Toggle completion |
| PUT  | `/api/tasks/apply-priorities` | Apply AI priority ordering |
| PUT  | `/api/tasks/apply-skips` | Apply AI temporary pause actions |
| PUT  | `/api/tasks/apply-fallbacks` | Apply AI fallback habit conversions |
| DELETE | `/api/tasks/:id` | Delete (use `?deleteHistory=true` for hard delete) |

### Analytics (🔒 Auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/progress?range=7d` | Daily completion % (7d/30d/6m) |
| GET | `/api/analytics/heatmap/:taskId` | 6-month heatmap for a habit |
| GET | `/api/analytics/stats` | Total tasks, streak, completions |
| GET | `/api/analytics/weekly-plan` | Weekly plan with summary + recommendations |
| PUT | `/api/analytics/weekly-plan` | Save or update weekly plan |
| POST | `/api/analytics/ai-insights` | AI-generated priorities + coaching tips |
| GET | `/api/health` | Health check |

---

## 🚢 Deployment

### Railway (Recommended)

1. Push to GitHub
2. Connect repo in [Railway](https://railway.app)
3. Add MongoDB plugin (or use Atlas URI)
4. Set environment variables:
	`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URLS`, `JWT_ISSUER`, `JWT_AUDIENCE`
5. Optional hardening vars: `MAX_LOGIN_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES`, `LOGIN_ATTEMPT_WINDOW_MINUTES`
6. Deploy — Railway auto-detects the `Procfile`

### Render

1. Create a new **Web Service** pointing to your repo
2. **Build Command**: `npm install`
3. **Start Command**: `node backend/server.js`
4. Add env vars in the Render dashboard

---

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run seed` | Seed demo user + 90 days of data |
| `npm run verify:sprint1` | Run Sprint 1 verification suite |
| `npm run verify:sprint2` | Run Sprint 2 verification suite |
| `npm run verify:all` | Run Sprint 1 + Sprint 2 verification suites |

---

## 📄 License

MIT
