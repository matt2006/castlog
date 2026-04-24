# CastLog

> Track catches. Run competitions. Reel in glory.

A Progressive Web App for fishing competitions and catch tracking. Built with React + Vite + TypeScript, Supabase, and Tailwind CSS.

---

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **State:** Zustand
- **Routing:** React Router v6
- **Backend:** Supabase (Postgres, Realtime, Auth, Storage, Edge Functions)
- **Maps:** Leaflet + React-Leaflet
- **Animations:** Framer Motion
- **PWA:** vite-plugin-pwa (Workbox)
- **Offline:** idb-keyval

---

## 1. Supabase Project Setup

### Create a project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon key** (Settings → API)

### Run migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```
Or paste `supabase/migrations/001_initial.sql` directly into the SQL editor.

### Enable Realtime
In Supabase Dashboard → Database → Replication → enable `catches`, `competitions`, `profiles` tables.

### Create Storage bucket
1. Dashboard → Storage → New Bucket
2. Name: `catch-photos`
3. Public: **Yes** (so photo URLs are accessible)
4. Set a file size limit (e.g. 5 MB) and allowed MIME types: `image/*`

---

## 2. Deploy Edge Functions

```bash
# Deploy both admin functions
supabase functions deploy admin-create-user
supabase functions deploy admin-delete-user
```

The functions use `SUPABASE_SERVICE_ROLE_KEY` which Supabase automatically injects — you do **not** add it to your `.env`.

---

## 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

The service role key is **never** in client code — only in Supabase Edge Functions via their built-in secret.

---

## 4. Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

> **Note:** Camera capture and the PWA install prompt require HTTPS. Use `npm run preview` after building, or deploy to Vercel/Netlify for full PWA testing.

---

## 5. Bootstrap the First Admin Account

Supabase's admin user creation requires the service role — you can't do it from the client. Two options:

### Option A — Supabase Dashboard
1. Dashboard → Authentication → Users → Invite User (or Add User)
2. Enter email + password, confirm the user
3. Copy the user's UUID
4. Open SQL editor, paste and run:
```sql
insert into profiles (id, username, role, force_password_change)
values ('<paste-uuid-here>', 'admin', 'admin', true);
```
5. Sign in at `/login` with those credentials — you'll be prompted to change password

### Option B — Supabase CLI
```bash
# Create the auth user
supabase auth users create \
  --email admin@yourclub.com \
  --password changeme123

# Note the UUID printed, then insert the profile:
supabase db execute "insert into profiles (id, username, role, force_password_change) values ('<uuid>', 'admin', 'admin', true);"
```

---

## 6. Creating Subsequent Users

Once you have an admin account, all further user management is done through the **Admin Dashboard** at `/admin`:

1. Sign in as admin
2. Navigate to **Users** → **Create User**
3. Fill in email, username, and temporary password (or click "Generate")
4. Copy the temp password and share it securely with the new user
5. The user signs in and is prompted to set a permanent password

You can also assign admin role from the Users page.

---

## 7. PWA Testing

PWA features (install prompt, camera, service worker) require HTTPS:

```bash
# Build and preview locally with HTTPS (via Vite preview or a tool like caddy)
npm run build
npm run preview
# Then visit https://localhost:4173
```

Or deploy to Vercel / Netlify — both serve over HTTPS automatically.

### Generating PWA Icons (PNG)

The manifest references `icon-192.png` and `icon-512.png`. Generate them from the SVG:

```bash
# Using Inkscape
inkscape public/icons/icon.svg --export-png=public/icons/icon-192.png --export-width=192
inkscape public/icons/icon.svg --export-png=public/icons/icon-512.png --export-width=512

# Or using sharp (Node.js)
npx sharp-cli --input public/icons/icon.svg --output public/icons/icon-192.png resize 192 192
npx sharp-cli --input public/icons/icon.svg --output public/icons/icon-512.png resize 512 512
```

Alternatively use any SVG-to-PNG converter or [realfavicongenerator.net](https://realfavicongenerator.net).

---

## 8. Competition Flow

1. Admin creates a competition (name, dates, join code auto-generated)
2. Anglers join via the 6-character code in the Competitions tab
3. Admin sets status to "Live" when fishing starts
4. Catches logged during a live competition can be assigned to it
5. Leaderboard updates in realtime via Supabase Realtime
6. Admin ends the competition — confetti fires for all participants, winner announced

---

## Quality Checklist

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `vite build` succeeds  
- [ ] Admin routes return 302 → `/` for angler-role users
- [ ] `force_password_change` flow blocks all navigation until complete
- [ ] RLS prevents anglers from deleting other users' catches
- [ ] Storage bucket has correct public/anon policies
- [ ] Edge functions deployed and responding

---

## Project Structure

```
src/
  components/
    auth/       AuthGuard, AdminGuard
    shared/     BottomNav, OfflineBanner, CatchCard
  lib/
    supabase.ts   Client + helpers
    species.ts    UK species data
    achievements.ts  18 achievements with check fns
    offline.ts    idb-keyval helpers
  pages/
    admin/      AdminLayout + 5 admin sections
    angler/     AnglerLayout + 6 angler screens
  store/
    useStore.ts   Zustand global state
  types/
    index.ts    TypeScript interfaces
supabase/
  migrations/   001_initial.sql
  functions/    admin-create-user, admin-delete-user
  seed.sql      First admin setup guide
```
