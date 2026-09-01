-- Datos sintéticos para revisión local. El archivo es repetible y no elimina
-- registros creados manualmente. Las cuentas se preparan con `npm run db:seed`.

insert into public.libros
  (id_libro_texto, tipo_material, tipo_material_otro, genero, genero_otro, titulo, descripcion, anio_publicacion, cantidad_total)
values
  ('BJM-001', 'libro', null, 'narrativa', null, 'Los Sangurimas', 'Novela ecuatoriana ambientada en la costa y centrada en una familia marcada por sus propias reglas.', 1934, 4),
  ('BJM-002', 'libro', null, 'narrativa', null, 'A la costa', 'Obra fundamental de la narrativa ecuatoriana sobre los cambios sociales y regionales del país.', 1904, 3),
  ('BJM-003', 'libro', null, 'poesia', null, 'El árbol del bien y del mal', 'Selección poética de uno de los autores más representativos del modernismo ecuatoriano.', 1918, 3),
  ('BJM-004', 'libro', null, 'ensayo', null, 'Siete tratados', 'Ensayos sobre cultura, historia y sociedad ecuatoriana.', 1882, 2),
  ('BJM-005', 'libro', null, 'narrativa', null, 'Huasipungo', 'Novela social ecuatoriana que retrata la explotación y la desigualdad en los Andes.', 1934, 5),
  ('BJM-006', 'libro', null, 'lirico', null, 'Romanza de las horas', 'Colección lírica de la poesía modernista ecuatoriana.', 1922, 2),
  ('REV-JIP-001', 'revista', null, 'otro', 'Historia local', 'Memorias de Jipijapa', 'Edición demostrativa dedicada a la historia, tradiciones y patrimonio del cantón Jipijapa.', 2024, 6),
  ('FOL-JIP-001', 'folleto', null, 'otro', 'Patrimonio', 'Ruta patrimonial de Jipijapa', 'Guía breve de espacios culturales y patrimoniales del cantón.', 2025, 8),
  ('TES-ULEAM-001', 'tesis', null, 'ensayo', null, 'Patrimonio oral de Manabí', 'Investigación académica de demostración sobre memoria oral, identidad y comunidad.', 2023, 2),
  ('BJM-007', 'libro', null, 'narrativa', null, 'Cumandá', 'Novela ecuatoriana del siglo XIX ambientada en la región amazónica.', 1879, 3)
on conflict (lower(id_libro_texto)) do update set
  tipo_material = excluded.tipo_material,
  tipo_material_otro = excluded.tipo_material_otro,
  genero = excluded.genero,
  genero_otro = excluded.genero_otro,
  titulo = excluded.titulo,
  descripcion = excluded.descripcion,
  anio_publicacion = excluded.anio_publicacion,
  cantidad_total = greatest(public.libros.cantidad_total, excluded.cantidad_total),
  activo = true;

insert into public.autores (nombre_completo)
values
  ('José de la Cuadra'), ('Luis A. Martínez'), ('Medardo Ángel Silva'),
  ('Juan Montalvo'), ('Jorge Icaza'), ('Ernesto Noboa y Caamaño'),
  ('Archivo Histórico Municipal'), ('Dirección de Cultura de Jipijapa'),
  ('María Elena Zambrano'), ('Juan León Mera')
on conflict (lower(nombre_completo)) do update set nombre_completo = excluded.nombre_completo;

insert into public.libro_autores (libro_id, autor_id, orden)
select l.id, a.id, 1
from (values
  ('BJM-001', 'José de la Cuadra'), ('BJM-002', 'Luis A. Martínez'),
  ('BJM-003', 'Medardo Ángel Silva'), ('BJM-004', 'Juan Montalvo'),
  ('BJM-005', 'Jorge Icaza'), ('BJM-006', 'Ernesto Noboa y Caamaño'),
  ('REV-JIP-001', 'Archivo Histórico Municipal'), ('FOL-JIP-001', 'Dirección de Cultura de Jipijapa'),
  ('TES-ULEAM-001', 'María Elena Zambrano'), ('BJM-007', 'Juan León Mera')
) as demo(id_libro_texto, autor_nombre)
join public.libros l on lower(l.id_libro_texto) = lower(demo.id_libro_texto)
join public.autores a on lower(a.nombre_completo) = lower(demo.autor_nombre)
on conflict (libro_id, autor_id) do nothing;

insert into public.clientes (identificacion, nombre_completo, telefono, correo)
values
  ('1301000001', 'Ana Mendoza', '0991000001', 'ana.demo@example.com'),
  ('1301000002', 'Carlos Parrales', '052600002', 'carlos.demo@example.com'),
  ('1301000003', 'Lucía Ponce', '0981000003', 'lucia.demo@example.com')
on conflict (upper(identificacion)) do update set
  nombre_completo = excluded.nombre_completo,
  telefono = excluded.telefono,
  correo = excluded.correo;

insert into public.prestamos (codigo, cliente_id, fecha_solicitud, estado)
select 'SOL-DEMO-PEND', c.id, now() - interval '2 hours', 'pendiente'
from public.clientes c where c.identificacion = '1301000001'
on conflict (codigo) do nothing;

insert into public.prestamos (codigo, cliente_id, fecha_solicitud, estado, motivo_rechazo)
select 'SOL-DEMO-RECH', c.id, now() - interval '3 days', 'rechazado', 'Ejemplo de solicitud rechazada.'
from public.clientes c where c.identificacion = '1301000002'
on conflict (codigo) do nothing;

insert into public.prestamo_detalles (prestamo_id, libro_id, cantidad_solicitada)
select p.id, l.id, 1 from public.prestamos p cross join public.libros l
where p.codigo = 'SOL-DEMO-PEND' and l.id_libro_texto = 'BJM-001'
on conflict (prestamo_id, libro_id) do nothing;

insert into public.prestamo_detalles (prestamo_id, libro_id, cantidad_solicitada)
select p.id, l.id, 1 from public.prestamos p cross join public.libros l
where p.codigo = 'SOL-DEMO-PEND' and l.id_libro_texto = 'REV-JIP-001'
on conflict (prestamo_id, libro_id) do nothing;

insert into public.prestamo_detalles (prestamo_id, libro_id, cantidad_solicitada)
select p.id, l.id, 1 from public.prestamos p cross join public.libros l
where p.codigo = 'SOL-DEMO-RECH' and l.id_libro_texto = 'BJM-004'
on conflict (prestamo_id, libro_id) do nothing;

insert into public.movimientos (tipo, tipo_actor, cliente_id, actor_nombre, libro_id, prestamo_id, detalle)
select 'prestamo', 'cliente', p.cliente_id, c.nombre_completo, null, p.id, 'Solicitud de demostración registrada.'
from public.prestamos p join public.clientes c on c.id = p.cliente_id
where p.codigo = 'SOL-DEMO-PEND'
  and not exists (select 1 from public.movimientos m where m.prestamo_id = p.id and m.detalle = 'Solicitud de demostración registrada.');

insert into public.movimientos (tipo, tipo_actor, cliente_id, actor_nombre, libro_id, prestamo_id, detalle)
select 'rechazo_solicitud', 'cliente', p.cliente_id, c.nombre_completo, l.id, p.id, 'Solicitud de demostración rechazada.'
from public.prestamos p
join public.clientes c on c.id = p.cliente_id
join public.libros l on l.id_libro_texto = 'BJM-004'
where p.codigo = 'SOL-DEMO-RECH'
  and not exists (select 1 from public.movimientos m where m.prestamo_id = p.id and m.detalle = 'Solicitud de demostración rechazada.');

insert into public.movimientos (tipo, tipo_actor, actor_nombre, libro_id, detalle)
select 'ingreso_libro', 'administrador', 'Carga local de demostración', l.id, 'Material incorporado por el seed local.'
from public.libros l
where l.id_libro_texto in ('BJM-001', 'BJM-002', 'BJM-003', 'BJM-004', 'BJM-005', 'BJM-006', 'BJM-007', 'REV-JIP-001', 'FOL-JIP-001', 'TES-ULEAM-001')
  and not exists (select 1 from public.movimientos m where m.libro_id = l.id and m.detalle = 'Material incorporado por el seed local.');
