# ⚡ Intellica — Academic Performance & Research Appraisal Monorepo

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.x-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ed?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Coolify](https://img.shields.io/badge/Coolify-Ready-8b5cf6?style=for-the-badge)](https://coolify.io/)

<p align="center">
  <strong>An institutional-grade Faculty Appraisal & Research Performance Management Monorepo with multi-tier approval workflows, dynamic credit scoring, PDF proof validation, and real-time departmental analytics.</strong>
</p>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Monorepo Architecture](#-monorepo-architecture)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Quick Start (Local Development)](#-quick-start-local-development)
- [Environment Configuration](#-environment-configuration)
- [Docker & Coolify Deployment](#-docker--coolify-deployment)
- [API Endpoints Reference](#-api-endpoints-reference)
- [File Storage & Proof Management](#-file-storage--proof-management)
- [License](#-license)

---

## 🌟 Overview

**Intellica** is an enterprise-ready academic performance management platform engineered for universities, colleges, and higher education institutions. It streamlines the lifecycle of faculty research submissions, professional activities, and annual performance appraisals through automated credit evaluations, hierarchical approval chains, and compliance reporting (NAAC, NIRF, NBA).

---

## 🚀 Key Features

### 👥 1. Multi-Tier Role-Based Access Control (RBAC)
- **Faculty Portal**: Submit research papers, patents, funded projects, consultancy, and professional activities with proof attachments. Real-time personal credit tracking, rank analytics, and submission history audit trails.
- **Head of Department (HOD) Portal**: Departmental dashboard, faculty profile directories, split-screen proof review with approval/revision comment workflows, and departmental performance leaderboards.
- **Institutional Admin Portal**: Global university overview, dynamic department creation and HOD assignment, system-wide faculty directory, dynamic credit weightings configuration, and final approval queues.

### 🎯 2. Dynamic 20+ Category Credit Engine
- **R&D Activities**: Journal Publications, Conferences, Books, Patents/IPRs, Research Projects, Doctoral Theses, MOUs, Consultancy, Incubation, Research Policy.
- **Professional Development**: Faculty Development Programs (FDPs), Workshops, Seminars, Webinars, Guest Lectures, NPTEL Certifications, Honors & Awards, Professional Memberships.
- **Customizable Weightings**: Administrators can configure credit weights across all categories dynamically without codebase redeployments.

### 📑 3. In-Portal Split-Screen Proof Verification
- Dedicated PDF and image preview panels embedded within approval queues.
- Hardened Content Security Policy (CSP) allowing secure same-origin iframe previewing.
- Versioned activity audit trail preserving exact review timelines and commentary.

### 🔐 4. Enterprise Security & Authentication
- **Hybrid Authentication**: Stateless JWT Bearer tokens for API clients + encrypted `HttpOnly`, `SameSite` session cookies with `connect-mongo` persistence for browser clients.
- **Two-Factor Authentication (2FA)**: Automated 6-digit OTP delivery via Gmail SMTP nodemailer.
- **Defense in Depth**: Helmet security headers, CORS origin auto-detection, and per-route rate limiting.

### 🔔 5. Role-Aware Notification Center & Event Dispatcher
- **Live In-App Alerts**: Top navbar notification center with dynamic unread count badges, interactive mark-as-read actions, and auto-dismiss dropdowns.
- **Automated Lifecycle Triggers**: Instant alerts dispatched when faculty submit uploads, HODs review/approve/request revisions, admins approve credits, or accounts require verification.
- **Role-Targeted Broadcasting**: Notification records target specific recipient roles (`FACULTY`, `HOD`, `ADMIN`) and maintain per-user read states (`readBy` arrays).

### ⚡ 6. Monorepo Tooling & Single-Port Serving
- Powered by **NPM Workspaces** and **Concurrently** for streamlined local development.
- Built-in static production routing: The backend server serves the compiled React Single Page App (`dist/`) directly, with an interactive developer fallback page if unbuilt.


---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide React, Axios, React Router v7 |
| **Backend** | Node.js, Express.js (v4), Mongoose (v8), connect-mongo, Multer, Helmet, Nodemailer, ExcelJS |
| **Database** | MongoDB (Atlas / Self-Hosted) |
| **DevOps & Containers** | Docker (Multi-stage Alpine build), Docker Compose, Coolify Ready |
| **Monorepo Tooling** | NPM Workspaces, Concurrently, Oxlint |

---

## 📂 Detailed Monorepo Structure

```text
Intellica/
├── .dockerignore                          # Docker build exclusion rules
├── .gitignore                             # Monorepo git ignore rules
├── DESIGN.md                              # UI/UX design specifications & motion guidelines
├── Dockerfile                             # Multi-stage container build (Coolify ready)
├── README.md                              # Complete repository documentation
├── docker-compose.yml                     # Docker Compose deployment specification
├── intellica_features.md                  # Comprehensive architectural & feature breakdown
├── package-lock.json                      # Monorepo root lockfile
├── package.json                           # Root workspace configuration & concurrently runner
│
├── backend/                               # ══════════════════════════════════════════════════
│   ├── .env.example                       # Environment variables template for backend
│   ├── fixyears.js                        # Data migration / normalization utility for academic years
│   ├── package-lock.json                  # Backend dependency lockfile
│   ├── package.json                       # Backend scripts & dependency manifest
│   ├── seedAdmin.js                       # Admin account initialization script
│   ├── seedCategories.js                  # 20+ Category default definitions seeder
│   ├── seedDatabase.js                    # Full demo database seeder (Departments, Faculty, Uploads)
│   ├── server.js                          # Express app entry, security stack & static dist router
│   │
│   ├── constants/                         # System Constants & Registries
│   │   ├── categoryMap.js                 # Alias mapping for activity categories
│   │   └── categoryRegistry.js            # Standard definitions for all 20 appraisal categories
│   │
│   ├── controllers/                       # API Request Handlers & Business Logic
│   │   ├── activityController.js          # Activity CRUD & history handling
│   │   ├── adminController.js             # Department management, HOD assignment, bulk actions
│   │   ├── authController.js              # Register, login, 2FA OTP verification & session mgmt
│   │   ├── categoryController.js          # Dynamic category CRUD & weight modifications
│   │   ├── facultyController.js           # Faculty profile, performance & dashboard statistics
│   │   ├── hodController.js               # Department analytics, faculty oversight & approvals
│   │   ├── notificationController.js      # In-app real-time alert triggers & read states
│   │   ├── predictionController.js        # Performance trend predictions
│   │   ├── rankController.js              # Faculty & department dynamic ranking calculators
│   │   ├── rankingcontroller.js           # Institutional leaderboards & credit tiering
│   │   ├── reportController.js            # Appraisal summaries & Excel report generation
│   │   ├── uploadController.js            # Proof file processing, state-machine & status updates
│   │   └── userController.js              # User identity & profile updates
│   │
│   ├── middleware/                        # Express Middlewares
│   │   ├── authMiddleware.js              # Hybrid JWT Bearer & session cookie verifier
│   │   ├── normalizeCategory.js           # Canonical category slug sanitizer
│   │   ├── profileUpload.js               # Multer handler for user profile avatars
│   │   ├── roleMiddleware.js              # Role-Based Access Control guards (FACULTY, HOD, ADMIN)
│   │   ├── securityMiddleware.js          # Helmet HTTP security headers & rate limiters
│   │   └── uploadMiddleware.js            # Multer handler for PDF/image proof uploads
│   │
│   ├── models/                            # Mongoose MongoDB Data Schemas
│   │   ├── Category.js                    # Dynamic activity categories & credit rules
│   │   ├── CreditConfig.js                # Global institutional credit configuration
│   │   ├── CreditRule.js                  # Specific scoring formula definitions
│   │   ├── Department.js                  # Academic department schema & aggregate credits
│   │   ├── DepartmentActivity.js          # Department-level milestone & accreditation logs
│   │   ├── Faculty.js                     # Faculty profile, academic IDs & approval status
│   │   ├── HOD.js                         # Head of Department profile & department allocation
│   │   ├── Notification.js                # Role-targeted alerts & audit messages
│   │   ├── Permission.js                  # Fine-grained action permission schema
│   │   ├── Upload.js                      # Activity proof submissions, reviews & audit history
│   │   └── User.js                        # Base user credentials, 2FA OTP & roles
│   │
│   ├── routes/                            # Express API Route Declarations
│   │   ├── activityRoutes.js              # /api/activities endpoints
│   │   ├── adminRoutes.js                 # /api/admin endpoints
│   │   ├── authRoutes.js                  # /api/auth endpoints (Login, Register, OTP)
│   │   ├── categoryRoutes.js              # /api/categories endpoints
│   │   ├── creditConfigRoutes.js          # /api/credit-config endpoints
│   │   ├── facultyRoutes.js               # /api/faculty endpoints
│   │   ├── hodRoutes.js                   # /api/hod endpoints
│   │   ├── notificationRoutes.js          # /api/notifications endpoints
│   │   ├── rankRoutes.js                  # /api/rank endpoints
│   │   ├── rankingroutes.js               # /api/ranking leaderboards
│   │   ├── reportRoutes.js                # /api/reports data export
│   │   └── uploadRoutes.js                # /api/uploads submission & proof serving
│   │
│   ├── services/                          # Core Domain Logic Services
│   │   ├── creditCalculator.js            # Multi-tier credit calculation algorithm
│   │   └── rankingDecisiontree.js         # Decision-tree ranking & percentile classification
│   │
│   ├── utils/                             # Helpers & Utilities
│   │   ├── createUserFolder.js            # Automatic user storage directory generator
│   │   ├── emailService.js                # Nodemailer Gmail SMTP OTP & alert dispatcher
│   │   ├── frontendFallback.js            # Interactive HTML dashboard when dist is not built
│   │   ├── monorepoConfig.js              # Dynamic CORS & frontend dist path discovery
│   │   ├── storagePath.js                 # Dynamic hierarchical path resolution for uploads
│   │   └── validateEnv.js                 # Boot-time environment variable validator
│   │
│   └── uploads/                           # Local proof file storage root (Docker persistent volume)
│       └── departments/                   # Structured /departments/<DEPT>/<ROLE>/<USER>/...
│
└── frontend/                              # ══════════════════════════════════════════════════
    ├── .env.example                       # Environment variables template for frontend
    ├── .oxlintrc.json                     # Oxlint code quality configuration
    ├── index.html                         # SPA HTML entry document with Google Fonts
    ├── package-lock.json                  # Frontend dependency lockfile
    ├── package.json                       # Frontend scripts (Vite, React 19, Tailwind)
    ├── postcss.config.js                  # PostCSS configuration
    ├── tailwind.config.js                 # Tailwind CSS design system tokens
    ├── vite.config.js                     # Vite build configuration & /api proxy rules
    │
    ├── public/                            # Static Assets
    │   ├── favicon.svg                    # Application vector favicon
    │   ├── icons.svg                      # Custom vector icon sprites
    │   └── college-campus.jpg             # Institutional hero background visuals
    │
    └── src/                               # Application Source Code
        ├── App.css                        # Application-wide utility animations
        ├── App.jsx                        # Role-based route definitions (React Router 7)
        ├── index.css                      # Tailwind imports & Glassmorphism design tokens
        ├── main.jsx                       # React DOM root bootstrapping
        │
        ├── api/                           # Network Clients & HTTP Handlers
        │   ├── axiosClient.js             # Configured Axios client with credentials & interceptors
        │   └── services.js                # Typed API client methods for all backend endpoints
        │
        ├── components/                    # Global & Shared UI Components
        │   ├── Header.jsx                 # Top navbar with user profile menu & notification bell
        │   ├── ImageCropperModal.jsx      # Interactive avatar cropping & upload modal
        │   └── Sidebar.jsx                # Role-aware animated navigation sidebar
        │
        ├── layouts/                       # Layout Wrappers
        │   └── DashboardLayout.jsx        # Fixed-fluid hybrid layout with responsive sidebar
        │
        ├── pages/                         # Application Views & Pages
        │   ├── Login.jsx                  # Email/password authentication & 2FA OTP modal
        │   ├── Onboarding.jsx             # First-time user profile setup & department select
        │   ├── Profile.jsx                # Faculty/HOD personal profile & academic IDs editor
        │   ├── Register.jsx               # New user registration & department selection
        │   │
        │   ├── faculty/                   # ── Faculty Views ──
        │   │   ├── Dashboard.jsx          # Faculty performance stats, credit summary & rank
        │   │   ├── MyActivities.jsx       # Activity timeline, status history & revision trail
        │   │   └── Upload.jsx             # 20-category dynamic upload hub with DOI deduplication
        │   │
        │   ├── hod/                       # ── Head of Department Views ──
        │   │   ├── Dashboard.jsx          # Departmental KPI dashboard & rank vs other depts
        │   │   ├── Approvals.jsx          # Split-screen proof previewer & approval workflow
        │   │   └── Faculty.jsx            # Department faculty roster, filter & profile viewer
        │   │
        │   ├── admin/                     # ── Institutional Administrator Views ──
        │   │   ├── Dashboard.jsx          # College-wide analytics, total credits & rankings
        │   │   ├── Approvals.jsx          # Split-screen review for HOD submissions
        │   │   ├── CreditConfig.jsx       # Interactive credit weighting matrix for 20 categories
        │   │   ├── Departments.jsx        # Dynamic department creation & HOD assignment UI
        │   │   └── Faculty.jsx            # University faculty directory & CSV bulk export
        │   │
        │   └── shared/                    # ── Shared System Views ──
        │       ├── Calendar.jsx           # Institutional academic event & deadline calendar
        │       ├── Reports.jsx            # Dynamic report generator & Excel export center
        │       └── Settings.jsx           # Account preferences & notification settings
        │
        └── utils/                         # Frontend Utilities
            └── syncEvents.js              # Event-bus for cross-tab synchronization
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20.x or v22.x+
- **NPM**: v10.x+
- **MongoDB**: Connection string (MongoDB Atlas or local instance)

### 2. Clone and Install Dependencies
Running `npm install` in the root folder automatically installs all dependencies across the root, `backend/`, and `frontend/` using NPM Workspaces:

```bash
git clone https://github.com/Sensui-moksha/Intellica.git
cd Intellica

# Installs dependencies for root, backend, and frontend
npm install
```

### 3. Configure Environment Files
Copy and configure the backend `.env`:

```bash
cp backend/.env.example backend/.env
```

*(See [Environment Configuration](#-environment-configuration) for required keys).*

### 4. Start Development Servers
Run both the Express backend and the Vite frontend concurrently with a single command:

```bash
npm run dev
```

- **Frontend (Vite)**: `http://localhost:5173`
- **Backend API (Express)**: `http://localhost:5001`

---

## ⚙️ Environment Configuration

Set the following variables in `backend/.env` (or in your hosting provider/Coolify):

```env
# ── SERVER CONFIGURATION ──
PORT=5001
NODE_ENV=development

# ── DATABASE ──
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/intellica_db?retryWrites=true&w=majority

# ── AUTHENTICATION & SECURITY ──
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# ── EMAIL & OTP 2FA (GMAIL SMTP) ──
EMAIL_USER=your_institution_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password

# ── STORAGE & UPLOADS ──
UPLOAD_DIR=./uploads

# ── OPTIONAL MONOREPO OVERRIDES ──
# FRONTEND_PORT=5173
# ALLOWED_ORIGINS=https://intellica.yourcollege.edu
```

---

## 🐳 Docker & Coolify Deployment

Intellica features a multi-stage Docker build that compiles the React frontend with Vite in Stage 1 and serves it alongside the Express API in a minimal Node Alpine runtime in Stage 2.

### Local Docker Compose
```bash
# Build and run container
docker compose up --build -d

# View container logs
docker compose logs -f

# Stop container
docker compose down
```

### 🚀 Deploying to Coolify
1. In your Coolify dashboard, select **New Resource** → **Application** → **GitHub Repository**.
2. Select the `Sensui-moksha/Intellica` repository and branch `main`.
3. Choose **Dockerfile** or **Docker Compose** as the build pack.
4. Under **Environment Variables**, add the production configuration:
   - `PORT=5001`
   - `NODE_ENV=production`
   - `MONGO_URI=<your-mongodb-connection-string>`
   - `JWT_SECRET=<secure-random-string>`
   - `SESSION_SECRET=<secure-random-string>`
   - `EMAIL_USER=<your-smtp-email>`
   - `EMAIL_APP_PASSWORD=<your-smtp-app-password>`
   - `UPLOAD_DIR=/app/backend/uploads`
   - `ALLOWED_ORIGINS=https://your-coolify-domain.com`
5. Configure a persistent storage volume in Coolify:
   - **Destination Path**: `/app/backend/uploads`
6. Click **Deploy**.

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new Faculty or HOD account |
| `POST` | `/api/auth/login` | Email/Password login (triggers 6-digit OTP) |
| `POST` | `/api/auth/verify-otp` | Verify OTP, generate JWT & establish session |
| `POST` | `/api/auth/resend-otp` | Re-issue a fresh 6-digit OTP |
| `POST` | `/api/auth/logout` | Clear session cookie and invalidate token |
| `GET` | `/api/auth/me` | Fetch active authenticated user profile |

### 📂 Uploads & Activities (`/api/uploads`, `/api/activities`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/uploads` | Submit activity proof with category metadata |
| `GET` | `/api/uploads/my` | Retrieve logged-in faculty member's submissions |
| `GET` | `/api/uploads/pending` | Fetch pending submissions for HOD/Admin review |
| `PUT` | `/api/uploads/:id/status` | Approve, reject, or request revision on an upload |

### 🏢 Departments & Admin (`/api/admin`, `/api/hod`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/departments` | List all departments and allocated HODs |
| `POST` | `/api/admin/departments` | Create a new academic department |
| `PUT` | `/api/admin/assign-hod` | Assign/reassign HOD to a specific department |
| `GET` | `/api/admin/faculty` | College-wide faculty directory with filtering |
| `GET` | `/api/hod/faculty` | Department-specific faculty directory |

### 📊 Credits & Leaderboards (`/api/credit-config`, `/api/ranking`, `/api/rank`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/credit-config` | Fetch active credit calculation rules |
| `PUT` | `/api/credit-config` | Update category credit weights (Admin only) |
| `GET` | `/api/ranking/department` | Retrieve departmental credit rankings |
| `GET` | `/api/ranking/faculty` | Retrieve college/department faculty leaderboard |
| `GET` | `/api/reports/export` | Export verified appraisal reports to Excel |

### 🔔 Notifications (`/api/notifications`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Fetch active unread notifications for authenticated role |
| `PUT` | `/api/notifications/:id/read` | Mark a specific notification as read by current user |


---

## 🗄️ File Storage & Proof Management

Uploaded certificates, papers, and PDF documents are organized dynamically on disk:

```text
/uploads/
└── departments/
    └── CSE/
        ├── faculty/
        │   └── Dr_Ramesh(CSE-102)/
        │       ├── profile_pic/
        │       │   └── avatar.png
        │       ├── publication/
        │       │   └── 1740000000-ieee_paper.pdf
        │       └── fdp/
        │           └── 1740000000-fdp_certificate.pdf
        └── hod/
            └── Dr_Sharma(HOD-CSE)/
                └── profile_pic/
```

- **Local Storage**: Eliminates database bloat by storing binary files on filesystem.
- **Docker Persistent Volumes**: Proofs remain safely intact across container updates via volume mounts on `/app/backend/uploads`.

---

## 📜 Monorepo NPM Scripts

```bash
# Development
npm run dev               # Run backend (5001) & frontend (5173) concurrently
npm run dev:backend       # Run backend only (Nodemon)
npm run dev:frontend      # Run frontend only (Vite)

# Production
npm run build             # Build frontend into frontend/dist
npm start                 # Start backend in production mode

# Database
npm run seed              # Seed initial departments, categories & users
npm run seed:reset        # Reset and re-seed database

# Quality
npm run lint              # Run Oxlint across frontend codebase
```

---

## 📄 License

This project is licensed under the **ISC License**.

```text
Copyright (c) 2026 Intellica Team
```
