# 🚀 ORBITAL-SHIELD: Full Deployment & Online Database Guide

This guide covers everything you need to deploy **ORBITAL-SHIELD** from **GitHub** to **Vercel** with a free online cloud database.

---

## 1. 🗄️ Which Online Database Should You Use?

### **Recommended: Supabase PostgreSQL (100% Free & Native Match)**

The entire ORBITAL-SHIELD codebase is **already pre-configured specifically for Supabase**:
* The database schema is already written for Supabase: [`db/schema.sql`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/db/schema.sql)
* The database driver in [`server/db.ts`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/server/db.ts) uses Node PostgreSQL with connection pooling and SSL designed for Supabase Transaction Pooler (`aws-0-[region].pooler.supabase.com:5432`).
* Supabase includes a web-based **SQL Editor**, automatic backups, real-time metrics, and a generous **Free Tier** (no credit card required).

*(Alternative: **Neon.tech** or **Railway Postgres** also work with the same PostgreSQL connection string, but Supabase is the native match for the project schema).*

---

## 2. 📋 Step-by-Step: Setting Up Supabase Database (Takes 3 Minutes)

### Step 2.1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and click **"Start your project"**.
2. Sign in with your **GitHub account**.
3. Click **"New Project"**.
4. Fill in:
   * **Name**: `orbital-shield-db` (or any name)
   * **Database Password**: Choose a strong password (⚠️ **Save this password!** You will need it in your connection string).
   * **Region**: Choose the region closest to you (e.g., `East US`, `South Asia / Mumbai`, `Central Europe`).
5. Click **"Create new project"** and wait ~60 seconds for the database to provision.

---

### Step 2.2: Run the Database Schema
1. In your Supabase project dashboard, click on the **SQL Editor** icon in the left sidebar (looks like `>_`).
2. Click **"New query"**.
3. Open [`db/schema.sql`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/db/schema.sql) from your project folder.
4. Copy the entire file content and paste it into the Supabase SQL Editor.
5. Click the green **"Run"** button.
6. You will see: `Success. No rows returned.`
   * This creates all tables: `missions`, `spacecraft`, `subsystems`, `telemetry`, `fault_events`, `anomalies`, `simulations`, `operator_logs`, and seeds initial mission `OS-001`.

---

### Step 2.3: Get Your `DATABASE_URL` Connection String
1. In your Supabase dashboard, click the **Settings (gear icon)** at the bottom of the left sidebar.
2. Under **Configuration**, click **"Database"**.
3. Scroll down to **"Connection string"** and select the **"URI"** tab.
4. Choose **"Transaction Pooler"** (Port `5432` or `6543`).
5. The URI looks like:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the actual database password you chose in Step 2.1.
7. Save this full string — this is your `DATABASE_URL`.

---

## 3. 🌐 Understanding How ORBITAL-SHIELD Deploys

ORBITAL-SHIELD is composed of two parts:
1. **Frontend (Vite + React 19 + Tailwind + Three.js + Programme ERIZON 3D Digital Twin)**: Static single-page application.
2. **Backend (Express + Gemini AI + Telemetry Engine + PostgreSQL)**: Node.js server in [`server.ts`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/server.ts).

### Important Note about Vercel:
* **Vercel** is primarily a **Serverless / Static frontend platform**.
* When deploying a Vite React app to Vercel, it builds and serves the UI globally with ultra-low latency.
* You have **two deployment routes**:

| Method | Where It Runs | Best For |
|--------|---------------|----------|
| **Approach 1: Vercel (Frontend) + Render or Railway (Backend)** *(Recommended for 24/7 background telemetry simulation)* | UI on Vercel, Node server on Render (free) or Railway | Runs the live 1-second background telemetry loop continuously 24/7. |
| **Approach 2: All-in-One on Render or Railway** | Single fullstack container from GitHub | Quickest all-in-one deploy without splitting frontend and backend. |
| **Approach 3: All-in-One on Vercel** | Vercel Static Frontend + Serverless API Functions via `vercel.json` | 100% Vercel hosting. |

Below are the exact steps for deploying to **Vercel**.

---

## 4. 🚀 Step-by-Step: Deploying on Vercel

### Step 4.1: Prepare Your GitHub Repository
1. Make sure your `.env` file is in `.gitignore` (never commit passwords or API keys to GitHub!).
2. Verify that your `.gitignore` contains:
   ```text
   node_modules
   dist
   .env
   .env.local
   .venv
   ```
3. Commit and push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure ORBITAL-SHIELD with Programme ERIZON digital twin"
   git push origin main
   ```

---

### Step 4.2: Import Project to Vercel
1. Go to [vercel.com](https://vercel.com) and log in with your **GitHub account**.
2. On your Vercel Dashboard, click **"Add New..."** → **"Project"**.
3. Select your GitHub repository (`ORBIT-SHIELD`) and click **"Import"**.
4. Configure Project Settings:
   * **Framework Preset**: `Vite` (Vercel detects this automatically).
   * **Root Directory**: `./` (or `blueprint` if your repo root has the outer folder).
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
   * **Install Command**: `npm install`

---

### Step 4.3: Set Environment Variables in Vercel
In the Vercel Import screen, expand **"Environment Variables"** and add:

| Key | Value | Description |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres` | Your Supabase connection string from Step 2.3 |
| `DATABASE_SSL` | `true` | Enables secure TLS connection to Supabase |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini AI API key (from [aistudio.google.com](https://aistudio.google.com/app/apikey)) |
| `NODE_ENV` | `production` | Production environment flag |

---

### Step 4.4: Click "Deploy"
1. Click the blue **"Deploy"** button.
2. Vercel will install dependencies, run `npm run build`, and deploy your app.
3. In ~45 seconds, you will receive a live URL:
   `https://orbital-shield-xxxx.vercel.app`

---

## 5. 🛠️ Configuration Files to Add

### 5.1 `vercel.json` (For Clean Routing & SPA Support on Vercel)
Create a `vercel.json` file in your project root with the following contents:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*Why this is needed*: This ensures that browser page reloads and deep routes in your React single-page app don't return 404 errors on Vercel.

---

## 6. ⚡ Alternative: Running the Backend 24/7 on Render (Free)

If you want the background telemetry loop (which ticks every 1 second and saves flight data) running 24/7 without serverless sleeping:

1. Go to [render.com](https://render.com) (Free tier available).
2. Click **"New"** → **"Web Service"**.
3. Connect your GitHub repository.
4. Settings:
   * **Environment**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
5. Add Environment Variables:
   * `DATABASE_URL` = your Supabase connection string
   * `DATABASE_SSL` = `true`
   * `GEMINI_API_KEY` = your Gemini API key
6. Click **"Deploy Web Service"**.
7. Render gives you an HTTPS URL where the complete fullstack app (including background simulation and live telemetry) runs 24/7.

---

## 7. 🔐 Security Checklist Before Pushing to GitHub

- [x] **Never commit `.env` file** to GitHub.
- [x] Only commit [`.env.example`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/.env.example) with placeholder values.
- [x] In Supabase, use the **Transaction Pooler** URI (port `5432` or `6543`), not the direct IP, to avoid exhausting PostgreSQL connections.
- [x] In Vercel / Render, add the real keys in the **Settings → Environment Variables** dashboard tab.

---

## 8. Summary of Files & Roles

| File | Purpose | Action Needed |
|------|---------|---------------|
| [`db/schema.sql`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/db/schema.sql) | Database tables, indexes, and initial mission data | Copy & run in **Supabase SQL Editor** once |
| [`.env.example`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/.env.example) | Template for required environment variables | Reference when filling Vercel env variables |
| [`vercel.json`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/vercel.json) | Vercel SPA routing and build configuration | Place in project root |
| [`package.json`](file:///c:/Users/HP/Downloads/ORBIT-SHIELD/ORBIT-SHIELD/blueprint/package.json) | Dependencies and `npm run build` command | Kept as is |
