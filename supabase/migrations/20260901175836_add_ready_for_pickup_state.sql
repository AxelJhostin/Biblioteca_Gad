alter table public.prestamos
  drop constraint prestamos_estado;

alter table public.prestamos
  add constraint prestamos_estado
  check (estado in ('pendiente', 'listo_retiro', 'activo', 'atrasado', 'devuelto', 'rechazado'));

alter table public.prestamos
  add constraint prestamos_listo_retiro_consistente check (
    estado <> 'listo_retiro'
    or (
      bibliotecario_id is not null
      and fecha_aprobacion is not null
      and fecha_entrega is null
      and fecha_limite is null
    )
  );

comment on constraint prestamos_listo_retiro_consistente on public.prestamos is
  'Una solicitud aprobada queda reservada y notificada internamente, pero aún no registra entrega ni fecha límite.';
