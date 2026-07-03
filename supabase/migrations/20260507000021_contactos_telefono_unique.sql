-- =========================================================
-- MASSFLOW · A2 (auditoría ronda 2) — teléfono de contactos único y normalizado
-- =========================================================
-- Complemento en BD de la normalización de teléfono que hace el agente: se
-- normalizan los teléfonos ya existentes (quitando espacios/guiones/paréntesis/
-- puntos) y se añade un UNIQUE para impedir contactos duplicados por el mismo
-- número. NULL sigue permitido varias veces (contactos sin teléfono).

update public.contactos
set telefono = regexp_replace(telefono, '[\s\-().]', '', 'g')
where telefono is not null
  and telefono <> regexp_replace(telefono, '[\s\-().]', '', 'g');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_contactos_telefono'
      and conrelid = 'public.contactos'::regclass
  ) then
    alter table public.contactos add constraint uq_contactos_telefono unique (telefono);
  end if;
end $$;
