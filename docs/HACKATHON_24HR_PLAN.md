# Habit Rabbit - 24-Hour Hackathon Execution Plan

## Overview
This document provides a **realistic, hour-by-hour breakdown** for building Habit Rabbit in 24 hours. The plan prioritizes **visual impact** and **core functionality** over perfection.

**Total Time**: 24 Hours  
**Break Time**: 3 hours (meals + rest)  
**Actual Coding**: 21 hours  
**Deployment Buffer**: 2 hours  

---

## Phase 1: Foundation (Hours 0-6)
**Goal**: Backend infrastructure + Database + Auth working

### Hour 0-1: Project Setup & Environment
**Tasks**:
- [ ] Create project structure (folders from MASTER_ARCHITECTURE.md)
- [ ] Initialize backend: `npm init -y`
- [ ] Install dependencies:
  ```bash
  npm install express mongoose bcryptjs jsonwebtoken cors helmet dotenv
  npm install --save-dev nodemon
  ```
- [ ] Create `.env` file with MongoDB URI and JWT secret
- [ ] Setup MongoDB Atlas cluster (15 min)
- [ ] Test connection

**Output**: Project scaffolded, dependencies installed, DB connected

**Time Check**: If MongoDB setup takes > 30 min, use local MongoDB or JSON file fallback

---

### Hour 1-2: Database Models
**Tasks**:
- [ ] Create `backend/models/User.js`
  ```javascript
  // Fields: email, passwordHash, createdAt
  // Validation: unique email
  ```
- [ ] Create `backend/models/Task.js`
  ```javascript
  // Fields: userId, title, isActive, createdAt
  // Index: userId
  ```
- [ ] Create `backend/models/TaskCompletion.js`
  ```javascript
  // Fields: userId, taskId, date, completed
  // Index: userId, taskId, date
  // Unique constraint: userId + taskId + date
  ```
- [ ] Test model creation with sample data in MongoDB Compass

**Output**: 3 models defined, tested, indexed

---

### Hour 2-4: Authentication System
**Tasks**:
- [ ] Create `backend/middleware/authMiddleware.js`
  - JWT verification
  - Extract user from token
  - Attach to `req.user`
  
- [ ] Create `backend/controllers/authController.js`
  - `register()` - hash password, create user, return JWT
  - `login()` - verify password, return JWT
  
- [ ] Create `backend/routes/auth.js`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  
- [ ] Add routes to `server.js`
- [ ] Test with Postman:
  - Register user → should return token
  - Login → should return token
  - Login with wrong password → should fail

**Output**: Auth endpoints working, JWT generation verified

**Critical**: Don't move forward until auth works perfectly

---

### Hour 4-6: Task CRUD Endpoints
**Tasks**:
- [ ] Create `backend/controllers/taskController.js`:
  - `createTask()` - create new task for user
  - `getTodaysTasks()` - fetch tasks + today's completion status
  - `toggleCompletion()` - mark/unmark completed for today
  - `deleteTask()` - soft delete (set isActive=false) or hard delete
  
- [ ] Create `backend/routes/tasks.js`:
  - `POST /api/tasks` - protected
  - `GET /api/tasks/today` - protected
  - `PUT /api/tasks/:id/complete` - protected
  - `DELETE /api/tasks/:id` - protected
  
- [ ] Implement **today's task logic**:
  ```javascript
  // For each task, join with TaskCompletion where date = today
  // If no completion record exists, completed = false
  ```

**Output**: Full CRUD working, tasks scoped to logged-in user

**Test Checklist**:
- [ ] Create task → appears in database
- [ ] Get today's tasks → returns user's tasks only
- [ ] Toggle completion → creates/updates TaskCompletion record
- [ ] Delete task → removes or deactivates task

---

## Phase 2: Frontend Core (Hours 6-14)
**Goal**: Auth page + Dashboard + Task list working

### Hour 6-8: Auth Page (HTML/CSS/JS)
**Tasks**:
- [ ] Create `frontend/index.html`:
  - Login form (email, password, submit)
  - Register form (email, password, confirm password, submit)
  - Toggle between login/register
  
- [ ] Create `frontend/css/auth.css`:
  - Gradient background
  - Centered card design
  - Input styling (focus states, borders)
  - Button hover effects
  - NO BOOTSTRAP - custom CSS only
  
- [ ] Create `frontend/js/auth.js`:
  - Form submission handlers
  - Call `/api/auth/register` and `/api/auth/login`
  - Store JWT in `localStorage`
  - Redirect to `dashboard.html` on success
  - Display error messages
  
- [ ] Create `frontend/js/api.js`:
  ```javascript
  const API_BASE = 'http://localhost:5000/api';
  
  function getToken() { return localStorage.getItem('token'); }
  
  async function apiCall(endpoint, method, body) {
    // Centralized API call with auth header
  }
  ```

**Output**: Beautiful auth page, working login/register

**Visual Check**: Must look professional, not default HTML

---

### Hour 8-10: Dashboard Structure (HTML/CSS)
**Tasks**:
- [ ] Create `frontend/dashboard.html`:
  ```html
  <header>
    <h1>Habit Rabbit</h1>
    <button id="logout">Logout</button>
  </header>
  
  <main>
    <!-- Task Input Section -->
    <section id="task-input">
      <input id="new-task" placeholder="New habit...">
      <button id="add-task">Add</button>
    </section>
    
    <!-- Today's Tasks Section -->
    <section id="today-tasks">
      <h2>Today's Habits</h2>
      <div id="task-list"></div>
      <p id="progress-text">0% Complete</p>
    </section>
    
    <!-- Analytics Section (Hidden by default) -->
    <section id="analytics" style="display:none;">
      <button id="toggle-analytics">Show Progress</button>
      <div id="progress-chart"></div>
      <div id="heatmap"></div>
    </section>
  </main>
  ```
  
- [ ] Create `frontend/css/dashboard.css`:
  - Clean header with logout button
  - Task cards with shadows
  - Checkbox styling (custom, not default)
  - Grid/flexbox layout
  - Mobile responsive (media queries)
  
**Output**: Dashboard layout complete, styled, responsive

---

### Hour 10-12: Dashboard Logic (JavaScript)
**Tasks**:
- [ ] Create `frontend/js/dashboard.js`:
  - **On page load**:
    - Check if token exists (if not, redirect to login)
    - Fetch today's tasks: `GET /api/tasks/today`
    - Render task list
    - Calculate and display progress percentage
    
  - **Add task**:
    - Call `POST /api/tasks` with title
    - Append to DOM dynamically
    - Clear input field
    
  - **Toggle completion**:
    - Click checkbox → Call `PUT /api/tasks/:id/complete`
    - Update UI (change card color, strike-through text)
    - Recalculate progress percentage
    - Animate change
    
  - **Delete task**:
    - Confirm dialog: "Delete task only" or "Delete with history"
    - Call `DELETE /api/tasks/:id?deleteHistory=true/false`
    - Remove from DOM
    
  - **Logout**:
    - Clear `localStorage`
    - Redirect to `index.html`

**Output**: Full task management working in browser

**Test Checklist**:
- [ ] Add task → appears instantly
- [ ] Check task → visual feedback + API call
- [ ] Uncheck task → reverts state
- [ ] Delete task → removed from list
- [ ] Logout → redirected to login

---

### Hour 12-14: Task Card Styling & Animations
**Tasks**:
- [ ] Style completed tasks:
  ```css
  .task-card.completed {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }
  ```
  
- [ ] Add CSS animations:
  - Checkbox check animation (scale + fade)
  - Task card appear animation (slide in)
  - Completion celebration (pulse effect)
  
- [ ] Add progress bar animation:
  ```html
  <div class="progress-bar">
    <div class="progress-fill" style="width: 60%"></div>
  </div>
  ```

**Output**: Smooth, satisfying UI interactions

**Visual Check**: Must feel polished, not janky

---

## Phase 3: Analytics & Visualization (Hours 14-20)
**Goal**: Progress graph + Heatmap working

### Hour 14-16: Analytics Backend
**Tasks**:
- [ ] Create `backend/controllers/analyticsController.js`:
  - `getDailyProgress()`
    - Query TaskCompletion for user
    - Group by date
    - Calculate completion % per day
    - Return array: `[{ date, percentage, completed, total }]`
    - Support query param: `?range=7d|30d|6m`
  
  - `getTaskHeatmap(taskId)`
    - Query TaskCompletion for specific task
    - Return array: `[{ date, completed }]`
    - Last 6 months only
    
- [ ] Create `backend/routes/analytics.js`:
  - `GET /api/analytics/progress?range=7d`
  - `GET /api/analytics/heatmap/:taskId`
  
- [ ] Test endpoints in Postman with sample data

**Output**: Analytics endpoints returning correct data

---

### Hour 16-18: Progress Graph (Chart.js)
**Tasks**:
- [ ] Add Chart.js CDN to `dashboard.html`:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  ```
  
- [ ] Create `frontend/js/charts.js`:
  ```javascript
  function renderProgressChart(data) {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Daily Progress %',
          data: data.map(d => d.percentage),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });
  }
  ```
  
- [ ] Wire up "Show Progress" button:
  - Fetch data: `GET /api/analytics/progress?range=7d`
  - Render chart
  - Toggle visibility

**Output**: Working line graph showing daily completion trends

---

### Hour 18-20: Heatmap Visualization
**Tasks**:
- [ ] **Option A**: Use `cal-heatmap` library (faster)
  - Add CDN link
  - Configure calendar layout
  - Map data to color intensity
  
- [ ] **Option B**: Custom CSS grid (more control)
  ```html
  <div class="heatmap-grid">
    <!-- Generate divs for each day -->
    <div class="day" data-date="2026-02-01" style="background: #10b981"></div>
    ...
  </div>
  ```
  
  ```css
  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .day {
    width: 20px;
    height: 20px;
    background: #e5e7eb;
  }
  .day.completed { background: #10b981; }
  ```
  
- [ ] Create `frontend/js/heatmap.js`:
  - Fetch heatmap data for clicked task
  - Render calendar grid
  - Color code: Green intensity based on completion
  
- [ ] Add click handler on task cards to show heatmap

**Output**: Interactive heatmap showing task history

**Time Saver**: If heatmap is complex, simplify to show last 30 days only

---

## Phase 4: Polish & Deployment (Hours 20-24)
**Goal**: Production-ready deployment

### Hour 20-21: UI Polish & Final Touches
**Tasks**:
- [ ] Add loading states:
  - Skeleton loaders for task list
  - Spinner during API calls
  
- [ ] Add empty states:
  - "No tasks yet! Add your first habit" message
  - "Not enough data" for analytics
  
- [ ] Add error handling:
  - Toast notifications for errors
  - Failed API call retry
  
- [ ] Mobile responsiveness check:
  - Test on Chrome DevTools (iPhone, iPad)
  - Fix any layout breaks
  
- [ ] Add favicon and logo (optional but nice)

**Output**: Professional, bug-free UI

---

### Hour 21-22: Backend Deployment (Railway/Render)
**Tasks**:
- [ ] Create `package.json` start script:
  ```json
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js"
  }
  ```
  
- [ ] Create `.gitignore`:
  ```
  node_modules/
  .env
  .DS_Store
  ```
  
- [ ] Push code to GitHub
  
- [ ] Deploy to Railway:
  1. Connect GitHub repo
  2. Add environment variables (MONGODB_URI, JWT_SECRET)
  3. Deploy
  4. Note deployed URL
  
- [ ] Test deployed backend with Postman

**Output**: Backend live at `https://your-app.railway.app`

---

### Hour 22-23: Frontend Deployment (Vercel)
**Tasks**:
- [ ] Update `frontend/js/api.js`:
  ```javascript
  const API_BASE = 'https://your-backend.railway.app/api';
  ```
  
- [ ] Configure CORS in backend:
  ```javascript
  app.use(cors({
    origin: 'https://your-frontend.vercel.app',
    credentials: true
  }));
  ```
  
- [ ] Deploy frontend to Vercel:
  1. Drag & drop `frontend/` folder to Vercel dashboard
  2. Deploy
  3. Note frontend URL
  
- [ ] Update CORS origin in backend with actual Vercel URL
- [ ] Redeploy backend

**Output**: Full app live and accessible

---

### Hour 23-24: Testing & Demo Preparation
**Tasks**:
- [ ] End-to-end testing:
  - Register new user
  - Add 3 tasks
  - Complete 2 tasks
  - View progress graph
  - View heatmap
  - Logout and login again
  
- [ ] Seed demo data (if needed):
  - Create script to add sample tasks
  - Generate historical completion data for impressive heatmap
  
- [ ] Prepare demo script:
  1. Show auth (register/login)
  2. Add tasks live
  3. Complete tasks (show animation)
  4. Open analytics
  5. Explain heatmap visualization
  
- [ ] Create README.md:
  - Project description
  - Tech stack
  - Live demo link
  - Screenshots
  - Setup instructions

**Output**: Demo-ready application + presentation materials

---

## Milestone Checklist

### Must-Have (Non-Negotiable)
- [x] User registration & login working
- [x] Create tasks
- [x] Mark tasks as completed
- [x] Today's task list displays correctly
- [x] Data persists across sessions
- [x] Deployed and accessible online

### Should-Have (Core Features)
- [x] Daily progress calculation
- [x] Progress graph (Chart.js)
- [x] Task deletion (with history option)
- [x] Mobile responsive
- [x] Custom, non-Bootstrap styling

### Nice-to-Have (Time Permitting)
- [ ] Heatmap visualization
- [ ] Animations and micro-interactions
- [ ] Loading states
- [ ] Empty states
- [ ] Dark mode toggle

---

## Time Management Rules

### Speed Hacks
1. **Reuse Code**: Copy working auth patterns from previous projects
2. **Use CDNs**: No webpack, no build tools
3. **Skip Perfection**: 80% polished is enough
4. **Timebox Features**: Max 2 hours per major feature
5. **Test As You Go**: Don't accumulate bugs

### When to Pivot
| Situation | Action |
|-----------|--------|
| MongoDB connection failing (>1 hour) | Use local MongoDB or JSON file storage |
| Chart.js not working (>30 min) | Show simple percentage text only |
| Heatmap too complex (>2 hours) | Skip it, focus on graph |
| Deployment issues (>1 hour) | Use Express to serve frontend (monolithic) |
| Auth bugs (>1 hour) | Simplify: Remove JWT, use session with `express-session` |

### Energy Management
- **Hour 0-8**: High energy → Backend heavy lifting
- **Hour 8-16**: Medium energy → Frontend building
- **Hour 16-20**: Low energy → Visual polish (less thinking)
- **Hour 20-24**: Second wind → Testing & deployment

**Breaks**:
- Hour 4: 15 min break
- Hour 8: 1 hour meal
- Hour 14: 15 min break
- Hour 20: 30 min meal

---

## Decision Matrix (During Hackathon)

### When Stuck on a Feature
Ask yourself:
1. **Does this affect the demo?** (No → skip)
2. **Can I show it visually?** (No → deprioritize)
3. **Is it in the PRD?** (No → definitely skip)
4. **Can I fake it?** (Yes → mock data is fine)

### Priority Tiers
**P0 (Must work for demo)**:
- Login/Register
- Add task
- Complete task
- Task list display

**P1 (Strong demo enhancement)**:
- Progress graph
- Custom styling
- Mobile responsive

**P2 (Impressive but optional)**:
- Heatmap
- Animations
- Advanced analytics

---

## Common Pitfalls & Solutions

### Issue 1: CORS Errors
**Symptom**: Frontend can't call backend  
**Fix**:
```javascript
app.use(cors({ origin: '*' })); // Quick fix for hackathon
```

### Issue 2: JWT Token Not Sent
**Symptom**: Protected routes return 401  
**Fix**:
```javascript
// api.js
headers: {
  'Authorization': `Bearer ${getToken()}`
}
```

### Issue 3: Date Timezone Bugs
**Symptom**: Today's tasks show yesterday's data  
**Fix**:
```javascript
// Use UTC consistently
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
```

### Issue 4: Task Not Updating in UI
**Symptom**: Click checkbox, nothing happens  
**Fix**:
```javascript
// After API call, manually update DOM
taskCard.classList.add('completed');
```

### Issue 5: Deployment Environment Variables
**Symptom**: App works locally, crashes deployed  
**Fix**:
- Verify environment variables set in Railway/Vercel
- Use `process.env.PORT || 5000` for port

---

## Success Criteria (Judges' Perspective)

### Technical (40%)
- ✅ Full-stack implementation (frontend + backend + database)
- ✅ Authentication working
- ✅ Data persistence
- ✅ RESTful API design
- ✅ Code organization

### Visual Design (30%)
- ✅ Custom UI (not default Bootstrap)
- ✅ Smooth animations
- ✅ Color scheme and typography
- ✅ Mobile responsive
- ✅ Visual feedback on actions

### Innovation (20%)
- ✅ Heatmap visualization (unique)
- ✅ Historical data approach
- ✅ Progress graph
- ✅ Daily reset logic (no cron)

### Presentation (10%)
- ✅ Live demo works flawlessly
- ✅ Clear explanation of features
- ✅ Compelling problem statement
- ✅ Future vision articulated

---

## Final Pre-Launch Checklist

### Code Quality
- [ ] No `console.log()` in production code
- [ ] No hardcoded credentials
- [ ] Error handling on all API calls
- [ ] Input validation

### User Experience
- [ ] All buttons have hover states
- [ ] Loading indicators during API calls
- [ ] Error messages are user-friendly
- [ ] Success feedback after actions

### Performance
- [ ] No unnecessary re-renders
- [ ] API calls debounced (if applicable)
- [ ] Images optimized (if any)
- [ ] MongoDB queries indexed

### Deployment
- [ ] Environment variables set
- [ ] CORS configured correctly
- [ ] Backend URL updated in frontend
- [ ] Both services accessible
- [ ] HTTPS enabled (automatic with Railway/Vercel)

---

## Post-Hackathon Tasks (Future)

### Immediate (Next Week)
- Add email verification
- Implement password reset
- Add task categories
- Habit streak tracking

### Short-term (Next Month)
- Push notifications
- Social features (friends, leaderboards)
- Data export (CSV/PDF)
- Theme customization

### Long-term (Next Quarter)
- Mobile app (React Native)
- AI-powered habit recommendations
- Integration with wearables (Fitbit, Apple Watch)
- Gamification (levels, achievements)

---

## Motivational Checkpoint

**Remember**:
- ✨ A working demo beats perfect code
- 🎨 Visual impact > Complex features
- 🚀 Deployed > Local-only
- 💪 Consistent progress > Sprint-burnout
- 🎯 Focus on the story you're telling

**You got this! 🐰**

---

**Status**: ✅ Execution Plan Ready  
**Last Updated**: February 21, 2026  
**Estimated Completion**: 22-23 hours (with breaks)
