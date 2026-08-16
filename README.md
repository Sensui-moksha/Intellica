# Intellica

> **Institutional Faculty Appraisal & Research Performance Management Monorepo**

Intellica is an institutional-grade Faculty Appraisal & Research Performance Management portal. Features multi-tier approval workflows (Faculty/HOD/Admin), dynamic credit scoring, PDF proof verification, department analytics, and NAAC/NIRF reporting, built with React, Vite, Node.js, Express, and MongoDB.

---

## 🌟 Key Highlights

- 👥 **Role-Based Access Control**: Strict multi-tier approval workflows for **Faculty**, **Heads of Department (HOD)**, and **Institutional Administrators**.
- 📑 **Comprehensive Activity Submissions**: Track paper publications, patents (IPR), funded R&D projects, consultancy, FDPs, MOUs, doctoral theses, conferences, books, and certifications.
- 🎯 **Dynamic Credit Engine**: Automated and customizable credit scoring for institutional appraisals, rankings, and NAAC/NIRF accreditation metrics.
- 📂 **In-Portal Proof Verification**: Secure PDF and image previewing directly within the review dashboard with strict Content Security Policies.
- 📊 **Department & Institutional Analytics**: Real-time insights into departmental productivity, credit leaderboards, and historical appraisal trends.
- ⚡ **Monorepo Architecture**: Integrated React 19 (Vite) frontend and Node.js (Express) backend running concurrently with automated workspace installations.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Axios, React Router 7
- **Backend**: Node.js, Express, MongoDB (Mongoose), Connect-Mongo Sessions, JWT Bearer Auth, Helmet Security
- **Tooling & Monorepo**: NPM Workspaces, Concurrently, Oxlint

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Sensui-moksha/Intellica.git
cd Intellica

# 2. Install dependencies across root, backend, and frontend
npm install

# 3. Start development servers concurrently (Backend: 5001 | Frontend: 5173)
npm run dev

# 4. Build frontend production bundle for backend serving
npm run build

# 5. Start backend server
npm start
```

---

## 📁 Monorepo Structure

```text
Intellica/
├── backend/          # Express API server, MongoDB models, routes, middleware
├── frontend/         # React + Vite client application
├── package.json      # Root monorepo workspace & concurrently scripts
└── README.md         # Project documentation
```

---

## 📄 License

ISC License © Intellica Team
