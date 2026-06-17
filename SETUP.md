# Personal OS — Setup Guide

Estimated time: **25–30 minutes**

---

## Step 1 — Install prerequisites (5 min)

1. Install **Node.js** from https://nodejs.org (choose the LTS version)
2. Install the **Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
3. Verify both are installed:
   ```bash
   node --version   # should print v18 or higher
   vercel --version # should print a version number
   ```

---

## Step 2 — Create accounts (5 min)

Create free accounts at:
- **GitHub**: https://github.com
- **Vercel**: https://vercel.com (sign in with GitHub)
- **Supabase**: https://app.supabase.com
- **Anthropic API**: https://console.anthropic.com

> Note: Your Claude.ai Pro subscription does NOT cover API usage. You need a separate Anthropic API account.

---

## Step 3 — Set up Supabase (10 min)

1. Go to https://app.supabase.com and click **New Project**
2. Choose a name (e.g. `personal-os`), set a database password, pick a region close to you
3. Wait ~2 minutes for provisioning

4. Go to **SQL Editor** (left sidebar) and run the following SQL to create your tables:

```sql
-- Habits table
CREATE TABLE habits (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  streak INTEGER DEFAULT 0,
  days INTEGER[] DEFAULT '{0,0,0,0,0,0,0}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget categories
CREATE TABLE budgets (
  id BIGSERIAL PRIMARY KEY,
  cat TEXT NOT NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#A78BFA',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  cat TEXT NOT NULL,
  icon TEXT DEFAULT '💳',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events
CREATE TABLE calendar_events (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TEXT DEFAULT 'All day',
  name TEXT NOT NULL,
  tag TEXT DEFAULT 'tag-personal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries
CREATE TABLE journal_entries (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  summary TEXT DEFAULT '',
  actions TEXT[] DEFAULT '{}',
  insight TEXT DEFAULT '',
  valence NUMERIC,
  arousal NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wellness logs (sleep / energy — manual entry via command bar)
CREATE TABLE wellness_logs (
  id BIGSERIAL PRIMARY KEY,
  sleep_hours NUMERIC,
  sleep_score NUMERIC,
  energy_level NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected Google accounts (for multi-account calendar sync)
CREATE TABLE google_accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

5. Seed your initial budget categories (edit amounts to match your actual budget):

```sql
INSERT INTO budgets (cat, budget, spent, color) VALUES
  ('Food',      600, 0, '#A78BFA'),
  ('Transport', 200, 0, '#60A5FA'),
  ('Shopping',  300, 0, '#FBBF24'),
  ('Health',    200, 0, '#34D399'),
  ('Other',     700, 0, '#F87171');
```

6. Enable **Row Level Security** and allow public access (since this is a personal app with no auth):

```sql
ALTER TABLE habits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON habits          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON budgets         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON transactions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON wellness_logs   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON google_accounts FOR ALL USING (true) WITH CHECK (true);
```

7. Get your keys: go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon public** key (long JWT string)

---

## Already have a Supabase project from before? Run this migration

If your tables already exist (from a previous setup), run this in the SQL Editor instead of recreating tables from scratch:

```sql
-- Add mood tracking columns to journal_entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS valence NUMERIC;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS arousal NUMERIC;

-- Create wellness_logs table (sleep / energy tracking)
CREATE TABLE IF NOT EXISTS wellness_logs (
  id BIGSERIAL PRIMARY KEY,
  sleep_hours NUMERIC,
  sleep_score NUMERIC,
  energy_level NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wellness_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON wellness_logs FOR ALL USING (true) WITH CHECK (true);

-- Create google_accounts table (multi-account Google Calendar sync)
CREATE TABLE IF NOT EXISTS google_accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON google_accounts FOR ALL USING (true) WITH CHECK (true);
```

---

## Step 4 — Get your Anthropic API key (2 min)

1. Go to https://console.anthropic.com
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-`)
4. Add a billing method — you'll be charged only for usage (~$1.80–$4/month for this dashboard)

---

## Step 5 — Set up Google Calendar OAuth (10–15 min)

This lets you connect multiple Google accounts and see all their calendars merged into your dashboard.

1. Go to https://console.cloud.google.com
2. Click the project dropdown at the top → **New Project** → name it `personal-os` → **Create**
3. Once created, make sure it's selected in the project dropdown
4. In the search bar, type **"Google Calendar API"** → click it → **Enable**
5. In the left sidebar go to **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - App name: `Personal OS`, your email for support/developer contact
   - Scopes: click **Add or Remove Scopes**, search for and check `.../auth/calendar.readonly`
   - Test users: add your own Gmail address(es) — every Google account you want to connect must be added here while the app is in "Testing" mode
   - Save through the remaining steps
6. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Personal OS Web`
   - Authorized redirect URIs → **Add URI**:
     ```
     http://localhost:5173/oauth/callback
     ```
     (add this one now for local testing; you'll add your production URL in Step 7 after deploying)
7. Click **Create**. Copy the **Client ID** and **Client Secret** shown — you'll need both.

> **Note on "Testing" mode**: Google apps that haven't gone through verification only allow pre-approved test users (added in step 5) to log in — that's expected and fine for a personal app. You do not need to submit for verification.

---

## Step 6 — Run locally (3 min)

1. Open a terminal in this project folder
2. Copy the env example:
   ```bash
   cp .env.example .env.local
   ```
3. Edit `.env.local` and fill in your keys:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/callback
   VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   ```
   Note: `GOOGLE_CLIENT_ID` is used server-side by the edge function; `VITE_GOOGLE_CLIENT_ID` (same value) is used client-side to build the login URL. Both are needed.
4. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:5173 — your dashboard should load with live Supabase data
6. Go to the **Calendar** tab → **Manage Google Calendars** → **Connect a Google account** to test the OAuth flow

> If you see "Connecting to your data…" stuck loading, check your `.env.local` values.

---

## Step 7 — Deploy to Vercel (5 min)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial Personal OS"
   git remote add origin https://github.com/YOUR_USERNAME/personal-os.git
   git push -u origin main
   ```

2. Deploy with Vercel:
   ```bash
   vercel
   ```
   - When asked "Set up and deploy?": **Y**
   - Project name: `personal-os` (or whatever you like)
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

3. Add environment variables in Vercel dashboard:
   - Go to https://vercel.com → your project → **Settings → Environment Variables**
   - Add all of these:
     ```
     ANTHROPIC_API_KEY       = sk-ant-...
     VITE_SUPABASE_URL       = https://...supabase.co
     VITE_SUPABASE_ANON_KEY  = eyJhbGci...
     GOOGLE_CLIENT_ID        = xxxx.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET    = GOCSPX-xxxx
     GOOGLE_REDIRECT_URI     = https://your-deployed-url.vercel.app/oauth/callback
     VITE_GOOGLE_CLIENT_ID   = xxxx.apps.googleusercontent.com
     ```
   - Click **Save** for each
   - For `GOOGLE_REDIRECT_URI`, use your actual Vercel URL once you know it (you'll get this after the first deploy below — come back and update it, then redeploy)

4. Add your production URL to Google Cloud Console:
   - Go back to https://console.cloud.google.com → **APIs & Services → Credentials**
   - Click your OAuth client → **Add URI** under Authorized redirect URIs:
     ```
     https://your-deployed-url.vercel.app/oauth/callback
     ```
   - Save

5. Redeploy to pick up env vars:
   ```bash
   vercel --prod
   ```

Your dashboard is now live at `https://personal-os-xxx.vercel.app`

---

## Updating the app

Any time you make changes:
```bash
git add .
git commit -m "your change"
git push
```
Vercel auto-deploys on every push. Usually live within 30 seconds.

---

## Using the Command Bar

The AI command bar accepts natural language. Examples:

| What you type | What happens |
|---|---|
| `Spent $45 on groceries` | Logs transaction → Food category |
| `Gym membership $60` | Logs transaction → Health category |
| `Meeting with Sarah next Monday at 2pm` | Adds calendar event |
| `Doctor appointment Thursday 10am` | Adds calendar event → Health |
| `I meditated today` | Marks meditation habit done |
| `Did my workout` | Marks exercise habit done |
| `Feeling anxious about the presentation` | Saves journal entry |
| `Slept 7.5 hours, energy is a 6` | Logs sleep/energy to Wellness |
| `Sleep score 82 last night` | Logs sleep score to Wellness |

---

## Troubleshooting

**"Connecting to your data…" stuck**
→ Check your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`

**AI command bar returns "Could not connect"**
→ In local dev: the `/api/claude` proxy doesn't run. Test AI features on the deployed Vercel URL.
→ In production: check `ANTHROPIC_API_KEY` is set in Vercel environment variables.

**Data not syncing across devices**
→ Supabase real-time is enabled by default. If it stops working, check Supabase project is not paused (free tier pauses after 1 week of inactivity — just click "Restore" in the dashboard).

**Supabase free tier pausing**
→ Free projects pause after 7 days of inactivity. To prevent: upgrade to Supabase Pro ($25/mo) or just restore manually when needed.

**Google sign-in says "Access blocked: this app's request is invalid"**
→ Your redirect URI in Google Cloud Console doesn't exactly match `GOOGLE_REDIRECT_URI` in your env vars (including http vs https, trailing slashes). They must match character-for-character.

**Google sign-in says "Error 403: access_denied"**
→ Your Google account isn't in the Test Users list. Go to Google Cloud Console → OAuth consent screen → Test users → add that email.

**Google Calendar events not showing up**
→ Check that the Calendar API is enabled (APIs & Services → Library → search "Google Calendar API" → should say "Enabled" not "Enable"). Also confirm the `google_accounts` table exists in Supabase (Step 3 migration).

**Mood grid not saving on journal entries**
→ Confirm you ran the `ALTER TABLE journal_entries ADD COLUMN valence...` migration in Supabase.
