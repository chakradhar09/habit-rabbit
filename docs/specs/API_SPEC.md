# Habit Rabbit - API Specification

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-backend.railway.app/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## API Overview

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/register` | POST | No | Register new user |
| `/auth/login` | POST | No | Login existing user |
| `/tasks` | POST | Yes | Create new task |
| `/tasks/today` | GET | Yes | Get today's tasks |
| `/tasks/:id/complete` | PUT | Yes | Toggle task completion |
| `/tasks/:id` | DELETE | Yes | Delete task |
| `/analytics/progress` | GET | Yes | Get daily progress data |
| `/analytics/heatmap/:taskId` | GET | Yes | Get task heatmap data |

---

## Authentication Endpoints

### 1. Register User

**Endpoint**: `POST /api/auth/register`

**Description**: Create a new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation**:
- `email`: Required, valid email format, unique
- `password`: Required, minimum 6 characters

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "createdAt": "2026-02-21T10:30:00.000Z"
    }
  }
}
```

**Error Responses**:

400 Bad Request - Invalid input:
```json
{
  "success": false,
  "error": "Email is required"
}
```

409 Conflict - Email already exists:
```json
{
  "success": false,
  "error": "Email already registered"
}
```

**Example Request** (cURL):
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

### 2. Login User

**Endpoint**: `POST /api/auth/login`

**Description**: Authenticate existing user

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com"
    }
  }
}
```

**Error Responses**:

401 Unauthorized - Invalid credentials:
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Example Request** (JavaScript):
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const data = await response.json();
localStorage.setItem('token', data.data.token);
```

---

## Task Endpoints

### 3. Create Task

**Endpoint**: `POST /api/tasks`

**Description**: Create a new habit to track

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "Exercise for 30 minutes"
}
```

**Validation**:
- `title`: Required, 1-100 characters

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "task": {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "title": "Exercise for 30 minutes",
      "isActive": true,
      "createdAt": "2026-02-21T10:35:00.000Z"
    }
  }
}
```

**Error Responses**:

401 Unauthorized - Missing/invalid token:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

400 Bad Request - Invalid input:
```json
{
  "success": false,
  "error": "Title is required and must be between 1-100 characters"
}
```

**Example Request** (JavaScript):
```javascript
async function createTask(title) {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:5000/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title })
  });
  return await response.json();
}
```

---

### 4. Get Today's Tasks

**Endpoint**: `GET /api/tasks/today`

**Description**: Fetch all active tasks for the authenticated user with today's completion status

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**: None

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "title": "Exercise for 30 minutes",
        "isActive": true,
        "completed": false,
        "createdAt": "2026-02-21T10:35:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Read for 20 minutes",
        "isActive": true,
        "completed": true,
        "createdAt": "2026-02-20T08:15:00.000Z"
      }
    ],
    "date": "2026-02-21",
    "progress": {
      "completed": 1,
      "total": 2,
      "percentage": 50
    }
  }
}
```

**Response Fields Explained**:
- `completed`: Boolean indicating if task is completed TODAY (from TaskCompletion collection)
- `progress.completed`: Count of tasks completed today
- `progress.total`: Total active tasks
- `progress.percentage`: `(completed / total) * 100`

**Empty State Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [],
    "date": "2026-02-21",
    "progress": {
      "completed": 0,
      "total": 0,
      "percentage": 0
    }
  }
}
```

**Example Request** (JavaScript):
```javascript
async function getTodaysTasks() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:5000/api/tasks/today', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

---

### 5. Toggle Task Completion

**Endpoint**: `PUT /api/tasks/:id/complete`

**Description**: Mark task as completed or uncompleted for today

**Authentication**: Required

**URL Parameters**:
- `id`: Task ID (MongoDB ObjectId)

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**: None (toggle operation)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "taskId": "507f1f77bcf86cd799439012",
    "completed": true,
    "date": "2026-02-21",
    "message": "Task marked as completed"
  }
}
```

**Behavior**:
- If TaskCompletion record exists for today → Toggle `completed` field
- If no record exists → Create new record with `completed: true`
- If record exists with `completed: true` → Update to `completed: false`

**Error Responses**:

404 Not Found - Task doesn't exist or doesn't belong to user:
```json
{
  "success": false,
  "error": "Task not found"
}
```

**Example Request** (JavaScript):
```javascript
async function toggleTaskCompletion(taskId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/complete`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

---

### 6. Delete Task

**Endpoint**: `DELETE /api/tasks/:id`

**Description**: Delete a task (with optional history deletion)

**Authentication**: Required

**URL Parameters**:
- `id`: Task ID (MongoDB ObjectId)

**Query Parameters**:
- `deleteHistory`: Boolean (optional, default: false)
  - `true`: Delete task AND all TaskCompletion records
  - `false`: Soft delete (set `isActive: false`), keep history

**Request Headers**:
```
Authorization: Bearer <token>
```

**Examples**:
- Delete task only: `DELETE /api/tasks/507f1f77bcf86cd799439012`
- Delete with history: `DELETE /api/tasks/507f1f77bcf86cd799439012?deleteHistory=true`

**Success Response** (200 OK):

Soft delete:
```json
{
  "success": true,
  "data": {
    "message": "Task deactivated",
    "taskId": "507f1f77bcf86cd799439012",
    "historyPreserved": true
  }
}
```

Hard delete:
```json
{
  "success": true,
  "data": {
    "message": "Task and history deleted",
    "taskId": "507f1f77bcf86cd799439012",
    "deletedCompletions": 45
  }
}
```

**Error Responses**:

404 Not Found:
```json
{
  "success": false,
  "error": "Task not found"
}
```

**Example Request** (JavaScript):
```javascript
async function deleteTask(taskId, deleteHistory = false) {
  const token = localStorage.getItem('token');
  const url = `http://localhost:5000/api/tasks/${taskId}${deleteHistory ? '?deleteHistory=true' : ''}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

---

## Analytics Endpoints

### 7. Get Daily Progress Data

**Endpoint**: `GET /api/analytics/progress`

**Description**: Get aggregated daily completion percentages over a time range

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `range`: String (optional, default: '7d')
  - `7d`: Last 7 days
  - `30d`: Last 30 days
  - `6m`: Last 6 months

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "range": "7d",
    "startDate": "2026-02-15",
    "endDate": "2026-02-21",
    "progress": [
      {
        "date": "2026-02-15",
        "completed": 3,
        "total": 5,
        "percentage": 60
      },
      {
        "date": "2026-02-16",
        "completed": 5,
        "total": 5,
        "percentage": 100
      },
      {
        "date": "2026-02-17",
        "completed": 2,
        "total": 5,
        "percentage": 40
      },
      {
        "date": "2026-02-18",
        "completed": 4,
        "total": 5,
        "percentage": 80
      },
      {
        "date": "2026-02-19",
        "completed": 5,
        "total": 5,
        "percentage": 100
      },
      {
        "date": "2026-02-20",
        "completed": 3,
        "total": 5,
        "percentage": 60
      },
      {
        "date": "2026-02-21",
        "completed": 1,
        "total": 5,
        "percentage": 20
      }
    ],
    "averageCompletion": 65.7
  }
}
```

**Empty State Response** (no data for range):
```json
{
  "success": true,
  "data": {
    "range": "7d",
    "progress": [],
    "averageCompletion": 0
  }
}
```

**Error Responses**:

400 Bad Request - Invalid range:
```json
{
  "success": false,
  "error": "Invalid range parameter. Use: 7d, 30d, or 6m"
}
```

**Example Request** (JavaScript):
```javascript
async function getProgressData(range = '7d') {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:5000/api/analytics/progress?range=${range}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

**Backend Logic**:
```javascript
// Pseudo-code
1. Parse range parameter → calculate start and end dates
2. Query TaskCompletion collection:
   - Filter by userId and date range
   - Group by date
   - Count completed tasks per day
3. Query Tasks collection:
   - Get total active tasks per date (for accurate percentages)
4. Calculate percentage: (completed / total) * 100
5. Fill gaps with 0% for days with no data
6. Return sorted array
```

---

### 8. Get Task Heatmap Data

**Endpoint**: `GET /api/analytics/heatmap/:taskId`

**Description**: Get completion history for a specific task (for calendar heatmap visualization)

**Authentication**: Required

**URL Parameters**:
- `taskId`: Task ID (MongoDB ObjectId)

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `months`: Number (optional, default: 6, max: 12)
  - Number of months of history to return

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "taskId": "507f1f77bcf86cd799439012",
    "taskTitle": "Exercise for 30 minutes",
    "startDate": "2025-08-21",
    "endDate": "2026-02-21",
    "completions": [
      {
        "date": "2025-08-21",
        "completed": true
      },
      {
        "date": "2025-08-22",
        "completed": false
      },
      {
        "date": "2025-08-23",
        "completed": true
      },
      // ... more dates
      {
        "date": "2026-02-20",
        "completed": true
      },
      {
        "date": "2026-02-21",
        "completed": false
      }
    ],
    "stats": {
      "totalDays": 184,
      "completedDays": 127,
      "consistency": 69.0,
      "currentStreak": 5,
      "longestStreak": 23
    }
  }
}
```

**Response Fields Explained**:
- `completions`: Array of all dates in range with completion status
- `stats.consistency`: Percentage of days completed out of total days
- `stats.currentStreak`: Consecutive days completed (ending today)
- `stats.longestStreak`: Longest consecutive completion period

**Error Responses**:

404 Not Found - Task doesn't exist or doesn't belong to user:
```json
{
  "success": false,
  "error": "Task not found"
}
```

**Example Request** (JavaScript):
```javascript
async function getTaskHeatmap(taskId, months = 6) {
  const token = localStorage.getItem('token');
  const response = await fetch(`http://localhost:5000/api/analytics/heatmap/${taskId}?months=${months}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

**Backend Logic**:
```javascript
// Pseudo-code
1. Verify task belongs to authenticated user
2. Calculate date range (last X months)
3. Query TaskCompletion for this task + user + date range
4. Create array of ALL dates (not just completion dates)
5. Map completion status (true/false) to each date
6. Calculate streaks:
   - Current streak: work backward from today
   - Longest streak: iterate and track max consecutive
7. Return formatted data
```

---

## Error Handling

### Standard Error Response Format
All error responses follow this structure:
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid authentication token |
| 404 | Not Found | Resource doesn't exist or user lacks access |
| 409 | Conflict | Duplicate resource (e.g., email already exists) |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Scenarios

#### 1. Authentication Errors

Missing token:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

Invalid/expired token:
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### 2. Validation Errors

```json
{
  "success": false,
  "error": "Validation failed: Email is required"
}
```

#### 3. Database Errors

```json
{
  "success": false,
  "error": "Database connection failed. Please try again."
}
```

---

## Rate Limiting

### Current Implementation (Hackathon)
No rate limiting implemented (acceptable for 24-hour hackathon)

### Post-Hackathon Recommendation
```javascript
// Example using express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## CORS Configuration

### Development
```javascript
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true
}));
```

### Production
```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app',
  credentials: true
}));
```

---

## Postman Collection

### Quick Test Workflow

1. **Register User**
   ```
   POST {{baseUrl}}/auth/register
   Body: { "email": "test@example.com", "password": "test123" }
   → Copy token from response
   ```

2. **Set Environment Variable**
   ```
   Set: token = <copied_token>
   ```

3. **Create Tasks**
   ```
   POST {{baseUrl}}/tasks
   Headers: Authorization: Bearer {{token}}
   Body: { "title": "Exercise" }
   ```

4. **Get Today's Tasks**
   ```
   GET {{baseUrl}}/tasks/today
   Headers: Authorization: Bearer {{token}}
   ```

5. **Toggle Completion**
   ```
   PUT {{baseUrl}}/tasks/<taskId>/complete
   Headers: Authorization: Bearer {{token}}
   ```

6. **Get Progress Data**
   ```
   GET {{baseUrl}}/analytics/progress?range=7d
   Headers: Authorization: Bearer {{token}}
   ```

---

## Frontend Integration Examples

### API Service Layer (`api.js`)

```javascript
const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Exported API methods
export const api = {
  // Auth
  register: (email, password) => apiCall('/auth/register', 'POST', { email, password }),
  login: (email, password) => apiCall('/auth/login', 'POST', { email, password }),

  // Tasks
  createTask: (title) => apiCall('/tasks', 'POST', { title }),
  getTodaysTasks: () => apiCall('/tasks/today'),
  toggleCompletion: (taskId) => apiCall(`/tasks/${taskId}/complete`, 'PUT'),
  deleteTask: (taskId, deleteHistory) => 
    apiCall(`/tasks/${taskId}${deleteHistory ? '?deleteHistory=true' : ''}`, 'DELETE'),

  // Analytics
  getProgress: (range = '7d') => apiCall(`/analytics/progress?range=${range}`),
  getHeatmap: (taskId, months = 6) => apiCall(`/analytics/heatmap/${taskId}?months=${months}`)
};
```

### Usage in Dashboard

```javascript
import { api } from './api.js';

async function loadDashboard() {
  try {
    const { data } = await api.getTodaysTasks();
    renderTasks(data.tasks);
    updateProgress(data.progress);
  } catch (error) {
    showError('Failed to load tasks');
  }
}

async function handleTaskCompletion(taskId) {
  try {
    const { data } = await api.toggleCompletion(taskId);
    updateTaskUI(taskId, data.completed);
    refreshProgress();
  } catch (error) {
    showError('Failed to update task');
  }
}
```

---

## Testing Checklist

### Manual API Testing

#### Authentication
- [ ] Register with valid email → Returns token
- [ ] Register with duplicate email → Returns 409
- [ ] Register with invalid email → Returns 400
- [ ] Login with correct credentials → Returns token
- [ ] Login with wrong password → Returns 401

#### Task Operations
- [ ] Create task while authenticated → Returns task object
- [ ] Create task without auth → Returns 401
- [ ] Get today's tasks → Returns user's tasks only
- [ ] Toggle completion → Updates completion status
- [ ] Delete task (soft) → Sets isActive to false
- [ ] Delete task (hard) → Removes task and completions

#### Analytics
- [ ] Get progress for 7d → Returns array of 7 entries
- [ ] Get progress for 30d → Returns array of 30 entries
- [ ] Get heatmap for task → Returns completion history
- [ ] Get heatmap for non-existent task → Returns 404

#### Security
- [ ] Protected routes without token → Return 401
- [ ] User A cannot access User B's tasks
- [ ] Invalid token → Returns 401
- [ ] Expired token → Returns 401

---

## Performance Optimization Tips

### Database Queries
```javascript
// Use lean() for read-only queries
const tasks = await Task.find({ userId }).lean();

// Use select() to limit fields
const tasks = await Task.find({ userId }).select('title isActive').lean();

// Use indexing
taskSchema.index({ userId: 1, isActive: 1 });
completionSchema.index({ userId: 1, taskId: 1, date: -1 });
```

### Caching Strategy (Post-Hackathon)
- Cache today's tasks in Redis (TTL: 5 minutes)
- Cache progress data (TTL: 1 hour)
- Invalidate cache on task update

---

## Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT tokens signed with secret
- [x] All protected routes require authentication
- [x] User data scoped by userId
- [x] Input validation on all endpoints
- [x] CORS properly configured
- [ ] Rate limiting (post-hackathon)
- [ ] SQL injection prevention (N/A - using MongoDB)
- [ ] XSS prevention (handled by frontend)

---

**API Version**: 1.0  
**Last Updated**: February 21, 2026  
**Status**: ✅ Ready for Implementation
