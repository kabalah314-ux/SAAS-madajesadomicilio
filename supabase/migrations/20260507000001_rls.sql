-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================
create or replace function public.current_role()
returns user_role
language sql stable security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_masajista()
returns boolean language sql stable as $$
  select public.current_role() = 'masajista';
$$;

create or replace function public.is_cliente()
returns boolean language sql stable as $$
  select public.current_role() = 'cliente';
$$;

-- =========================================================
-- ACTIVAR RLS
-- =========================================================
alter table public.profiles        enable row level security;
alter table public.masajistas      enable row level security;
alter table public.clientes        enable row level security;
alter table public.servicios       enable row level security;
alter table public.disponibilidad  enable row level security;
alter table public.reservas        enable row level security;
alter table public.valoraciones    enable row level security;
alter table public.documentos      enable row level security;
alter table public.ciclos_pago     enable row level security;
alter table public.transferencias  enable row level security;
alter table public.notificaciones  enable row level security;
alter table public.configuracion   enable row level security;
alter table public.pagos_stripe    enable row level security;
alter table public.audit_log       enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using ( auth.uid() = id or public.is_admin() );

create policy "profiles_update_own"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id and role = (select role from public.profiles where id = auth.uid()) );

create policy "profiles_admin_all"
  on public.profiles for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =========================================================
-- MASAJISTAS
-- =========================================================
create policy "masajistas_select_public"
  on public.masajistas for select
  using ( true );

create policy "masajistas_update_own"
  on public.masajistas for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "masajistas_admin_all"
  on public.masajistas for all
  using ( public.is_admin() );

-- =========================================================
-- CLIENTES
-- =========================================================
create policy "clientes_select_own_or_admin_or_assigned_masajista"
  on public.clientes for select
  using (
    auth.uid() = id
    or public.is_admin()
    or exists (
      select 1 from public.reservas r
      where r.cliente_id = clientes.id
        and r.masajista_id = auth.uid()
    )
  );

create policy "clientes_update_own"
  on public.clientes for update
  using ( auth.uid() = id ) with check ( auth.uid() = id );

create policy "clientes_admin_all"
  on public.clientes for all using ( public.is_admin() );

-- =========================================================
-- SERVICIOS
-- =========================================================
create policy "servicios_select_all"
  on public.servicios for select using ( is_active = true or public.is_admin() );

create policy "servicios_admin_write"
  on public.servicios for all using ( public.is_admin() ) with check ( public.is_admin() );

-- =========================================================
-- DISPONIBILIDAD
-- =========================================================
create policy "disp_select_all"
  on public.disponibilidad for select using ( true );

create policy "disp_owner_write"
  on public.disponibilidad for all
  using ( masajista_id = auth.uid() or public.is_admin() )
  with check ( masajista_id = auth.uid() or public.is_admin() );

-- =========================================================
-- RESERVAS
-- =========================================================
create policy "reservas_select_visible"
  on public.reservas for select
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );

create policy "reservas_insert_cliente"
  on public.reservas for insert
  with check ( cliente_id = auth.uid() and public.is_cliente() );

create policy "reservas_update_participants"
  on public.reservas for update
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );

create policy "reservas_delete_admin"
  on public.reservas for delete using ( public.is_admin() );

-- =========================================================
-- VALORACIONES
-- =========================================================
create policy "valoraciones_select_all"
  on public.valoraciones for select using ( true );

create policy "valoraciones_insert_cliente"
  on public.valoraciones for insert
  with check (
    cliente_id = auth.uid()
    and exists (
      select 1 from public.reservas r
      where r.id = valoraciones.reserva_id
        and r.cliente_id = auth.uid()
        and r.estado = 'completada'
    )
  );

-- =========================================================
-- DOCUMENTOS
-- =========================================================
create policy "documentos_owner_or_admin_select"
  on public.documentos for select
  using ( masajista_id = auth.uid() or public.is_admin() );

create policy "documentos_owner_insert"
  on public.documentos for insert
  with check ( masajista_id = auth.uid() );

create policy "documentos_owner_update_own"
  on public.documentos for update
  using ( masajista_id = auth.uid() and estado = 'pendiente' );

create policy "documentos_admin_all"
  on public.documentos for all using ( public.is_admin() );

-- =========================================================
-- CICLOS + TRANSFERENCIAS
-- =========================================================
create policy "ciclos_admin"
  on public.ciclos_pago for all using ( public.is_admin() ) with check ( public.is_admin() );

create policy "transfer_admin_all"
  on public.transferencias for all using ( public.is_admin() );

create policy "transfer_select_own"
  on public.transferencias for select
  using ( masajista_id = auth.uid() or public.is_admin() );

-- =========================================================
-- NOTIFICACIONES
-- =========================================================
create policy "notif_select_own"
  on public.notificaciones for select using ( user_id = auth.uid() );

create policy "notif_update_own"
  on public.notificaciones for update using ( user_id = auth.uid() );

-- =========================================================
-- CONFIGURACION
-- =========================================================
create policy "config_select_all"
  on public.configuracion for select using ( true );

create policy "config_admin_write"
  on public.configuracion for all using ( public.is_admin() ) with check ( public.is_admin() );

-- =========================================================
-- PAGOS_STRIPE
-- =========================================================
create policy "pagos_select_visible"
  on public.pagos_stripe for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.reservas r
      where r.id = pagos_stripe.reserva_id
        and (r.cliente_id = auth.uid() or r.masajista_id = auth.uid())
    )
  );

-- =========================================================
-- AUDIT LOG
-- =========================================================
create policy "audit_admin_only"
  on public.audit_log for select using ( public.is_admin() );
