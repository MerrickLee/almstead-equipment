-- Almstead Equipment Repair Orders — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Access model: the Next.js server talks to Supabase with the service-role key.
-- Row Level Security is enabled on every table with NO policies, so the anon
-- and authenticated keys can read nothing. All authorization happens in the app.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type staff_role as enum ('mechanic', 'manager');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('submitted', 'reviewed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Staff (mechanics and managers). Passcodes are bcrypt hashes; mechanics use a
-- 4–6 digit PIN, managers a longer passcode.
-- ---------------------------------------------------------------------------
create table if not exists staff (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  role            staff_role not null default 'mechanic',
  branch          text,
  passcode_hash   text not null,
  active          boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists staff_active_idx on staff (active, role, full_name);

-- ---------------------------------------------------------------------------
-- Trucks / equipment master list
-- ---------------------------------------------------------------------------
create table if not exists trucks (
  id            uuid primary key default gen_random_uuid(),
  truck_number  text not null unique,
  description   text,
  branch        text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists trucks_active_idx on trucks (active, truck_number);

-- ---------------------------------------------------------------------------
-- Repair orders — one row per paper form
-- ---------------------------------------------------------------------------
create table if not exists repair_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        bigserial unique,                 -- displayed as RO-000123
  client_id           uuid unique,                      -- generated on the phone; makes offline re-sends idempotent
  mechanic_id         uuid not null references staff (id),
  truck_id            uuid references trucks (id),
  truck_number        text not null,                    -- denormalized so the order survives truck edits
  branch              text,
  work_date           date not null default current_date,
  location            text,
  mileage             integer,
  travel_time_minutes integer,
  total_hours         numeric(6,2),
  summary             text,                             -- "Summary description of work"
  work_performed      text,
  parts_materials     text,
  start_time          time,
  finish_time         time,
  signature_path      text,                             -- storage path of the signature PNG
  status              order_status not null default 'submitted',
  reviewed_by         uuid references staff (id),
  reviewed_at         timestamptz,
  manager_notes       text,
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists repair_orders_mechanic_idx on repair_orders (mechanic_id, work_date desc);
create index if not exists repair_orders_truck_idx    on repair_orders (truck_id, work_date desc);
create index if not exists repair_orders_date_idx     on repair_orders (work_date desc, order_number desc);
create index if not exists repair_orders_status_idx   on repair_orders (status);

-- ---------------------------------------------------------------------------
-- Photos attached to an order (files live in the "repair-orders" storage bucket)
-- ---------------------------------------------------------------------------
create table if not exists repair_order_photos (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references repair_orders (id) on delete cascade,
  storage_path  text not null,
  caption       text,
  created_at    timestamptz not null default now()
);

create index if not exists repair_order_photos_order_idx on repair_order_photos (order_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists staff_set_updated_at on staff;
create trigger staff_set_updated_at before update on staff
  for each row execute function set_updated_at();

drop trigger if exists trucks_set_updated_at on trucks;
create trigger trucks_set_updated_at before update on trucks
  for each row execute function set_updated_at();

drop trigger if exists repair_orders_set_updated_at on repair_orders;
create trigger repair_orders_set_updated_at before update on repair_orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock everything down. The app uses the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table staff               enable row level security;
alter table trucks              enable row level security;
alter table repair_orders       enable row level security;
alter table repair_order_photos enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for photos and signatures (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('repair-orders', 'repair-orders', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
