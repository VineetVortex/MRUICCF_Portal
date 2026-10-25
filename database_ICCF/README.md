# ICCF Database - Schema & Migrations

Database definitions, schema migrations, and Row-Level Security (RLS) policies for the **Manav Rachna ICCF (Industry Curriculum & Competency Framework) / SkillCert Portal**.

Powered by **PostgreSQL** hosted on **Supabase**.

---

## 📁 Directory Structure

```text
ICCF_Database/ (or database_ICCF/)
├── schema.sql              # Master SQL schema script
├── supabase_schema.sql     # Supabase-compatible full schema with RLS and triggers
├── migrations/             # Incremental migration scripts
└── README.md               # Database documentation & setup instructions
```

---

## 🗄️ Core Tables Overview

| Table | Purpose | Key Columns / Relations |
| :--- | :--- | :--- |
| `users` | User registry and roles | `id`, `email`, `role`, `department_id`, `created_at` |
| `departments` | University academic departments | `id`, `name`, `code`, `faculty_head` |
| `skill_frameworks` | Industry skill domains & competencies | `id`, `title`, `department_id`, `level`, `version` |
| `questions` | Assessment questions bank | `id`, `framework_id`, `question_text`, `options`, `correct_answer`, `difficulty` |
| `assessments` | Assessment configurations & schedules | `id`, `framework_id`, `duration_minutes`, `passing_score` |
| `assessment_attempts` | Student test submissions & performance | `id`, `assessment_id`, `user_id`, `score`, `passed`, `completed_at` |
| `audit_logs` | Security & system audit trails | `id`, `user_id`, `action`, `metadata`, `created_at` |

---

## 🚀 Setup & Execution

### Option 1: Supabase Dashboard SQL Editor
1. Log in to your [Supabase Dashboard](https://app.supabase.com).
2. Open your project and navigate to the **SQL Editor**.
3. Open `schema.sql` (or `supabase_schema.sql`), copy the entire content, and paste it into the editor.
4. Click **Run** to execute all DDL statements, create tables, triggers, and RLS policies.

### Option 2: Supabase CLI
```bash
# Initialize Supabase (if not already done)
supabase init

# Link to remote project
supabase link --project-ref your-project-id

# Push schema
supabase db push
```

### Option 3: Direct psql Connection
```bash
psql "postgresql://postgres:your-db-password@your-db-host:5432/postgres" -f schema.sql
```

---

## 🔒 Security & Policies
- **Row-Level Security (RLS)** is enabled on all tables.
- Students can only view their own assessment attempts.
- Core team, HODs, and Deans have departmental visibility.
- Central University Admins have system-wide management access.
