# Shri Ram Medical Mandla — Store Management System

A full-stack pharmacy management system.

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript + Vite | GitHub Pages |
| Backend | Node.js + Express + Prisma | Render.com (free) |
| Database | PostgreSQL | Supabase (free) |

---

## One-time deployment setup

### 1 — Supabase (database)

1. Sign up at [supabase.com](https://supabase.com) → **New project**
2. Go to **Project Settings → Database → Connection string → Session pooler** (port 5432):
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
3. Save this URL — you'll need it in step 2.

### 2 — Render (backend)

1. Sign up at [render.com](https://render.com) → **New → Blueprint**
2. Connect this GitHub repo; Render will read `render.yaml` and create `shrirammedical-backend` automatically
3. Go to the service → **Environment** and set these manually:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Supabase connection string (step 1) |
   | `PHARMACY_NAME` | Shri Ram Medical Mandla |
   | `PHARMACY_ADDRESS` | Your address |
   | `PHARMACY_PHONE` | Your phone number |
   | `PHARMACY_GSTIN` | Your GSTIN |
   | `PHARMACY_LICENSE` | Your drug license number |

4. Copy the **Deploy Hook URL** from **Settings → Deploy Hook** — you'll need it in step 3.
5. Your backend URL will be: `https://shrirammedical-backend.onrender.com`

### 3 — GitHub (Pages + Secrets)

**Enable GitHub Pages:**
- **Settings → Pages → Source → GitHub Actions**

**Add repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `VITE_API_URL` | `https://shrirammedical-backend.onrender.com` |
| `RENDER_DEPLOY_HOOK_URL` | Deploy hook URL from Render step 4 |

### 4 — Seed the database (first time only)

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL in .env to your Supabase connection string
npm install
npx prisma migrate deploy
npx tsx src/prisma/seed.ts
```

---

## Deploying changes

Merge any branch into `main` and GitHub Actions will automatically:

1. Build the React app and deploy it to `https://shrirammedical.github.io`
2. Trigger a Render redeploy of the backend (runs pending DB migrations on startup)

```
feature-branch  →  PR  →  merge to main  →  auto-deploy
```

---

## Local development

### Backend
```bash
cd backend
cp .env.example .env          # set DATABASE_URL + JWT secrets
npm install
npx prisma migrate dev
npm run prisma:seed            # optional sample data
npm run dev                    # runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
cp .env.example .env           # VITE_API_URL=http://localhost:5000
npm install
npm run dev                    # runs on http://localhost:5173
```

### Default login credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@medstore.com | Admin@123 |
| Pharmacist | pharmacist@medstore.com | Pharm@123 |
| Cashier | cashier@medstore.com | Cash@123 |

---

## Features

- **Billing / POS** — Barcode scan, keyboard shortcuts (F2 search, F9 checkout), GST invoice
- **Medicine Management** — CRUD, batch tracking, expiry alerts, bulk Excel import/export
- **Purchase Management** — Supplier orders with automatic stock updates
- **Dashboard** — Live KPIs, weekly sales chart, low-stock and expiry alerts
- **Reports** — Daily/Monthly sales, GST slab, inventory valuation, expiry report
- **Customers & Suppliers** — Profiles, credit tracking
- **Authentication** — JWT, 3 roles (Admin / Pharmacist / Cashier)
- **Audit Logs** — Full user activity trail
- **PDF Invoice** — A4 invoice with QR code and GST breakdown

---

## API docs

Available at `https://shrirammedical-backend.onrender.com/api/docs` once the backend is deployed.
