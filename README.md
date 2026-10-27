# Almstead Repair Orders

Digital replacement for the paper **Equipment Repair Order** form. Mechanics fill it in on their phones (iPhone or Android, installed to the home screen), managers review and store every order with photos, a signature, and a PDF that matches the paper layout.

Stack: **Next.js 16** (App Router) · **Supabase** (Postgres + Storage) · **Tailwind CSS 4** · `@react-pdf/renderer`. Same pattern as Almstead Priorities. Deploys to Vercel.

```
Mechanic (phone PWA)                     Manager (any browser)
  /login  → pick name, 4–6 digit PIN       /login  → pick name, passcode
  /app    → New Repair Order, my orders    /manager            orders, filters, CSV
  /app/orders/new → form + photos + sig    /manager/orders/:id review, PDF, notes
  works offline, uploads when online       /manager/trucks     truck master list + history
                                           /manager/staff      add mechanics, reset PINs
```

---

## 1. Supabase (already done — 2026-10-27)

The project exists in the **Almstead** org: **Repair Orders**, ref `bethrbtergsvtafmsgpy`, `us-east-1`, Micro compute, and both files in `supabase/migrations/` have been run (`0001_init.sql`, then `0002_service_role_grants.sql`). Together they create:

- `staff` (mechanics + managers, bcrypt-hashed PINs), `trucks`, `repair_orders`, `repair_order_photos`
- a **private** storage bucket `repair-orders` for photos and signatures
- Row Level Security on every table with no policies — only the app's service-role key can read anything
- explicit grants for `service_role` (needed because the project was created with "Automatically expose new tables" off).

**Hosting:** Vercel project `almstead-repair-orders` (team "merrick lee's projects", managed from the merricklee@me.com login) → https://almstead-repair-orders.vercel.app, deploying from `main` on GitHub `MerrickLee/almstead-equipment`.

Values for `.env.local` / Vercel:

- `SUPABASE_URL` = `https://bethrbtergsvtafmsgpy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = **Project Settings → API Keys → Secret keys → default** (`sb_secret_…`). The legacy `service_role` JWT on the "Legacy" tab works too.

To recreate from scratch, run the two migration files in order in **SQL Editor → New query** on a fresh project.

## 2. Run locally

```bash
cp .env.example .env.local      # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET
npm install
npm run create-manager -- "Merrick Lee" "your-passcode" "New Rochelle, NY"
npm run dev                     # http://localhost:3000
```

`SESSION_SECRET` signs the login cookie — generate one with `openssl rand -base64 48`.

Sign in at `/login` as the manager you just created, then add mechanics and trucks from the dashboard. To bulk-load trucks: `npm run seed-trucks -- trucks.csv` (columns `truck_number,description,branch`).

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework preset: Next.js, no build changes needed).
2. Add the three environment variables from `.env.example` (Production + Preview).
3. Add the domain, e.g. `repairs.almstead.ai`.

Nothing Supabase-related is exposed to the browser: there are no `NEXT_PUBLIC_` variables, and the service-role key is only used in server code (`src/lib/supabase.ts`).

## 4. Put it on the mechanics' phones

The app is a PWA, so there is no app store step. Send mechanics the URL and have them:

- **iPhone (Safari):** open the link → Share button → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Add to Home screen** / **Install app**.

It opens full-screen like a native app, stays signed in for 30 days, and keeps working with no signal (see below).

---

## How it works

### Sign-in
Everyone picks their name from a list and enters a passcode. Mechanics use a 4–6 digit PIN (numeric keypad, auto-submits at 6 digits); managers use a passcode of 6+ characters. Five wrong attempts lock the account for 15 minutes. Sessions are signed JWTs (`jose`, HS256) in an `httpOnly` cookie; `src/proxy.ts` checks it on every request and keeps mechanics out of `/manager`. Managers create accounts and reset PINs from **Mechanics & managers** — PINs are never shown again after being set.

### The repair order form
Mirrors the paper sheet field-for-field: mechanic (auto), date (defaults to today), truck # (picker from the master list, or free text), branch, location, mileage, total travel time, total hours (with a "use start/finish" shortcut), summary, work performed, parts/materials, start and finish times, up to 12 photos (camera or gallery, shrunk on the phone to ~250 KB each), and a finger-drawn signature.

### Offline
- The service worker (`public/sw.js`) caches the app shell, so the app opens with no signal.
- The form autosaves a draft on the phone (IndexedDB) as you type; closing the app doesn't lose it.
- **Submit** always works: the order goes into a local outbox and uploads automatically when the phone is back online (the yellow banner shows what's waiting). Re-sends are idempotent — every order carries a `client_id` generated on the phone, so a dropped connection never creates a duplicate.
- Trucks and recent orders are cached so the picker and the order list still render offline.

### Manager dashboard
- **Orders:** filter by branch, mechanic, truck, status, date range, or free-text search across truck, location, summary, work and parts; export the filtered set to CSV.
- **Order detail:** everything on the form plus photos (full size on tap), the signature, and a PDF download laid out like the paper form (`src/lib/pdf/RepairOrderPdf.tsx`; sample in `docs/sample-repair-order.pdf`).
- **Review:** add notes and mark as reviewed. Reviewed orders lock for the mechanic; managers can reopen them or edit any field.
- **Trucks:** master list with per-truck history (orders, total shop hours, last mileage). Retired trucks keep their history.

### Data model (`supabase/migrations/0001_init.sql`)
`repair_orders` keeps a denormalized `truck_number` so an order survives truck edits, `order_number` is a sequence displayed as `RO-000123`, and `client_id` is the phone-generated idempotency key. Photos and signatures are files in the `repair-orders` bucket at `orders/<order id>/…`, referenced from `repair_order_photos.storage_path` and `repair_orders.signature_path`; the app serves them through `/api/files` using short-lived signed URLs after checking the viewer may see that order.

## Project layout

```
src/app/login              name picker + PIN pad
src/app/app                mechanic screens (home, orders, new, detail, edit)
src/app/manager            dashboard, order detail, trucks, staff
src/app/api                route handlers (auth, orders, photos, signature, pdf, files, manager/*)
src/components             SignaturePad, PhotoCapture, RepairOrderForm, OrderDetail, manager panels
src/lib/db.ts              all Supabase queries (service role, server only)
src/lib/session*.ts        JWT sessions and cookie helpers
src/lib/offline.ts         draft autosave + outbox (IndexedDB)
src/lib/pdf                the PDF document
src/proxy.ts               route protection
public/sw.js               service worker
supabase/migrations        schema
scripts/                   create-manager, seed-trucks
```

## Ideas for v2
- Structured parts line items with cost, so parts spend per truck can be reported.
- Email/Teams notification to the branch manager when an order arrives.
- Push the CSV (or a nightly export) into Power BI / the job-cost project.
- Native wrapper via Expo if you ever want it in the app stores — the API and screens would be reused as-is.
