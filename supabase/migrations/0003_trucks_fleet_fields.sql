-- Fleet fields on trucks, and branch names aligned with the PO / job-cost systems.
--
-- kind      'vehicle' | 'equipment' — groups the picker on the phone
-- asset_id  the accounting asset id from the PO system (the number before the
--           dash in its vehicle names, e.g. "14911 - 150" → asset 14911, unit 150)
-- source    where the record came from: 'po', 'jobcost', 'jobcost+po', 'manual'
--
-- Applied 2026-10-27, followed by a one-off import of 273 units merged from the
-- AccountingPO project (vehicles + equipment tables) and the job-cost project
-- (equipment table). The import itself isn't a migration; re-run a sync if the
-- source lists change.

alter table trucks add column if not exists kind text not null default 'vehicle';
alter table trucks drop constraint if exists trucks_kind_check;
alter table trucks add constraint trucks_kind_check check (kind in ('vehicle', 'equipment'));
alter table trucks add column if not exists asset_id text;
alter table trucks add column if not exists source text;
comment on column trucks.asset_id is 'Accounting asset id from the PO system (the number before the dash in its vehicle name)';
create index if not exists trucks_kind_idx on trucks (kind, active, truck_number);

-- Branch names: "New Rochelle" rather than "New Rochelle, NY", matching the PO app.
update staff         set branch = regexp_replace(branch, ', (NY|CT|NJ)$', '') where branch ~ ', (NY|CT|NJ)$';
update trucks        set branch = regexp_replace(branch, ', (NY|CT|NJ)$', '') where branch ~ ', (NY|CT|NJ)$';
update repair_orders set branch = regexp_replace(branch, ', (NY|CT|NJ)$', '') where branch ~ ', (NY|CT|NJ)$';
