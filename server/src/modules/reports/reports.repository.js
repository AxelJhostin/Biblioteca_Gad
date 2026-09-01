const REPORT_QUERY_LIMIT = 5001;

function addTextFilter(params, where, value, sql) {
  if (!value) return;
  params.push(`%${String(value).trim()}%`);
  where.push(sql.replaceAll('$search', `$${params.length}`));
}

export function createReportsRepository(db) {
  return {
    async inventario(filters = {}) {
      const params = [];
      const where = ['l.activo = true'];
      addTextFilter(params, where, filters.search, `(
        l.id_libro_texto ilike $search or l.titulo ilike $search
        or l.tipo_material ilike $search or l.genero ilike $search
        or exists (
          select 1 from public.libro_autores la_search
          join public.autores a_search on a_search.id = la_search.autor_id
          where la_search.libro_id = l.id and a_search.nombre_completo ilike $search
        )
      )`);
      if (filters.tipo) {
        params.push(filters.tipo);
        where.push(`l.tipo_material = $${params.length}`);
      }
      if (filters.genero) {
        params.push(filters.genero);
        where.push(`l.genero = $${params.length}`);
      }
      if (filters.digital === 'true') where.push('l.digital_disponible = true');
      if (filters.disponible === 'true') where.push(`greatest(0, l.cantidad_total - l.cantidad_no_disponible - coalesce(stock.comprometida, 0)) > 0`);

      const { rows } = await db.query(
        `select l.id_libro_texto, l.titulo, l.tipo_material, l.tipo_material_otro,
                l.genero, l.genero_otro, l.anio_publicacion, l.cantidad_total, l.cantidad_no_disponible,
                l.digital_disponible,
                greatest(0, l.cantidad_total - l.cantidad_no_disponible - coalesce(stock.comprometida, 0))::integer as cantidad_disponible,
                coalesce(stock.comprometida, 0)::integer as cantidad_comprometida,
                coalesce((
                  select string_agg(a.nombre_completo, ', ' order by la.orden)
                  from public.libro_autores la
                  join public.autores a on a.id = la.autor_id
                  where la.libro_id = l.id
                ), 'Autor no registrado') as autores
           from public.libros l
           left join lateral (
             select coalesce(sum(greatest(coalesce(d.cantidad_aprobada, d.cantidad_solicitada) - d.cantidad_devuelta, 0)), 0)::integer as comprometida
             from public.prestamo_detalles d
             join public.prestamos p on p.id = d.prestamo_id
             where d.libro_id = l.id and p.estado in ('pendiente', 'listo_retiro', 'activo', 'atrasado')
           ) stock on true
          where ${where.join(' and ')}
          order by l.titulo asc
          limit ${REPORT_QUERY_LIMIT}`,
        params,
      );
      return rows;
    },

    async prestamos(filters = {}) {
      const params = [];
      const where = ['1=1'];
      if (filters.estado) {
        params.push(filters.estado);
        where.push(`p.estado = $${params.length}`);
      }
      addTextFilter(params, where, filters.search,
        `(p.codigo ilike $search or c.identificacion ilike $search or c.nombre_completo ilike $search)`);

      const { rows } = await db.query(
        `select p.codigo, p.estado, p.fecha_solicitud, p.fecha_aprobacion, p.fecha_entrega,
                p.fecha_limite, p.fecha_devolucion, p.motivo_rechazo,
                c.identificacion, c.nombre_completo, c.telefono, c.correo,
                coalesce(cp.nombre_completo, 'Sin asignar') as bibliotecario_nombre,
                coalesce(string_agg(
                  concat(l.id_libro_texto, ' - ', l.titulo, ' (sol. ', d.cantidad_solicitada,
                    '; ', case when d.cantidad_aprobada is null then 'pendiente'
                      when d.cantidad_aprobada = 0 then 'rechazado'
                      else concat('aprob. ', d.cantidad_aprobada) end,
                    case when d.cantidad_devuelta > 0 then concat('; devueltos ', d.cantidad_devuelta) else '' end, ')'),
                  ' | ' order by d.id
                ), 'Sin materiales') as materiales,
                coalesce(sum(d.cantidad_solicitada), 0)::integer as unidades_solicitadas,
                coalesce(sum(greatest(coalesce(d.cantidad_aprobada, d.cantidad_solicitada) - d.cantidad_devuelta, 0)), 0)::integer as unidades_pendientes
           from public.prestamos p
           join public.clientes c on c.id = p.cliente_id
           left join public.cuentas_personal cp on cp.id = p.bibliotecario_id
           left join public.prestamo_detalles d on d.prestamo_id = p.id
           left join public.libros l on l.id = d.libro_id
          where ${where.join(' and ')}
          group by p.id, c.id, cp.id
          order by p.fecha_solicitud desc
          limit ${REPORT_QUERY_LIMIT}`,
        params,
      );
      return rows;
    },

    async movimientos(filters = {}) {
      const params = [];
      const where = ['1=1'];
      if (filters.tipo) {
        params.push(filters.tipo);
        where.push(`m.tipo = $${params.length}`);
      }
      addTextFilter(params, where, filters.search,
        `(m.actor_nombre ilike $search or m.detalle ilike $search or l.titulo ilike $search or p.codigo ilike $search or l.id_libro_texto ilike $search)`);

      const { rows } = await db.query(
        `select m.fecha_hora, m.tipo, m.tipo_actor, m.actor_nombre, m.detalle,
                l.titulo as libro_titulo, l.id_libro_texto, p.codigo as prestamo_codigo
           from public.movimientos m
           left join public.libros l on l.id = m.libro_id
           left join public.prestamos p on p.id = m.prestamo_id
          where ${where.join(' and ')}
          order by m.fecha_hora desc
          limit ${REPORT_QUERY_LIMIT}`,
        params,
      );
      return rows;
    },
  };
}

export const REPORT_MAX_ROWS = REPORT_QUERY_LIMIT - 1;
