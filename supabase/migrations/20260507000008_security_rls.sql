-- =========================================================
-- MASSFLOW · CIERRE DE LOS 3 AGUJEROS RLS (B1, B2, B3)
-- =========================================================
-- Auditoría "¿vendible?" (harness/06_VENDIBLE.md). Los 3 son
-- explotables HOY contra la BD real. Se arreglan con triggers
-- BEFORE (congelan columnas sensibles para no-admin) + WITH CHECK
-- + cálculo de importes en la BD (el cliente deja de mover dinero).
--
-- Patrón de "actor de confianza": admin (is_admin()) o código de
-- servidor con service_role (auth.uid() IS NULL, p.ej. Edge
-- Functions / cron). Para esos dos, los triggers NO congelan nada.
-- =========================================================


-- =========================================================
-- B1 · Una masajista no puede auto-verificarse ni inflar su rating
-- =========================================================
-- La policy masajistas_update_own dejaba a la masajista editar SU
-- fila sin restricción de columnas → podía poner is_verified=true,
-- rating_promedio=5, total_sesiones=999, quitarse la suspensión, etc.
-- Trigger que congela esas columnas salvo actor de confianza.
create or replace function public.masajistas_freeze_sensitive()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- admin o service_role (auth.uid() null) pueden cambiar todo
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  -- Resto (la propia masajista): se congelan las columnas sensibles
  new.is_verified                 := old.is_verified;
  new.is_suspended                := old.is_suspended;
  new.suspension_reason           := old.suspension_reason;
  new.rating_promedio             := old.rating_promedio;
  new.total_sesiones              := old.total_sesiones;
  new.stripe_account_id           := old.stripe_account_id;
  new.stripe_onboarding_completed := old.stripe_onboarding_completed;
  return new;
end;
$$;

drop trigger if exists trg_masajistas_freeze_sensitive on public.masajistas;
create trigger trg_masajistas_freeze_sensitive
  before update on public.masajistas
  for each row execute function public.masajistas_freeze_sensitive();


-- =========================================================
-- B2a · Los importes los calcula la BD, no el cliente
-- =========================================================
-- precio_total := precio del servicio (fuente de verdad), con tope
-- precio_maximo_eur; comisión y pago_masajista derivados de
-- configuracion.comision_pct. Lo que mande el cliente se ignora.
create or replace function public.reservas_calc_importes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_comision_pct    numeric;
  v_precio_max      numeric;
  v_servicio_precio numeric;
begin
  select (valor #>> '{}')::numeric into v_comision_pct
  from public.configuracion where clave = 'comision_pct';
  v_comision_pct := coalesce(v_comision_pct, 25);

  select (valor #>> '{}')::numeric into v_precio_max
  from public.configuracion where clave = 'precio_maximo_eur';

  -- precio canónico = el del servicio (FK garantiza que existe)
  select precio_eur into v_servicio_precio
  from public.servicios where id = new.servicio_id;
  if v_servicio_precio is not null then
    new.precio_total := v_servicio_precio;
  end if;

  if v_precio_max is not null and new.precio_total > v_precio_max then
    new.precio_total := v_precio_max;
  end if;

  new.comision_pct   := v_comision_pct;
  new.comision_monto := round(new.precio_total * v_comision_pct / 100.0, 2);
  new.pago_masajista := round(new.precio_total - new.comision_monto, 2);
  return new;
end;
$$;

drop trigger if exists trg_reservas_calc_importes on public.reservas;
create trigger trg_reservas_calc_importes
  before insert on public.reservas
  for each row execute function public.reservas_calc_importes();


-- =========================================================
-- B2b · Congelar dinero/identidad y restringir estados en UPDATE
-- =========================================================
-- La policy reservas_update_participants no tenía WITH CHECK → una
-- clienta podía cambiar precio_total/comision/pago_masajista, marcar
-- 'completada' o reasignar la reserva. Trigger que, para no-admin:
--   · congela importes, identidad (cliente/servicio/codigo) y pago
--   · solo permite asignar masajista vía "claim" (null -> uno mismo)
--   · limita transiciones: clienta solo cancela; masajista
--     acepta/rechaza/completa/cancela
create or replace function public.reservas_guard_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- admin o service_role: sin restricción
  if public.is_admin() or v_uid is null then
    return new;
  end if;

  -- Congelar dinero e identidad
  new.cliente_id               := old.cliente_id;
  new.servicio_id              := old.servicio_id;
  new.codigo                   := old.codigo;
  new.precio_total             := old.precio_total;
  new.comision_pct             := old.comision_pct;
  new.comision_monto           := old.comision_monto;
  new.pago_masajista           := old.pago_masajista;
  new.pago_estado              := old.pago_estado;
  new.stripe_payment_intent_id := old.stripe_payment_intent_id;

  -- masajista_id: solo se puede cambiar como "claim" (null -> uno mismo)
  if new.masajista_id is distinct from old.masajista_id then
    if not (old.masajista_id is null and new.masajista_id = v_uid) then
      new.masajista_id := old.masajista_id;
    end if;
  end if;

  -- Transiciones de estado permitidas según quién actúa
  if new.estado is distinct from old.estado then
    if v_uid = old.cliente_id then
      if new.estado <> 'cancelada' then
        raise exception 'La clienta solo puede cancelar la reserva';
      end if;
    elsif v_uid = new.masajista_id then
      if new.estado not in ('aceptada','rechazada','completada','cancelada') then
        raise exception 'Transición de estado no permitida para la masajista';
      end if;
    else
      raise exception 'No autorizado a cambiar el estado de la reserva';
    end if;

    -- registrar quién cancela (para notificaciones correctas)
    if new.estado = 'cancelada' and new.cancelado_por is null then
      new.cancelado_por := v_uid;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservas_guard_update on public.reservas;
create trigger trg_reservas_guard_update
  before update on public.reservas
  for each row execute function public.reservas_guard_update();

-- WITH CHECK en la policy de participantes: tras el update la fila
-- debe seguir perteneciendo a quien la edita (defensa en profundidad).
drop policy if exists "reservas_update_participants" on public.reservas;
create policy "reservas_update_participants"
  on public.reservas for update
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  )
  with check (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );


-- =========================================================
-- B3 · Fuga de PII: solo una MASAJISTA asignada ve al cliente
-- =========================================================
-- La rama EXISTS no comprobaba is_masajista(), así que la condición
-- "soy la masajista de una reserva de este cliente" podía cumplirse
-- por integridad de datos para un no-masajista. Se exige is_masajista().
drop policy if exists "clientes_select_own_or_admin_or_assigned_masajista" on public.clientes;
create policy "clientes_select_own_or_admin_or_assigned_masajista"
  on public.clientes for select
  using (
    auth.uid() = id
    or public.is_admin()
    or (
      public.is_masajista()
      and exists (
        select 1 from public.reservas r
        where r.cliente_id = clientes.id
          and r.masajista_id = auth.uid()
      )
    )
  );
