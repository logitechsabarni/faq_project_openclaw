# Student Support & FAQ Management System — SPEC.md

## 1. Concept & Vision

A polished, enterprise-grade Student Support portal built on the MERN stack — designed to feel like something a real university would use. It's calm, focused, and trustworthy: clean surfaces, readable typography, and zero clutter. The system empowers students to self-serve through a rich FAQ knowledge base, while support staff manage everything through a protected admin dashboard with real-time stats, query tracking, and one-click FAQ publishing.

**Personality:** Professional, calm, accessible — like a well-organized university help desk.

---

## 2. Design Language

### Color Palette

**Light Mode:**
| Role | Hex | Usage |
|---|---|---|
| Background | `#F1F5F9` | Page background |
| Surface | `#FFFFFF` | Cards, panels |
| Surface Secondary | `#F8FAFC` | Sidebar, subtle areas |
| Primary | `#4F46E5` | Buttons, active states, links |
| Primary Dark | `#4338CA` | Hover |
| Primary Light | `#EEF2FF` | Subtle backgrounds |
| Accent | `#10B981` | Success, solved, badges |
| Warning | `#F59E0B` | Pending states |
| Danger | `#EF4444` | Errors, reject |
| Text Primary | `#0F172A` | Headings, body |
| Text Secondary | `#64748B` | Labels, captions |
| Border | `#E2E8F0` | Dividers, card borders |

**Dark Mode:**
| Role | Hex |
|---|---|
| Background | `#0F172A` |
| Surface | `#1E293B` |
| Surface Secondary | `#1E293B` |
| Primary Light | `#312E81` |
| Primary | `#6366F1` |
| Primary Dark | `#818CF8` |
| Accent | `#34D399` |
| Text Primary | `#F1F5F9` |
| Text Secondary | `#94A3B8` |
| Border | `#334155` |

### Typography
- **Font:** Inter (Google Fonts) — clean, modern, highly readable
- **Headings:** 700 weight, tight letter-spacing
- **Body:** 400 weight, 1.6 line-height
- **Scale:** 12 / 14 / 16 / 18 / 24 / 32 / 48px

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Card padding: 24px
- Sidebar width: 260px (collapsed: 72px)
- Header height: 64px
- Border radius: 8px (cards), 6px (buttons), 12px (modals)

### Motion
- Transitions: 150ms ease for micro-interactions, 250ms ease-out for panels
- Sidebar collapse: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Page transitions: fade 200ms
- Staggered list animations: 50ms between items

---

## 3. Architecture

### Tech Stack
- **Frontend:** React 18 + Vite + React Router v6
- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose ODM
- **Auth:** JWT (access + refresh tokens) with HTTP-only cookie option
- **Styling:** Plain CSS with CSS custom properties (no Tailwind)

### Project Structure
```
E:\faq_project\
├── SPEC.md
├── .env
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── auth.js          — JWT verification
│   │   ├── roleGuard.js     — Admin/student role check
│   │   ├── errorHandler.js  — Global error handler
│   │   └── validate.js      — Request validation
│   ├── models/
│   │   ├── User.js
│   │   ├── FAQ.js
│   │   ├── Query.js
│   │   └── Announcement.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── faqController.js
│   │   ├── queryController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── faqRoutes.js
│   │   ├── queryRoutes.js
│   │   └── dashboardRoutes.js
│   └── utils/
│       ├── ApiError.js
│       ├── asyncHandler.js
│       └── roles.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   └── apiClient.js
│       ├── contexts/
│       │   ├── AuthContext.jsx
│       │   └── ThemeContext.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   └── useTheme.js
│       ├── layouts/
│       │   ├── DashboardLayout.jsx
│       │   └── AuthLayout.jsx
│       ├── components/
│       │   ├── common/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Header.jsx
│       │   │   ├── ProtectedRoute.jsx
│       │   │   ├── LoadingSpinner.jsx
│       │   │   ├── Modal.jsx
│       │   │   ├── Badge.jsx
│       │   │   ├── EmptyState.jsx
│       │   │   └── Toast.jsx
│       │   ├── dashboard/
│       │   │   ├── StatCard.jsx
│       │   │   ├── QueryTable.jsx
│       │   │   └── FAQItem.jsx
│       │   └── faq/
│       │       ├── FAQCard.jsx
│       │       ├── FAQSearch.jsx
│       │       └── CategoryFilter.jsx
│       └── pages/
│           ├── auth/
│           │   ├── LoginPage.jsx
│           │   └── RegisterPage.jsx
│           ├── student/
│           │   ├── DashboardPage.jsx
│           │   ├── FAQBrowsePage.jsx
│           │   ├── RaiseQueryPage.jsx
│           │   └── MyQueriesPage.jsx
│           └── admin/
│               ├── AdminDashboardPage.jsx
│               ├── FAQManagementPage.jsx
│               ├── QueryReviewPage.jsx
│               ├── UserManagementPage.jsx
│               └── AnnouncementsPage.jsx
```

---

## 4. Database Schema

### User
```javascript
{
  _id: ObjectId,
  name: String (required, 2-50 chars),
  email: String (required, unique, lowercase),
  password: String (required, hashed, min 8),
  role: Enum ['student', 'support_staff', 'admin'] (default: 'student'),
  avatar: String (URL, optional),
  department: String (optional),
  isActive: Boolean (default: true),
  lastLogin: Date,
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

### FAQ
```javascript
{
  _id: ObjectId,
  question: String (required, max 500),
  answer: String (required),
  category: String (enum: academics|admission|fees|placement|facilities|other, default: other),
  tags: [String],
  status: Enum ['draft', 'published', 'archived'] (default: published),
  viewCount: Number (default: 0),
  helpful: Number (default: 0)       // thumbs up
  notHelpful: Number (default: 0)    // thumbs down
  createdBy: ObjectId (ref: User),
  reviewedBy: ObjectId (ref: User),
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Query
```javascript
{
  _id: ObjectId,
  question: String (required, max 500),
  description: String,
  category: String (same as FAQ categories),
  priority: Enum ['low', 'medium', 'high', 'urgent'] (default: medium),
  status: Enum [
    'open',           // just raised
    'assigned',       // assigned to support staff
    'pending_approval', // solution submitted, awaiting review
    'resolved',       // admin approved
    'rejected',       // solution rejected
    'closed'          // closed by student or admin
  ] (default: open),
  raisedBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User, optional),
  communitySolution: String (optional),
  solutionBy: ObjectId (ref: User, optional),
  solutionSubmittedAt: Date,
  finalAnswer: String (admin-approved answer),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  adminNote: String,
  addedToFAQ: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Announcement
```javascript
{
  _id: ObjectId,
  title: String (required),
  content: String (required),
  priority: Enum ['info', 'warning', 'urgent'] (default: info),
  isActive: Boolean (default: true),
  expiresAt: Date (optional),
  createdBy: ObjectId (ref: User),
  createdAt: Date
}
```

---

## 5. API Design

### Base URL: `/api`

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login | Public |
| POST | `/auth/register` | Register (students only) | Public |
| POST | `/auth/logout` | Logout | Auth |
| POST | `/auth/refresh` | Refresh access token | Public |
| GET | `/auth/me` | Get current user | Auth |

### FAQs
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/faqs` | List published FAQs (public) | Public |
| GET | `/faqs/:id` | Get single FAQ | Public |
| GET | `/faqs/all` | List all FAQs | Support+ |
| POST | `/faqs` | Create FAQ | Support+ |
| PUT | `/faqs/:id` | Update FAQ | Support+ |
| DELETE | `/faqs/:id` | Archive FAQ | Support+ |
| POST | `/faqs/:id/helpful` | Mark FAQ helpful | Auth |

### Queries
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/queries` | List queries (filtered by role) | Auth |
| GET | `/queries/:id` | Get single query | Auth |
| POST | `/queries` | Raise a new query | Auth |
| PUT | `/queries/:id/solution` | Submit solution | Auth |
| PUT | `/queries/:id/assign` | Assign query | Staff+ |
| PUT | `/queries/:id/approve` | Approve solution | Staff+ |
| PUT | `/queries/:id/reject` | Reject solution | Staff+ |
| PUT | `/queries/:id/close` | Close query | Owner/Staff+ |
| DELETE | `/queries/:id` | Delete query | Admin |

### Dashboard
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/dashboard/stats` | Aggregated stats | Auth |
| GET | `/dashboard/recent-queries` | Recent 10 queries | Auth |
| GET | `/dashboard/faq-stats` | FAQ categories & views | Auth |

### Users (Admin)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users` | List all users | Admin |
| PUT | `/users/:id/role` | Change user role | Admin |
| PUT | `/users/:id/toggle-active` | Enable/disable user | Admin |

### Announcements (Admin)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/announcements` | List active | Auth |
| POST | `/announcements` | Create | Staff+ |
| DELETE | `/announcements/:id` | Delete | Admin |

---

## 6. Pages & Features

### Student Pages
- **Dashboard:** Greeting, quick stats (my open queries, resolved this week), recent announcements, popular FAQs
- **FAQ Browse:** Searchable, filterable by category, expandable accordion, helpful/not helpful voting
- **Raise Query:** Form with question, description, category, priority — submitted instantly
- **My Queries:** Table of all queries raised by the student with status tracking

### Admin/Staff Pages
- **Admin Dashboard:** Live stats (total queries, open, resolved today, FAQ count), recent activity feed, charts placeholder
- **FAQ Management:** Table of all FAQs with inline edit, publish/unpublish toggle, category management
- **Query Review Queue:** Filtered view of pending_approval queries, inline approve/reject with option to add to FAQ
- **User Management:** User table with role badges, activate/deactivate, change role (admin only)
- **Announcements:** Create and manage system-wide announcements

### Auth Pages
- **Login:** Email + password, role indicator, error handling
- **Register:** Name + email + password + department (students only)

---

## 7. Component Inventory

### Sidebar
- Collapsible (260px ↔ 72px)
- Logo + app name at top
- Navigation items with icons and labels
- Active state highlight
- Role-based menu items
- Collapse toggle at bottom
- User avatar + name at bottom

### Header
- Page title (dynamic)
- Breadcrumb
- Search bar (global FAQ search)
- Theme toggle (sun/moon)
- Notification bell
- User dropdown (profile, logout)

### StatCard
- Icon, label, value, trend indicator
- Hover: subtle lift shadow

### QueryTable
- Sortable columns: date, status, priority, category
- Row actions: view, assign, resolve
- Status badge chips
- Empty state

### FAQCard
- Question (truncated), category tag, view count, helpful count
- Expandable answer with smooth animation
- Helpful/Not Helpful voting buttons

### Modal
- Overlay with backdrop blur
- Header, body, footer actions
- Close on ESC and backdrop click

### Toast
- Success/error/info/warning variants
- Auto-dismiss (4s)
- Stack multiple

---

## 8. Security & Standards

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15min expiry) + refresh tokens (7 day)
- HTTP-only cookie for refresh tokens in production
- Role-based access control on every protected route
- Input validation (express-validator) on all POST/PUT routes
- Rate limiting on auth routes
- CORS configured for frontend origin
- Global error handler middleware
- Request logging (morgan)
- No secrets in code — all in `.env`