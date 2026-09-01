alter table public.prestamo_detalles
  add column cantidad_aprobada integer,
  add column motivo_rechazo text;

update public.prestamo_detalles d
   set cantidad_aprobada = case
         when p.estado = 'pendiente' then null
         when p.estado = 'rechazado' then 0
         else d.cantidad_solicitada
       end,
       motivo_rechazo = case
         when p.estado = 'rechazado' then coalesce(p.motivo_rechazo, 'Solicitud rechazada.')
         else null
       end
  from public.prestamos p
 where p.id = d.prestamo_id;

alter table public.prestamo_detalles
  drop constraint prestamo_detalles_devolucion;

alter table public.prestamo_detalles
  add constraint prestamo_detalles_cantidad_aprobada check (
    cantidad_aprobada is null
    or cantidad_aprobada between 0 and cantidad_solicitada
  ),
  add constraint prestamo_detalles_devolucion check (
    cantidad_devuelta between 0 and coalesce(cantidad_aprobada, cantidad_solicitada)
  );

comment on column public.prestamo_detalles.cantidad_aprobada is
  'NULL mientras espera revisión, 0 si se rechaza y una cantidad positiva si se aprueba total o parcialmente.';

comment on column public.prestamo_detalles.motivo_rechazo is
  'Comentario opcional para explicar el rechazo total de esta línea o la reducción de unidades aprobadas.';
