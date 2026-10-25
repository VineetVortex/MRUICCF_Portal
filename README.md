# Manav Rachna ICCF Portal (SkillCert)

Welcome to the **Manav Rachna ICCF (Industry Curriculum & Competency Framework) / SkillCert Portal**.

This repository contains the full-stack codebase, database definitions, environment templates, and documentation organized into modular directories.

---

## 🏗️ Repository Organization

```text
RCC/
├── ICCF_Frontend/          # Frontend client application (React + Vite + Tailwind CSS)
│   ├── src/                # React source code & components
│   ├── public/             # Static web assets
│   ├── .env.example        # Frontend environment variable template
│   ├── package.json        # Frontend npm dependencies
│   ├── vite.config.js      # Vite build configuration
│   └── README.md           # Frontend-specific documentation & setup guide
│
├── ICCF_Backend/           # Enterprise REST API server (Express + TypeScript)
│   ├── src/                # Backend controllers, services, middleware, routes
│   ├── .env.example        # Backend environment variable template
│   ├── package.json        # Backend npm dependencies
│   ├── tsconfig.json       # TypeScript compiler settings
│   └── README.md           # Backend-specific documentation & setup guide
│
├── ICCF_Database/          # Database definitions & schema migrations
│   ├── schema.sql          # Master PostgreSQL / Supabase schema
│   ├── supabase_schema.sql # Complete Supabase DDL with RLS and triggers
│   ├── migrations/         # Incremental database migration scripts
│   └── README.md           # Database setup and schema documentation
│
├── ICCF_Documents/         # System documentation & reference files
│   ├── COMPLETE_DOCUMENTATION.md                  # Comprehensive system documentation
│   ├── DOCUMENTATION_INDEX.md                     # Documentation navigation index
│   ├── Skill Framework Questionnaire Master Copy.docx # Master question bank
│   ├── MRU_DEPTWISE-INFO_26/                      # Departmental roster directory
│   └── README.md                                  # Documentation index & guide
│
├── .gitignore              # Git ignore rules protecting secrets and dependencies
└── README.md               # Master project overview (this file)
```

*(Note: `database_ICCF` is also maintained for backwards compatibility).*

---

## ⚡ Quick Start: Running the Full Stack

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase / PostgreSQL**: Running instance or hosted project

---

### 2. Database Setup
1. Navigate to the `ICCF_Database/` folder.
2. Run `schema.sql` (or `supabase_schema.sql`) inside your Supabase SQL Editor or via `psql`.
3. Check [`ICCF_Database/README.md`](file:///ICCF_Database/README.md) for full instructions.

---

### 3. Backend Setup & Startup
```bash
# 1. Enter the backend directory
cd ICCF_Backend

# 2. Install dependencies
npm install

# 3. Create your environment file from the template
cp .env.example .env
# Edit .env with your Supabase keys, JWT secret, and database URL

# 4. Start the development server
npm run dev
```
The backend API server will be available at `http://localhost:5000/api`.

---

### 4. Frontend Setup & Startup
```bash
# 1. Open a new terminal and enter the frontend directory
cd ICCF_Frontend

# 2. Install dependencies
npm install

# 3. Create your environment file from the template
cp .env.example .env
# Ensure VITE_API_URL points to http://localhost:5000/api

# 4. Start the frontend development server
npm run dev
```
The frontend application will be available at `http://localhost:5173`.

---

## 🔐 Environment Variables Summary

### Frontend (`ICCF_Frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public / Anon Key | `eyJh...` |
| `VITE_API_URL` | Backend Express API URL | `http://localhost:5000/api` |

### Backend (`ICCF_Backend/.env`)
| Variable | Description |
| :--- | :--- |
| `PORT` | API Port (Default: `5000`) |
| `NODE_ENV` | Runtime environment (`development` / `production`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) |
| `DATABASE_URL` | Direct PostgreSQL connection string |
| `JWT_SECRET` | 64+ char cryptographically random secret |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan (e.g., `30s`) |
| `COOKIE_SECRET` | Secret for signing refresh cookies |
| `CORS_ORIGIN` | Allowed origins (e.g., `http://localhost:5173`) |
| `BOOTSTRAP_ADMIN_EMAIL` | Super admin email address |

---

## 🔒 Security & Code Quality

A comprehensive code review was performed on this repository. Key security highlights:
- **Environment variables are ignored by Git**: `.gitignore` files are configured across all directories.
- **Short-Lived Access Tokens & Refresh Rotation**: Implements strict 30-second token rotation with family reuse detection.
- **Role-Based Access Control**: RBAC is enforced across both the API middleware and database Row Level Security (RLS).
- **Audit Logging**: Sensitive operations and assessments are recorded in `audit_logs`.

---

## 📚 Documentation
For complete architectural details, workflows, and database entity relationships, refer to:
- [`ICCF_Documents/COMPLETE_DOCUMENTATION.md`](file:///ICCF_Documents/COMPLETE_DOCUMENTATION.md)
- [`ICCF_Documents/DOCUMENTATION_INDEX.md`](file:///ICCF_Documents/DOCUMENTATION_INDEX.md)
