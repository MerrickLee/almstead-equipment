-- English / Spanish support.
--
-- staff.language              the person's preferred language ('en' | 'es'); set
--                             from the EN|ES toggle and by managers on the staff page.
-- repair_orders.translations  machine translations of the free-text fields, keyed
--                             by field:  { "summary": { "src": "es", "es": "…", "en": "…" }, … }
--                             `src` is the language the mechanic wrote in; the
--                             app shows each reader their own language and keeps
--                             the original a tap away. Filled in by the server
--                             right after an order is saved (and lazily on read
--                             if that failed).

alter table staff add column if not exists language text;
alter table staff drop constraint if exists staff_language_check;
alter table staff add constraint staff_language_check check (language is null or language in ('en', 'es'));

alter table repair_orders add column if not exists translations jsonb;
comment on column repair_orders.translations is 'Per-field machine translations: { field: { src: en|es, en?: text, es?: text } }';
