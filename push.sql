-- ============================================================
--  PCW — Notifications push : à exécuter UNE fois dans Supabase
--  (SQL Editor). Avant ça : déployer la fonction "send-push" et
--  remplacer __PUSH_SECRET__ ci-dessous par ton secret (voir
--  LISEZMOI-NOTIFICATIONS.md).
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1) Appareils abonnés (un par navigateur / téléphone)
create table if not exists push_subscriptions (
  id bigserial primary key,
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "push_own_select" on push_subscriptions;
drop policy if exists "push_own_delete" on push_subscriptions;
create policy "push_own_select" on push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push_own_delete" on push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Enregistrement via fonction (gère aussi le cas d'un appareil qui change de compte)
create or replace function register_push(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_ua);
end $$;
grant execute on function register_push(text, text, text, text) to authenticated;

-- 2) Déclencheurs : chaque événement appelle la fonction send-push
--    (même mécanisme que les "Database Webhooks" du dashboard)
do $$
declare
  fn_url text := 'https://chlmceyretciqydrdpgp.supabase.co/functions/v1/send-push';
  hdrs  text := '{"Content-Type":"application/json","x-push-secret":"__PUSH_SECRET__"}';
begin
  execute 'drop trigger if exists push_messages on messages';
  execute format('create trigger push_messages after insert on messages for each row execute function supabase_functions.http_request(%L, ''POST'', %L, ''{}'', ''5000'')', fn_url, hdrs);
  execute 'drop trigger if exists push_demandes on demandes';
  execute format('create trigger push_demandes after insert or update on demandes for each row execute function supabase_functions.http_request(%L, ''POST'', %L, ''{}'', ''5000'')', fn_url, hdrs);
  execute 'drop trigger if exists push_fichiers on fichiers_clients';
  execute format('create trigger push_fichiers after insert on fichiers_clients for each row execute function supabase_functions.http_request(%L, ''POST'', %L, ''{}'', ''5000'')', fn_url, hdrs);
  execute 'drop trigger if exists push_devis on devis';
  execute format('create trigger push_devis after insert or update on devis for each row execute function supabase_functions.http_request(%L, ''POST'', %L, ''{}'', ''5000'')', fn_url, hdrs);
  execute 'drop trigger if exists push_factures on factures';
  execute format('create trigger push_factures after insert or update on factures for each row execute function supabase_functions.http_request(%L, ''POST'', %L, ''{}'', ''5000'')', fn_url, hdrs);
end $$;

-- 3) Rappels quotidiens (échéances, RDV, tâches) — 07:00 UTC = 8h/9h à Paris
select cron.unschedule('pcw-push-daily') where exists (select 1 from cron.job where jobname = 'pcw-push-daily');
select cron.schedule('pcw-push-daily', '0 7 * * *', $cron$
  select net.http_post(
    url := 'https://chlmceyretciqydrdpgp.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json","x-push-secret":"__PUSH_SECRET__"}'::jsonb,
    body := '{"type":"daily"}'::jsonb
  );
$cron$);
