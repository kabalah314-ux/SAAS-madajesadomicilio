-- =========================================================
-- MASSFLOW · B6 — Capa legal / RGPD
-- =========================================================
-- Registra el consentimiento del usuario con FECHA y VERSIÓN:
--  · Términos + Política de Privacidad (en el registro).
--  · Datos de salud (categoría especial, Art. 9.2.a) cuando la
--    clienta rellena el campo de notas de salud.
-- El texto legal vive en el front (src/legal.ts) marcado como
-- BORRADOR pendiente de revisión por asesoría.
-- =========================================================

-- Aceptación de Términos/Privacidad en el perfil.
alter table public.profiles
  add column if not exists acepto_terminos_en timestamptz,
  add column if not exists terminos_version    text;

-- Consentimiento explícito de tratamiento de datos de salud (Art. 9 RGPD).
alter table public.clientes
  add column if not exists consentimiento_salud_en      timestamptz,
  add column if not exists consentimiento_salud_version text;

-- El trigger de alta registra la aceptación de Términos que venga en la
-- metadata del signUp (acepto_terminos=true + terminos_version).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
  v_acepto boolean;
  v_terms_version text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente');
  if v_role not in ('cliente', 'masajista') then
    v_role := 'cliente';
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_acepto := coalesce((new.raw_user_meta_data->>'acepto_terminos')::boolean, false);
  v_terms_version := new.raw_user_meta_data->>'terminos_version';

  insert into public.profiles (id, role, full_name, email, phone, acepto_terminos_en, terminos_version)
  values (
    new.id, v_role, v_full_name, new.email, new.raw_user_meta_data->>'phone',
    case when v_acepto then now() else null end,
    case when v_acepto then v_terms_version else null end
  );

  if v_role = 'cliente' then
    insert into public.clientes (id) values (new.id);
  elsif v_role = 'masajista' then
    insert into public.masajistas (id) values (new.id);
  end if;

  return new;
end;
$$;
