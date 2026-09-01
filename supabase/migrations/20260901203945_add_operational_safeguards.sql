begin;

alter table public.libros
  add column cantidad_no_disponible integer not null default 0,
  add constraint libros_cantidad_no_disponible check (
    cantidad_no_disponible between 0 and cantidad_total
  );

comment on column public.libros.cantidad_no_disponible is
  'Ejemplares fuera de circulación por daño o reparación. Se descuentan de la disponibilidad sin borrar el historial.';

alter table public.prestamos
  add column fecha_expiracion_retiro timestamptz;

update public.prestamos
   set fecha_expiracion_retiro = coalesce(fecha_aprobacion, now()) + interval '5 days'
 where estado = 'listo_retiro';

alter table public.prestamos
  drop constraint prestamos_estado,
  add constraint prestamos_estado check (
    estado in ('pendiente', 'listo_retiro', 'activo', 'atrasado', 'devuelto', 'rechazado', 'expirado')
  ),
  add constraint prestamos_expiracion_retiro check (
    estado <> 'listo_retiro' or fecha_expiracion_retiro is not null
  );

create index prestamos_expiracion_retiro_idx
  on public.prestamos (fecha_expiracion_retiro)
  where estado = 'listo_retiro';

alter table public.cuentas_clientes
  add column motivo_inactivacion text,
  add column inactivada_en timestamptz,
  add column inactivada_por bigint references public.cuentas_personal(id) on delete set null;

create table public.incidencias_prestamo (
  id bigint generated always as identity primary key,
  prestamo_id bigint not null references public.prestamos(id) on delete restrict,
  prestamo_detalle_id bigint not null references public.prestamo_detalles(id) on delete restrict,
  libro_id bigint not null references public.libros(id) on delete restrict,
  tipo text not null,
  cantidad integer not null,
  comentario text,
  estado text not null default 'abierta',
  registrada_por bigint not null references public.cuentas_personal(id) on delete restrict,
  registrada_en timestamptz not null default now(),
  resolucion text,
  comentario_resolucion text,
  resuelta_por bigint references public.cuentas_personal(id) on delete restrict,
  resuelta_en timestamptz,
  constraint incidencias_tipo check (tipo in ('danado', 'reparacion', 'extraviado')),
  constraint incidencias_cantidad check (cantidad > 0),
  constraint incidencias_estado check (estado in ('abierta', 'resuelta')),
  constraint incidencias_resolucion check (
    (estado = 'abierta' and resolucion is null and resuelta_por is null and resuelta_en is null)
    or (estado = 'resuelta' and resolucion in ('reintegrado', 'recuperado', 'baja') and resuelta_por is not null and resuelta_en is not null)
  )
);

create index incidencias_prestamo_estado_idx
  on public.incidencias_prestamo (estado, registrada_en desc);
create index incidencias_prestamo_prestamo_idx
  on public.incidencias_prestamo (prestamo_id);
create index incidencias_prestamo_libro_idx
  on public.incidencias_prestamo (libro_id);

alter table public.incidencias_prestamo enable row level security;

do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_catalog.pg_roles where rolname = api_role) then
      execute format('revoke all on table public.incidencias_prestamo from %I', api_role);
      execute format('revoke all on sequence public.incidencias_prestamo_id_seq from %I', api_role);
    end if;
  end loop;
end;
$$;

alter table public.movimientos
  drop constraint movimientos_tipo,
  add constraint movimientos_tipo check (
    tipo in (
      'prestamo', 'devolucion', 'ingreso_libro', 'edicion_libro',
      'rechazo_solicitud', 'gestion_cuenta', 'correccion_prestamo',
      'cancelacion_retiro', 'incidencia'
    )
  );

alter table public.movimientos
  drop constraint movimientos_actor,
  add constraint movimientos_actor check (
    tipo_actor in ('cliente', 'bibliotecario', 'administrador', 'sistema')
  );

commit;
