# ICCF Backend - Enterprise SaaS API Server

Enterprise REST API server for the **Manav Rachna ICCF (Industry Curriculum & Competency Framework) / SkillCert Portal**. Built with **Express**, **TypeScript**, and **Supabase / PostgreSQL**.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- Access to a Supabase project or PostgreSQL instance

### 2. Installation
```bash
# Navigate to the backend directory
cd ICCF_Backend

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in `ICCF_Backend/` based on `.env.example`:
```bash
cp .env.example .env
```

Ensure all mandatory environment variables are set:
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# JWT Configuration
JWT_SECRET=your-cryptographically-secure-server-signing-secret-min-64-characters
JWT_ACCESS_EXPIRES_IN=30s
JWT_REFRESH_EXPIRES_DAYS=7
JWT_ISSUER=mru-skillcert
JWT_AUDIENCE=mru-api

# Secure Cookie Configuration
COOKIE_SECRET=your-cryptographically-secure-cookie-secret-min-64-characters

# CORS Origins
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Admin Bootstrap & Email
BOOTSTRAP_ADMIN_EMAIL=admin.iccf@mru.edu.in
EMAIL_SERVICE_API_KEY=your-api-key
EMAIL_FROM_ADDRESS=SkillCert Authenticator <no-reply@mru.edu.in>
```

### 4. Running the Server
```bash
# Start in development mode (with hot-reload)
npm run dev

# Compile TypeScript to JavaScript
npm run build

# Start production server
npm start
```

---

## 📁 Directory Structure

```text
ICCF_Backend/
├── src/
│   ├── config/             # Environment, database, and system configs
│   ├── controllers/        # Request handling logic
│   │   ├── authController.ts
│   │   ├── assessmentController.ts
│   │   ├── departmentController.ts
│   │   └── userController.ts
│   ├── middleware/         # Auth, validation, rate limiting, error handling
│   │   ├── authMiddleware.ts
│   │   ├── rateLimiter.ts
│   │   └── validationMiddleware.ts
│   ├── routes/             # Express API route declarations
│   ├── services/           # Core business logic & database transactions
│   │   ├── authService.ts
│   │   ├── tokenService.ts
│   │   ├── refreshSessionService.ts
│   │   └── passwordResetService.ts
│   ├── types/              # TypeScript interfaces, types, and schemas
│   └── index.ts            # Express server initialization entry point
├── dist/                   # Compiled JavaScript build (ignored by git)
├── package.json            # Backend scripts and dependencies
├── tsconfig.json           # TypeScript configuration
└── .env.example            # Backend environment variables template
```

---

## 🛡️ Security Architecture & Authentication

- **Short-Lived Access Tokens**: JWT tokens with strict 30-second expiration.
- **Refresh Token Families & Reuse Detection**: Rotated refresh tokens stored securely in `HttpOnly`, `SameSite=Strict` cookies. If a token is reused maliciously, the entire token family is revoked immediately.
- **Role-Based Access Control (RBAC)**: Enforces granular permissions for `student`, `core_team`, `dean`, `hod`, and `admin`.
- **CORS & CSRF Protection**: Restricts API calls to approved origins and sanitizes input.
