# System Role & Objective
Build a premium, enterprise-grade React web application for "Intellica", an academic Faculty Research Management System. The application manages research document uploads, institutional credits, and intelligent rankings across three distinct roles: Admin, HOD (Head of Department), and Faculty.

# Design Aesthetics & Tech Stack

## Tech Stack
React (Vite), Tailwind CSS, Framer Motion, Lucide React (for icons), and shadcn/ui components where applicable.

## Vibe
Premium, modern, and highly professional. It should feel like a top-tier enterprise SaaS product (e.g., Stripe, Vercel).

## Design Language
Use a "Fixed-Fluid Hybrid" layout with a persistent left sidebar. Use Glassmorphism (semi-transparent white cards with backdrop-blur over a subtle, multi-radial gradient background), soft ambient drop-shadows, and smooth micro-animations.

## Color Palette
Avoid harsh generic colors. Use a sophisticated slate for text and borders, with a curated primary blue (brand color) for accents, and semantic colors (emerald for approved, rose for rejected).

## Typography
Inter or Outfit. Clean, highly legible, with proper visual hierarchy.

# Animation & Motion Guidelines (CRITICAL)

- **Staggered Page Loads**: When navigating to a new dashboard, the main elements (header, KPI cards, charts) must stagger in sequentially, fading in and sliding upward (y: 20 to y: 0).
- **Physics-Based Progress Bars**: Leaderboards, Department Ranks, and target progress bars should use spring-based physics (type: "spring", stiffness: 100) rather than linear CSS transitions so they bounce slightly into place.
- **Hover Micro-Interactions**: Cards and buttons should have a subtle upward lift (translate-y-[-2px]) and enhanced drop-shadow on hover.
- **Sidebar Magic**: When clicking or hovering over a sidebar navigation item, the active background highlight should use Framer Motion's layoutId to glide smoothly between states.
- **State Transitions (AnimatePresence)**: When an Admin/HOD clicks "Approve" or "Needs Revision" on a queue item, gracefully fade out and collapse its height using `<AnimatePresence>` so the list feels organic.

# Global UI Components Required

- **Role-Based Sidebar**: Dynamic navigation that changes based on the logged-in role.
- **Notification Center**: A bell icon in the top header with a dropdown for real-time alerts.
- **In-App Document Previewer**: A split-screen layout for approval queues where a placeholder PDF/image renders on the left, and metadata/approval buttons are on the right.
- **Diff Viewer Component**: A GitHub-style visual difference viewer highlighting what metadata changed when a faculty member resubmits a document.

# Page Architecture & Routing Blueprint

## 1. Common / Authentication Pages
- `/login`: Clean, centered login card with email/password, followed by a sleek OTP verification modal (Two-Factor Auth).
- `/register`: Multi-step registration form including Department selection dropdown.
- `/profile`: Personal profile management (Name, Email, Profile Image upload placeholder, Academic IDs like Google Scholar/Vidwan).

## 2. Admin Pages (Global Oversight)
- `/admin/dashboard`: Global metrics, total university credits, college-wide ranking leaderboards, and a quick-action approval queue.
- `/admin/departments`: UI to dynamically create new departments and explicitly assign/re-assign HODs to them.
- `/admin/faculty`: Datatable of all registered faculty across the college with filtering and bulk CSV import/export buttons.
- `/admin/approvals`: Split-screen Document Previewer to review documents passed up by HODs.
- `/admin/credit-config`: A dynamic configuration grid where Admins can adjust the exact credit weightings for all 20 activity categories.

## 3. HOD Pages (Departmental Oversight)
- `/hod/dashboard`: Department-specific analytics, Departmental Rank vs other departments, and faculty performance charts.
- `/hod/faculty`: Datatable of all faculty strictly within the HOD's assigned department.
- `/hod/approvals`: Split-screen queue to review faculty submissions. Needs "Approve" and "Needs Revision" (with comment box) actions.

## 4. Faculty Pages (End-User Submissions)
- `/faculty/dashboard`: Personal performance metrics, total earned credits, current College/Department Rank, and pending notifications.
- `/faculty/upload`: A dynamic submission hub branching out to 20 specific category forms (e.g., Publications, FDPs, Patents, MOUs). Each form must capture specific metadata (Title, Year, Date) and a file upload button. Include a "Duplicate DOI/Title" warning banner mockup.
- `/faculty/my-activities`: A timeline/history table of all submitted activities. Must include an "Action Audit Trail" (showing the exact timeline of HOD/Admin comments and status changes).

# Final Instructions
Write the actual Tailwind classes and Framer Motion hooks to ensure the design is incredibly polished, responsive, and visually stunning right out of the box. Generate dummy data to populate the charts, tables, and leaderboards so the UI looks complete.
