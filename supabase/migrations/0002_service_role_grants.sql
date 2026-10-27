-- Grant the service role access to the app's tables.
--
-- The Supabase project was created with "Automatically expose new tables"
-- turned OFF (recommended for security), which means tables created in the
-- public schema get no Data API grants — not even for service_role. Without
-- this, the app sees "permission denied for table staff".
--
-- anon and authenticated are deliberately NOT granted anything: the app only
-- ever uses the service-role key from the server.

grant usage on schema public to service_role;
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute       on all functions  in schema public to service_role;

-- …and for any table added by later migrations.
alter default privileges in schema public grant all     on tables    to service_role;
alter default privileges in schema public grant all     on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
