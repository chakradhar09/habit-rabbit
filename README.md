# 🐰 Habit Rabbit

> Build better habits, one day at a time

A visual habit tracking web application designed for 24-hour hackathon development. Track daily habits, visualize progress through graphs and heatmaps, and maintain consistency with smart historical data preservation.

---

## 📋 Project Overview

**Habit Rabbit** helps users build and maintain consistent habits through:
- ✅ Daily task completion tracking
- 📊 Visual progress graphs
- 🗓️ Calendar heatmap visualization
- 📈 Historical data analytics
- 🎨 Clean, custom UI (no default Bootstrap)

**Development Timeline**: 24 Hours  
**Status**: Ready for Implementation  
**Target**: Hackathon MVP with impressive visual impact

---

## 🎯 Key Features

### Core Features (MVP)
- **User Authentication**: Secure registration and login with JWT
- **Task Management**: Create, complete, and delete habits
- **Daily Tracking**: Mark tasks complete with instant visual feedback
- **Progress Calculation**: Real-time completion percentage
- **Smart Daily Reset**: Automatic date-based reset without cron jobs

### Extended Features (Time Permitting)
- **Progress Graph**: Line chart showing completion trends (7d/30d/6m)
- **Task Heatmap**: Calendar visualization of individual habit consistency
- **Historical Insights**: View patterns and identify improvement areas

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styling (Tailwind-like utilities)
- **Vanilla JavaScript** - DOM manipulation & API calls
- **Chart.js** - Progress graph visualization
- **Cal-Heatmap** - Calendar heatmap (optional)

### Backend
- **Node.js** v18+ - Runtime environment
- **Express.js** v4.18+ - Web framework
- **JWT** - Stateless authentication
- **bcrypt** - Password hashing

### Database
- **MongoDB Atlas** - Cloud-hosted NoSQL database
- **Mongoose** - ODM for schema validation

### Deployment
- **Backend**: Railway / Render (recommended)
- **Frontend**: Vercel / Netlify
- **Database**: MongoDB Atlas Free Tier (M0)

---

## 📁 Project Structure

```
habit-rabbit/
│
├── docs/
│   ├── MASTER_ARCHITECTURE.md        # Complete system architecture
│   ├── HACKATHON_24HR_PLAN.md       # Hour-by-hour execution plan
│   ├── PRD_HACKATHON.md             # Product requirements (hackathon scope)
│   └── specs/
│       ├── API_SPEC.md              # Complete API documentation
│       └── DATABASE_SCHEMA.md       # MongoDB schema & models
│
├── backend/
│   ├── server.js                    # Entry point
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── models/
│   │   ├── User.js                  # User model
│   │   ├── Task.js                  # Task model
│   │   └── TaskCompletion.js        # Daily completion records
│   ├── routes/
│   │   ├── auth.js                  # Auth endpoints
│   │   ├── tasks.js                 # Task CRUD endpoints
│   │   └── analytics.js             # Analytics endpoints
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT verification
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   └── analyticsController.js
│   └── utils/
│       └── errorHandler.js          # Centralized error handling
│
├── frontend/
│   ├── index.html                   # Landing/Auth page
│   ├── dashboard.html               # Main app interface
│   ├── css/
│   │   ├── global.css               # Base styles
│   │   ├── auth.css                 # Auth page styles
│   │   └── dashboard.css            # Dashboard styles
│   ├── js/
│   │   ├── auth.js                  # Login/Register logic
│   │   ├── dashboard.js             # Main app logic
│   │   ├── api.js                   # API service layer
│   │   ├── charts.js                # Chart.js integration
│   │   └── heatmap.js               # Heatmap rendering
│   └── assets/
│       └── logo.svg                 # Branding
│
├── .env.example                     # Environment template
├── .gitignore
├── package.json
└── README.md                        # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ installed
- MongoDB Atlas account (free)
- Code editor (VS Code recommended)
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd habit-rabbit
```

### 2. Backend Setup
```bash
cd backend
npm install

# Install dependencies
npm install express mongoose bcryptjs jsonwebtoken cors helmet dotenv
npm install --save-dev nodemon
```

### 3. Environment Configuration
Create `.env` file in `backend/`:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key_here
PORT=5000
```

### 4. Database Setup
1. Create MongoDB Atlas cluster (see [DATABASE_SCHEMA.md](docs/specs/DATABASE_SCHEMA.md))
2. Create database user
3. Add connection string to `.env`
4. Whitelist IP: `0.0.0.0/0` (for development)

### 5. Start Backend
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 6. Start Frontend
```bash
cd ../frontend

# Option 1: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"

# Option 2: Using npx
npx serve .
```

### 7. Test Application
1. Open `http://localhost:5173` (or Live Server port)
2. Register new account
3. Create tasks
4. Mark tasks complete
5. View progress graph

---

## 📚 Documentation

### Core Documentation
- **[MASTER_ARCHITECTURE.md](docs/MASTER_ARCHITECTURE.md)** - Complete system design, tech decisions, data flow
- **[HACKATHON_24HR_PLAN.md](docs/HACKATHON_24HR_PLAN.md)** - Hour-by-hour execution guide
- **[PRD_HACKATHON.md](docs/PRD_HACKATHON.md)** - Product requirements, user stories, success criteria

### Technical Specifications
- **[API_SPEC.md](docs/specs/API_SPEC.md)** - All endpoints, request/response formats, examples
- **[DATABASE_SCHEMA.md](docs/specs/DATABASE_SCHEMA.md)** - MongoDB collections, models, relationships

---

## 🔑 Key Innovations

### 1. Smart Daily Reset
No cron jobs required! The system uses date-based queries:
- Completion status tied to `date` field
- New day = new `TaskCompletion` document
- Historical data automatically preserved
- No scheduled tasks or background jobs

### 2. Visual Progress System
- Real-time progress percentage calculation
- Chart.js line graph with smooth animations
- Calendar heatmap for "don't break the chain" motivation
- Color-coded completion states

### 3. Flexible Deletion
Users choose what to preserve:
- **Soft delete**: Deactivate task, keep history
- **Hard delete**: Remove task + all completion records
- User data always under user control

---

## 🎨 UI/UX Highlights

### Design Principles
- **Minimalist**: Clean, distraction-free interface
- **Visual Feedback**: Instant animations on completion
- **Mobile-First**: Responsive 320px - 1920px
- **Custom Styling**: NO default Bootstrap appearance

### Color Scheme
```css
--primary: #6366f1;      /* Indigo */
--success: #10b981;      /* Green */
--background: #f9fafb;   /* Light gray */
--card: #ffffff;
--text: #1f2937;
--border: #e5e7eb;
```

### Animations
- Task completion: Scale + color transition
- Progress bar: Smooth fill animation
- 100% completion: Optional confetti celebration
- Hover states: All interactive elements

---

## 🔒 Security

### Implemented
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ User data scoped to authenticated user
- ✅ Input validation on all endpoints
- ✅ CORS configured properly
- ✅ No sensitive data in client-side code

### Environment Variables
**CRITICAL**: Never commit `.env` to version control

```env
# ✅ Correct: Server-side only
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key

# ❌ NEVER expose to frontend
# No NEXT_PUBLIC_ or VITE_ prefixes
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Register new user → Success
- [ ] Login with correct credentials → Success
- [ ] Login with wrong password → Error displayed
- [ ] Create new task → Appears in list
- [ ] Mark task complete → Visual feedback + API update
- [ ] Unmark task → State reverts
- [ ] Delete task → Confirmation dialog → Removed
- [ ] Logout → Redirected to login
- [ ] Access dashboard without login → Redirected
- [ ] Reload page → Tasks persist
- [ ] View progress graph → Data displays correctly
- [ ] View task heatmap → Calendar renders

### API Testing (Postman)
See [API_SPEC.md](docs/specs/API_SPEC.md) for:
- Complete endpoint list
- Request/response examples
- cURL commands
- JavaScript fetch examples

---

## 📦 Deployment

### Backend (Railway - Recommended)
```bash
# 1. Push code to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main

# 2. Deploy to Railway
- Connect GitHub repo
- Add environment variables (MONGODB_URI, JWT_SECRET)
- Select "Deploy Now"
- Note backend URL: https://your-app.railway.app
```

### Frontend (Vercel)
```bash
# 1. Update API_BASE in frontend/js/api.js
const API_BASE = 'https://your-backend.railway.app/api';

# 2. Deploy to Vercel
- Drag & drop frontend/ folder to Vercel dashboard
- OR: Connect GitHub repo
- Deploy
- Note frontend URL: https://your-app.vercel.app
```

### Configure CORS
Update backend `server.js`:
```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app',
  credentials: true
}));
```

---

## 🏆 Hackathon Success Criteria

### Technical Execution (40%)
- [x] Full-stack CRUD application
- [x] Working authentication system
- [x] Data persistence across sessions
- [x] RESTful API design
- [x] Clean code organization

### Visual Impact (30%)
- [x] Custom, professional UI
- [x] Smooth animations
- [x] Mobile responsive
- [x] Interactive visualizations
- [x] Consistent color scheme

### Innovation (20%)
- [x] Unique heatmap visualization
- [x] Smart daily reset (no cron)
- [x] Historical data preservation
- [x] Real-time progress calculation

### Presentation (10%)
- [x] Live, deployed demo
- [x] Clear value proposition
- [x] Compelling problem statement
- [x] Future vision

---

## 🚧 Out of Scope (24-Hour Constraints)

### Not Implementing
- ❌ Social features (friends, sharing, leaderboards)
- ❌ Push notifications
- ❌ Email verification / password reset
- ❌ Task categories or tags
- ❌ Habit streaks (consecutive days)
- ❌ Data export (CSV/PDF)
- ❌ Dark mode toggle
- ❌ Third-party integrations
- ❌ Native mobile apps

---

## 🔮 Future Enhancements (Post-Hackathon)

### Phase 2: Engagement (Week 2-4)
- Habit streaks tracking
- Achievement badges
- Email reminders
- Custom habit schedules (3x/week, etc.)

### Phase 3: Social (Month 2)
- Friend connections
- Shared habits
- Leaderboards
- Encouragement system

### Phase 4: Intelligence (Month 3+)
- AI habit suggestions
- Best time recommendations
- Slump detection & intervention

### Phase 5: Ecosystem (Month 6+)
- React Native mobile app
- Wearable integrations (Fitbit, Apple Watch)
- Calendar sync
- Advanced analytics dashboard

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check MongoDB connection
# Verify MONGODB_URI in .env

# Test connection
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
```

### Frontend Not Calling API
```bash
# Check CORS configuration in backend
# Verify API_BASE URL in frontend/js/api.js
# Check browser console for errors
```

### Daily Reset Not Working
```bash
# System uses date-based queries, not time-based
# Completion status is per date (YYYY-MM-DD)
# No manual reset needed
```

### JWT Token Invalid
```bash
# Check JWT_SECRET matches between .env and backend
# Token expires in 7 days (configurable in authController)
# Clear localStorage and login again
```

---

## 📜 License

MIT License - Free to use for hackathons, personal projects, and commercial applications.

---

## 👥 Contributing

This project is designed for 24-hour hackathon execution by a solo developer. Post-hackathon contributions welcome:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

### Documentation
- Read [MASTER_ARCHITECTURE.md](docs/MASTER_ARCHITECTURE.md) for system overview
- Check [HACKATHON_24HR_PLAN.md](docs/HACKATHON_24HR_PLAN.md) for execution timeline
- Review [API_SPEC.md](docs/specs/API_SPEC.md) for API details

### Resources
- [Express.js Docs](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/)
- [MongoDB Atlas Guide](https://www.mongodb.com/docs/atlas/)
- [Chart.js Docs](https://www.chartjs.org/)

---

## ✨ Acknowledgments

- **Inspiration**: The "Don't Break the Chain" productivity method
- **Design Philosophy**: Keep it simple, keep it visual
- **Target**: Hackathon judges who value visual impact + clean code

---

**Built with ❤️ for 24-hour hackathons**  
**Version**: 1.0 - Hackathon Ready  
**Last Updated**: February 21, 2026  

---

## 🎬 Demo Script (For Presentation)

### Opening (30 seconds)
> "Hi, I'm [Name], and I built Habit Rabbit – a habit tracker that shows you visual proof of your consistency, not just checkboxes."

### Problem  (30 seconds)
> "I've tried 5 habit apps. They all get boring after two weeks because checking boxes feels meaningless without seeing your long-term progress."

### Demo (2 minutes)
1. **Register/Login** (15s): "Simple email and password"
2. **Add Tasks** (20s): "Let me add three habits..."
3. **Complete Tasks** (20s): "Watch the animation..." [Show completion]
4. **View Graph** (45s): "This graph shows my completion trends..."
5. **View Heatmap** (20s): "And this heatmap creates the motivating 'don't break the chain' effect"

### Tech Highlight (30s)
> "Built with Node.js, Express, MongoDB. The clever part: no cron jobs for daily resets. The system uses date-based queries, so history is automatically preserved."

### Closing (15s)
> "Habit Rabbit proves habit tracking can be both simple and visually engaging. Thank you!"

---

**Ready to start building? Check out [HACKATHON_24HR_PLAN.md](docs/HACKATHON_24HR_PLAN.md)!** 🚀
