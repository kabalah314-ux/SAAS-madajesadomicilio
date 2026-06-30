-- =========================================================
-- MASSFLOW · AUTOMATIZACIÓN (pg_cron)
-- =========================================================
-- Programa la expiración automática de solicitudes pendientes
-- sin asignar, llamando a la Edge Function `expire-reservas`
-- cada 15 minutos (ella misma marca 'expirada' y notifica a la clienta).
-- =========================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotente: quita la tarea anterior si existía.
delete from cron.job where jobname = 'expire-reservas-cada-15min';

select cron.schedule(
  'expire-reservas-cada-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://lzvbfmphtrhvrjjnvqtt.supabase.co/functions/v1/expire-reservas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_TAmhMRMcS57-X2pk9Te2Pg_PEljMC3n'
    ),
    body := '{}'::jsonb
  );
  $$
);
