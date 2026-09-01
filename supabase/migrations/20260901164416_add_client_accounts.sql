begin;

create table public.cuentas_clientes (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id) on delete restrict,
  password_hash text not null,
  estado boolean not null default true,
  debe_cambiar_password boolean not null default false,
  intentos_fallidos smallint not null default 0,
  bloqueado_hasta timestamptz,
  version_sesion integer not null default 1,
  ultimo_acceso timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint cuentas_clientes_cliente_unique unique (cliente_id),
  constraint cuentas_clientes_password_no_vacio check (btrim(password_hash) <> ''),
  constraint cuentas_clientes_intentos_check check (intentos_fallidos >= 0),
  constraint cuentas_clientes_version_check check (version_sesion >= 1)
);

create index cuentas_clientes_bloqueo_idx
  on public.cuentas_clientes (bloqueado_hasta)
  where bloqueado_hasta is not null;

create trigger cuentas_clientes_actualizado_en
before update on public.cuentas_clientes
for each row execute function public.set_actualizado_en();

alter table public.cuentas_clientes enable row level security;

do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_catalog.pg_roles where rolname = api_role) then
      execute format('revoke all on table public.cuentas_clientes from %I', api_role);
      execute format('revoke all on sequence public.cuentas_clientes_id_seq from %I', api_role);
    end if;
  end loop;
end;
$$;

alter table public.movimientos
  drop constraint movimientos_tipo;

alter table public.movimientos
  add constraint movimientos_tipo check (
    tipo in ('prestamo', 'devolucion', 'ingreso_libro', 'edicion_libro', 'rechazo_solicitud', 'gestion_cuenta')
  );

commit;
