begin;

create extension if not exists pgcrypto;

create table public.libros (
  id bigint generated always as identity primary key,
  id_libro_texto text not null,
  tipo_material text not null,
  tipo_material_otro text,
  genero text not null,
  genero_otro text,
  titulo text not null,
  descripcion text,
  anio_publicacion integer,
  cantidad_total integer not null default 0,
  portada_path text,
  portada_mime text,
  digital_disponible boolean not null default false,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint libros_id_texto_no_vacio check (btrim(id_libro_texto) <> ''),
  constraint libros_titulo_no_vacio check (btrim(titulo) <> ''),
  constraint libros_tipo_material check (tipo_material in ('libro', 'revista', 'folleto', 'tesis', 'otro')),
  constraint libros_genero check (genero in ('lirico', 'poesia', 'narrativa', 'ensayo', 'otro')),
  constraint libros_tipo_otro check (tipo_material <> 'otro' or nullif(btrim(tipo_material_otro), '') is not null),
  constraint libros_genero_otro check (genero <> 'otro' or nullif(btrim(genero_otro), '') is not null),
  constraint libros_anio_publicacion check (anio_publicacion is null or anio_publicacion between 1000 and 2200),
  constraint libros_cantidad_total check (cantidad_total >= 0)
);

create unique index libros_id_libro_texto_unique on public.libros (lower(id_libro_texto));
create index libros_titulo_idx on public.libros (lower(titulo));
create index libros_tipo_genero_idx on public.libros (tipo_material, genero) where activo;

create table public.autores (
  id bigint generated always as identity primary key,
  nombre_completo text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint autores_nombre_no_vacio check (btrim(nombre_completo) <> '')
);

create unique index autores_nombre_unique on public.autores (lower(nombre_completo));

create table public.libro_autores (
  libro_id bigint not null references public.libros(id) on delete cascade,
  autor_id bigint not null references public.autores(id) on delete restrict,
  orden smallint not null default 1,
  primary key (libro_id, autor_id),
  constraint libro_autores_orden check (orden > 0)
);

create index libro_autores_autor_idx on public.libro_autores (autor_id);

create table public.archivos_digitales (
  id bigint generated always as identity primary key,
  libro_id bigint not null references public.libros(id) on delete cascade,
  nombre_original text not null,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  tamano_bytes bigint not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  desactivado_en timestamptz,
  constraint archivos_tamano check (tamano_bytes >= 0)
);

create unique index archivos_digitales_activo_unique on public.archivos_digitales (libro_id) where activo;

create table public.clientes (
  id bigint generated always as identity primary key,
  identificacion text not null,
  nombre_completo text not null,
  telefono text,
  correo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint clientes_identificacion_no_vacia check (btrim(identificacion) <> ''),
  constraint clientes_nombre_no_vacio check (btrim(nombre_completo) <> ''),
  constraint clientes_contacto check (nullif(btrim(telefono), '') is not null or nullif(btrim(correo), '') is not null)
);

create unique index clientes_identificacion_unique on public.clientes (upper(identificacion));

create table public.cuentas_personal (
  id bigint generated always as identity primary key,
  nombre_completo text not null,
  usuario text not null,
  password_hash text not null,
  rol text not null,
  estado boolean not null default true,
  ultimo_acceso timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint cuentas_nombre_no_vacio check (btrim(nombre_completo) <> ''),
  constraint cuentas_usuario_no_vacio check (btrim(usuario) <> ''),
  constraint cuentas_rol check (rol in ('bibliotecario', 'administrador'))
);

create unique index cuentas_personal_usuario_unique on public.cuentas_personal (lower(usuario));

create table public.prestamos (
  id bigint generated always as identity primary key,
  codigo text not null default ('SOL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  cliente_id bigint not null references public.clientes(id) on delete restrict,
  bibliotecario_id bigint references public.cuentas_personal(id) on delete restrict,
  fecha_solicitud timestamptz not null default now(),
  fecha_aprobacion timestamptz,
  fecha_entrega timestamptz,
  fecha_limite date,
  fecha_devolucion timestamptz,
  estado text not null default 'pendiente',
  motivo_rechazo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint prestamos_codigo_unique unique (codigo),
  constraint prestamos_estado check (estado in ('pendiente', 'activo', 'atrasado', 'devuelto', 'rechazado')),
  constraint prestamos_fechas_activas check (
    estado not in ('activo', 'atrasado', 'devuelto')
    or (bibliotecario_id is not null and fecha_aprobacion is not null and fecha_entrega is not null and fecha_limite is not null)
  )
);

create index prestamos_estado_fecha_idx on public.prestamos (estado, fecha_solicitud desc);
create index prestamos_cliente_estado_idx on public.prestamos (cliente_id, estado);
create index prestamos_fecha_limite_idx on public.prestamos (fecha_limite) where estado = 'activo';

create table public.prestamo_detalles (
  id bigint generated always as identity primary key,
  prestamo_id bigint not null references public.prestamos(id) on delete cascade,
  libro_id bigint not null references public.libros(id) on delete restrict,
  cantidad_solicitada integer not null,
  cantidad_devuelta integer not null default 0,
  fecha_ultima_devolucion timestamptz,
  constraint prestamo_detalles_linea_unique unique (prestamo_id, libro_id),
  constraint prestamo_detalles_cantidad check (cantidad_solicitada > 0),
  constraint prestamo_detalles_devolucion check (cantidad_devuelta between 0 and cantidad_solicitada)
);

create index prestamo_detalles_libro_idx on public.prestamo_detalles (libro_id);

create table public.movimientos (
  id bigint generated always as identity primary key,
  tipo text not null,
  fecha_hora timestamptz not null default now(),
  tipo_actor text not null,
  cliente_id bigint references public.clientes(id) on delete set null,
  cuenta_personal_id bigint references public.cuentas_personal(id) on delete set null,
  actor_nombre text not null,
  libro_id bigint references public.libros(id) on delete set null,
  prestamo_id bigint references public.prestamos(id) on delete set null,
  detalle text,
  constraint movimientos_tipo check (tipo in ('prestamo', 'devolucion', 'ingreso_libro', 'edicion_libro', 'rechazo_solicitud')),
  constraint movimientos_actor check (tipo_actor in ('cliente', 'bibliotecario', 'administrador')),
  constraint movimientos_actor_nombre check (btrim(actor_nombre) <> '')
);

create index movimientos_fecha_idx on public.movimientos (fecha_hora desc);
create index movimientos_tipo_idx on public.movimientos (tipo, fecha_hora desc);
create index movimientos_libro_idx on public.movimientos (libro_id) where libro_id is not null;
create index movimientos_prestamo_idx on public.movimientos (prestamo_id) where prestamo_id is not null;

create function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger libros_actualizado_en before update on public.libros
for each row execute function public.set_actualizado_en();
create trigger autores_actualizado_en before update on public.autores
for each row execute function public.set_actualizado_en();
create trigger clientes_actualizado_en before update on public.clientes
for each row execute function public.set_actualizado_en();
create trigger cuentas_actualizado_en before update on public.cuentas_personal
for each row execute function public.set_actualizado_en();
create trigger prestamos_actualizado_en before update on public.prestamos
for each row execute function public.set_actualizado_en();

-- La API Express es el único acceso de la aplicación. Se habilita RLS como
-- defensa en profundidad y se revocan todos los privilegios de Data API.
alter table public.libros enable row level security;
alter table public.autores enable row level security;
alter table public.libro_autores enable row level security;
alter table public.archivos_digitales enable row level security;
alter table public.clientes enable row level security;
alter table public.cuentas_personal enable row level security;
alter table public.prestamos enable row level security;
alter table public.prestamo_detalles enable row level security;
alter table public.movimientos enable row level security;

revoke all on table public.libros, public.autores, public.libro_autores,
  public.archivos_digitales, public.clientes, public.cuentas_personal,
  public.prestamos, public.prestamo_detalles, public.movimientos
from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;
revoke execute on function public.set_actualizado_en() from public;

commit;
