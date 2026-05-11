-- =========================================================
-- TRIGGER: handle_new_user
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
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente');
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- TRIGGER: updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated   before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_masajistas_updated before update on public.masajistas for each row execute function public.set_updated_at();
create trigger trg_clientes_updated   before update on public.clientes for each row execute function public.set_updated_at();
create trigger trg_servicios_updated  before update on public.servicios for each row execute function public.set_updated_at();
create trigger trg_reservas_updated   before update on public.reservas for each row execute function public.set_updated_at();
create trigger trg_pagos_updated      before update on public.pagos_stripe for each row execute function public.set_updated_at();

-- =========================================================
-- TRIGGER: rating masajista
-- =========================================================
create or replace function public.recalc_rating_masajista()
returns trigger language plpgsql as $$
begin
  update public.masajistas m
  set rating_promedio = sub.avg_p,
      total_sesiones  = sub.cnt
  from (
    select masajista_id, round(avg(puntuacion)::numeric, 2) as avg_p, count(*) as cnt
    from public.valoraciones
    where masajista_id = new.masajista_id
    group by masajista_id
  ) sub
  where m.id = sub.masajista_id;
  return new;
end; $$;

create trigger trg_valoraciones_rating
  after insert on public.valoraciones
  for each row execute function public.recalc_rating_masajista();

-- =========================================================
-- TRIGGER: notificaciones
-- =========================================================
create or replace function public.notify_reserva_event()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' and new.masajista_id is not null then
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Nueva solicitud',
            'Tienes una nueva solicitud de reserva ' || new.codigo,
            jsonb_build_object('reserva_id', new.id));
  end if;

  if TG_OP = 'UPDATE' and old.estado <> new.estado then
    if new.estado = 'aceptada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_aceptada', 'Reserva confirmada',
              'Tu reserva ' || new.codigo || ' fue aceptada',
              jsonb_build_object('reserva_id', new.id));
    elsif new.estado = 'rechazada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_rechazada', 'Reserva rechazada',
              'Tu reserva ' || new.codigo || ' fue rechazada',
              jsonb_build_object('reserva_id', new.id, 'motivo', new.rechazo_motivo));
    elsif new.estado = 'cancelada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (
        case when new.cancelado_por = new.cliente_id then new.masajista_id else new.cliente_id end,
        'reserva_cancelada', 'Reserva cancelada',
        'La reserva ' || new.codigo || ' fue cancelada',
        jsonb_build_object('reserva_id', new.id));
    end if;
  end if;
  return new;
end; $$;

create trigger trg_reservas_notify
  after insert or update on public.reservas
  for each row execute function public.notify_reserva_event();

-- =========================================================
-- VISTA: kpis_admin
-- =========================================================
create or replace view public.v_admin_kpis as
select
  (select count(*) from public.reservas where estado = 'completada' and date_trunc('month', fecha) = date_trunc('month', now())) as reservas_mes,
  (select coalesce(sum(precio_total),0) from public.reservas where estado='completada' and date_trunc('month',fecha)=date_trunc('month',now())) as ingresos_mes,
  (select coalesce(sum(comision_monto),0) from public.reservas where estado='completada' and date_trunc('month',fecha)=date_trunc('month',now())) as comisiones_mes,
  (select count(*) from public.masajistas where is_verified = true and is_suspended = false) as masajistas_activos,
  (select count(*) from public.clientes where is_blocked = false) as clientes_activos;

-- =========================================================
-- RPC FUNCTION: get_masajista_pending_earnings
-- =========================================================
create or replace function public.get_masajista_pending_earnings(masajista_id uuid)
returns table(total_sesiones bigint, monto_total numeric)
language sql
stable
as $$
  select
    count(*)::bigint as total_sesiones,
    coalesce(sum(pago_masajista), 0) as monto_total
  from public.reservas
  where reservas.masajista_id = $1
    and reservas.estado = 'completada'
    and reservas.pago_estado = 'pagado'
    and reservas.id not in (
      select unnest(string_to_array(coalesce(referencia, ''), ','))::uuid
      from public.transferencias
      where transferencias.masajista_id = $1
        and transferencias.estado in ('enviada', 'confirmada')
    );
$$;
