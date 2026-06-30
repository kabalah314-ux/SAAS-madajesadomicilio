-- =========================================================
-- MASSFLOW - SECURITY HARDENING
-- =========================================================
-- Evita la escalada de privilegios en el auto-registro:
-- aunque alguien envíe role='admin' en la metadata del signUp,
-- el trigger lo fuerza a 'cliente'. Los admin SOLO se crean
-- por SQL directo o por la Edge Function admin-actions (que ya
-- verifica que el llamante es admin).
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
begin
  -- Solo se permiten 'cliente' o 'masajista' desde el auto-registro.
  -- Cualquier otro valor (incluido 'admin') cae a 'cliente'.
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente');
  if v_role not in ('cliente', 'masajista') then
    v_role := 'cliente';
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, v_role, v_full_name, new.email, new.raw_user_meta_data->>'phone');

  if v_role = 'cliente' then
    insert into public.clientes (id) values (new.id);
  elsif v_role = 'masajista' then
    insert into public.masajistas (id) values (new.id);
  end if;

  return new;
end;
$$;

-- El trigger on_auth_user_created ya existe (migración _logic);
-- esta redefinición de la función basta.
