# 🌐 TerraTern Lead Page Engine & Admin Portal

An enterprise-grade, mobile-first **Lead Page Engine & Administrative Portal** built for **TerraTern** (Global Talent Mobility & Immigration Consultancy). Powered by **Next.js 15 (App Router, TypeScript, Tailwind CSS)** and a live **Supabase PostgreSQL** backend with Row Level Security (RLS) and Supabase Storage.

---

## 🌟 Live Supabase Project Details

The database and storage backend are live and operational in Supabase:

- **Project Name:** `lead-page-engine`
- **Project Reference:** `jhpofjppflnlrxbmxzkc`
- **Organization:** `TerraTern` (`gitnhsrlncfoozwevfba`)
- **Region:** `ap-south-1` (Mumbai)
- **Status:** `ACTIVE_HEALTHY`
- **API URL:** `https://jhpofjppflnlrxbmxzkc.supabase.co`
- **Publishable Key:** `sb_publishable_rTWh2VTBOqG46jcMnSAjhg_mPVrKxae`
- **Anon Key:** Available in `.env.local`
- **Supabase Security Advisor Status:** `0 lints (100% clean)`

---

## 🏗️ Architecture & Tech Stack

```text
┌───────────────────────────────────────────────────────────────┐
│                     TerraTern Admin Portal                    │
│             Next.js 15 App Router + TypeScript               │
├─────────────┬─────────────┬──────────────┬────────────────────┤
│  /admin/    │  /admin/    │   /admin/    │      /admin/       │
│    pages    │    leads    │   traction   │       assets       │
└──────┬──────┴──────┬──────┴──────┬───────┴─────────┬──────────┘
       │             │             │                 │
       ▼             ▼             ▼                 ▼
┌───────────────────────────────────────────────────────────────┐
│              Supabase Client & Auth Middleware                │
│     - Session verification against public.admin_users         │
│     - Role-Based Access Control (Owner / Editor / Viewer)     │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│             Supabase PostgreSQL + Storage (Live)             │
│  - Tables: pages, leads, events, assets, admin_users,         │
│            app_settings                                       │
│  - Views:  page_stats, daily_trend, answer_dropoff,           │
│            leads_by_source                                    │
│  - Bucket: private 'pdfs' (signed URLs only)                  │
│  - RLS:    100% Row Level Security on all tables              │
└───────────────────────────────────────────────────────────────┘
```

- **Framework:** Next.js 15.1 (React 19, TypeScript)
- **Styling:** Tailwind CSS with TerraTern Brand Identity (Deep Navy `#0F1F6E`, Electric Royal `#1E3AE2`, Teal Accent `#0D9488`, Clean Slate `#F8FAFC`)
- **Icons:** Lucide React
- **Authentication & Database:** `@supabase/ssr` & `@supabase/supabase-js`

---

## 👑 How to Create the First Owner User

Because Row Level Security (RLS) is strictly enabled across all tables, a user can only access the admin portal if their account exists in Supabase Auth **and** is registered in the `admin_users` table.

### Step 1: Create a User in Supabase Auth
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard/project/jhpofjppflnlrxbmxzkc).
2. In the left navigation, click **Authentication** -> **Users**.
3. Click **Add User** -> **Create User**.
4. Enter your email (e.g., `admin@terrateern.com`) and a secure password.
5. Check **Auto Confirm User?** and click **Create User**.
6. Copy the generated **User UID** (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

### Step 2: Grant the `owner` Role via SQL Editor
1. In the Supabase Dashboard, click **SQL Editor** (left navigation).
2. Paste and run the following query, replacing the UUID with your user's UID:

```sql
insert into public.admin_users (user_id, role)
values ('YOUR-USER-UID-HERE', 'owner')
on conflict (user_id) do update set role = 'owner';
```

*(Alternatively, you can query by email if you already created the user):*

```sql
insert into public.admin_users (user_id, role)
select id, 'owner'
from auth.users
where email = 'admin@terrateern.com'
on conflict (user_id) do update set role = 'owner';
```

3. You can now log into `/admin/login` using your email and password!

---

## 🔐 Role-Based Access Control (RBAC)

| Role | Viewing Rights | Editing Rights | Administrative Rights |
|:---|:---|:---|:---|
| **`owner`** | Can view all pages, leads, analytics, and assets | Full create, update, delete across pages, assets, and leads | Can toggle Master Kill Switch and delete assets |
| **`editor`** | Can view all pages, leads, analytics, and assets | Can create, update, and toggle pages; upload assets | Cannot toggle Master Kill Switch; cannot delete leads |
| **`viewer`** | Can view all pages, leads, analytics, and assets | 🚫 All edit controls, toggles, and delete actions are hidden or disabled | Read-only access |

---

## 📱 Responsive Experience (Phone-First Design)

The admin portal is strictly built mobile-first, ensuring full functionality on handheld devices up to 4K displays:

- **Phone (< 768px - Tested at 360px & 390px):**
  - **Fixed Bottom Navigation Bar:** High-contrast tab bar with 44px+ minimum tap targets (`Pages`, `Leads`, `Traction`, `Assets`).
  - **Stacked Data Cards:** Tables transform into thumb-friendly cards with badges, conversion stats, and direct live/unlive toggle switches.
  - **Mobile Modals & Drawers:** Full-screen sheets with safe bottom padding so buttons are never obstructed.
- **Tablet (768px - 1024px):**
  - Responsive grids, collapsible metrics, and scrollable data headers.
- **Desktop (>= 1024px - Tested at 1280px & 1440px):**
  - **Fixed Left Sidebar:** TerraTern branding emblem, persistent navigation, system status indicator, and user profile drawer.
  - **Side-by-Side Analytics:** Multi-column funnel charts, question drop-off analysis, and acquisition sources.
  - **Full Data Tables:** Sortable columns, inline action buttons, and sticky search bars.

---

## 🚀 Running the Project Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Ensure `.env.local` contains your Supabase credentials (pre-configured):
```env
NEXT_PUBLIC_SUPABASE_URL=https://jhpofjppflnlrxbmxzkc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_rTWh2VTBOqG46jcMnSAjhg_mPVrKxae
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000/admin](http://localhost:3000/admin) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🖥️ Screen Features Breakdown

### 1. Pages (`/admin/pages`)
- **Master Kill Switch:** Prominent banner at the top with confirmation modal. When triggered, sets `master_kill_switch = true` in `app_settings` to immediately pause all active campaigns.
- **Connect Page Workflow:** Modal requesting Page Name, Type, Keyword, and Destination URL.
  - Automatically calculates unique, collision-safe slugs (e.g. `express-entry-canada-2`).
  - Generates a secure 32-character random `page_key`.
  - Automatically whitelist the destination URL in `allowed_origins`.
  - Displays a **Connect Card** with instant copy buttons and embed HTML/JS snippet.
- **Page Management:** Instant Live/Unlive toggle switch on each row/card, duplicate page, copy slug, copy page key, and full edit modal (page type, closed message, redirect URL, PDF attachment, allowed origins).

### 2. Leads (`/admin/leads`)
- **Search & Multi-Filter Bar:** Real-time search across Name, Email, and Phone number; filters by Page, Status (Complete vs. Partial Drop-off), Campaign Source, and Keyword.
- **CSV Export:** One-click CSV export reflecting current search query and active filters.
- **Lead Timeline Drawer:** Click any lead to open an interactive modal displaying:
  - Lead contact details and UTM attribution parameters (`utm_source`, `utm_medium`, `utm_campaign`).
  - Complete chronological event history (`view` ➔ `start` ➔ `answer` ➔ `submit` ➔ `download`).
  - Quiz score, quiz category result, and timestamped actions.

### 3. Traction (`/admin/traction`)
- **Top Metric Cards:** Total Page Views, Quiz Starts, Submissions, Leads Captured, and Overall Conversion Rate.
- **Date Range Filters:** Today, Last 7 Days, Last 30 Days, or Custom Date Range.
- **Interactive Funnel Analysis:** Visual progression with conversion percentages from View to Completion.
- **Question Drop-Off Bar:** Groups `events.meta.question_number` to pinpoint where respondents abandon quiz flows.
- **Traffic Acquisition Matrix:** Volume breakdown by source (Instagram, LinkedIn, Google, Organic) and campaign keyword.
- **Daily Activity Trend:** Visual day-by-day activity trend chart.

### 4. Assets (`/admin/assets`)
- **Private PDF Storage:** Direct upload to the private `pdfs` Supabase Storage bucket with 20MB limit and PDF MIME validation.
- **Asset Library:** Card & table view with file sizes, creation timestamps, and linked pages count.
- **Temporary Signed URLs:** Generate 1-hour secure download links on-the-fly without exposing public storage links.
- **Page Attachment:** Quickly link or change PDF assets assigned to lead magnets.

---

## 📋 Embed Snippet Usage

Pages created in the Admin Engine can be embedded into any external marketing page or landing page using the generated snippet:

```html
<!-- TerraTern Lead Page Embed Snippet -->
<script
  src="https://your-domain.vercel.app/embed.js"
  data-page-key="your_32_character_page_key"
  data-slug="your-page-slug"
  async
></script>
<div id="terrateern-lead-engine" data-slug="your-page-slug"></div>
```

---

## 🚢 Deploying to Vercel

1. Push your code to your GitHub/GitLab repository.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project**.
3. Import the repository.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://jhpofjppflnlrxbmxzkc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(Anon key from `.env.local`)*
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_rTWh2VTBOqG46jcMnSAjhg_mPVrKxae`
5. Click **Deploy**. Vercel will automatically build the Next.js App Router application.

---

## 🗄️ Database Migrations Reference

The Supabase migrations are organized in `supabase/migrations/`:
- `20261103000001_create_tables.sql`: Tables (`admin_users`, `assets`, `pages`, `leads`, `events`, `app_settings`)
- `20261103000002_create_indexes_and_triggers.sql`: Performance indexes and automatic `updated_at` trigger
- `20261103000003_create_views.sql`: 4 administrative analytics views (`page_stats`, `daily_trend`, `answer_dropoff`, `leads_by_source`)
- `20261103000004_create_storage.sql`: Private `pdfs` bucket
- `20261103000005_create_security_and_rls.sql`: RBAC security definer functions and RLS policies
- `seed.sql`: Realistic seed data with sample pages, assets, quiz events, and leads
- `full_schema.sql`: Consolidated single-run SQL script for fresh database setup
