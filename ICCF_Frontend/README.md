# ICCF Frontend - Manav Rachna SkillCert Portal

The frontend application for the **Manav Rachna ICCF (Industry Curriculum & Competency Framework) / SkillCert Portal**. Built with React, Vite, Tailwind CSS, Lucide icons, and integrated with Supabase and the ICCF Express backend.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Navigate to the frontend directory
cd ICCF_Frontend

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in `ICCF_Frontend/` based on `.env.example`:
```bash
cp .env.example .env
```

Configure your variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Node.js + TypeScript Backend API URL
VITE_API_URL=http://localhost:5000/api
```

### 4. Running Locally
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
The Vite development server will start at `http://localhost:5173` (or the port specified in terminal).

---

## 📁 Directory Structure

```text
ICCF_Frontend/
├── public/                 # Static assets and icons
├── src/
│   ├── assets/             # Images and local media
│   ├── components/         # Reusable UI components & dialogs
│   │   ├── admin/          # Admin management panels
│   │   ├── auth/           # Login, registration, & password modal
│   │   ├── common/         # Buttons, cards, modals, loaders
│   │   └── dashboard/      # Role-based dashboard views
│   ├── context/            # React context providers (AuthContext, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Supabase client, storage, and AI utilities
│   │   ├── supabase.js     # Supabase client initialization
│   │   ├── storage.js      # LocalStorage & assessment cache helpers
│   │   └── aiModels.js     # Gemini / AI model integration
│   ├── services/           # Backend API integration services
│   ├── App.jsx             # Root application orchestrator
│   ├── main.jsx            # React DOM mounting entry point
│   └── index.css           # Global stylesheet and Tailwind directives
├── index.html              # Single Page Application HTML entry point
├── package.json            # Dependencies and npm scripts
├── vite.config.js          # Vite configuration
└── .env.example            # Environment variables template
```

---

## 🔑 Key Features

- **Multi-Role Dashboards**: Specific views and workflows for Students, Core Team, Deans, HODs, and Central University Admins.
- **Assessment Engine**: Interactive skill testing framework supporting multiple attempts, timer tracking, and detailed result breakdowns.
- **Industry Skill Alignment**: Interactive skill maps aligned with industry standards and university departments.
- **Secure Authentication**: Seamless integration with the ICCF Backend for JWT access tokens and secure HttpOnly refresh cookies.
