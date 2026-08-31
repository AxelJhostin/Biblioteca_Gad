export function createCatalogRepository(db) {
  const availabilitySql = `
    greatest(0, l.cantidad_total - coalesce((
      select sum(d.cantidad_solicitada - d.cantidad_devuelta)::integer
      from public.prestamo_detalles d
      join public.prestamos p on p.id = d.prestamo_id
      where d.libro_id = l.id and p.estado in ('pendiente', 'activo', 'atrasado')
    ), 0))`;

  return {
    async list(filters) {
      const params = [];
      const where = ['l.activo = true'];
      if (filters.search) {
        params.push(`%${filters.search}%`);
        where.push(`(
          l.titulo ilike $${params.length}
          or l.tipo_material ilike $${params.length}
          or l.genero ilike $${params.length}
          or exists (
            select 1 from public.libro_autores la
            join public.autores a on a.id = la.autor_id
            where la.libro_id = l.id and a.nombre_completo ilike $${params.length}
          )
        )`);
      }
      if (filters.tipo) {
        params.push(filters.tipo);
        where.push(`l.tipo_material = $${params.length}`);
      }
      if (filters.genero) {
        params.push(filters.genero);
        where.push(`l.genero = $${params.length}`);
      }
      if (filters.digital === 'true') where.push('l.digital_disponible = true');
      if (filters.disponible === 'true') where.push(`${availabilitySql} > 0`);

      const page = Math.max(1, Number(filters.page) || 1);
      const limit = Math.min(48, Math.max(1, Number(filters.limit) || 12));
      params.push(limit, (page - 1) * limit);
      const { rows } = await db.query(
        `select l.id, l.id_libro_texto, l.tipo_material, l.tipo_material_otro,
                l.genero, l.genero_otro, l.titulo, l.descripcion, l.anio_publicacion,
                l.cantidad_total, l.portada_path is not null as tiene_portada,
                l.digital_disponible, ${availabilitySql} as cantidad_disponible,
                coalesce((select json_agg(json_build_object('id', a.id, 'nombre_completo', a.nombre_completo) order by la.orden)
                  from public.libro_autores la join public.autores a on a.id = la.autor_id
                  where la.libro_id = l.id), '[]') as autores,
                count(*) over()::integer as total_resultados
           from public.libros l
          where ${where.join(' and ')}
          order by l.titulo asc
          limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return {
        items: rows.map(({ total_resultados, ...row }) => row),
        pagination: { page, limit, total: rows[0]?.total_resultados || 0 },
      };
    },
    async findByIdOrCode(value) {
      const { rows } = await db.query(
        `select l.*, l.portada_path is not null as tiene_portada,
                ${availabilitySql} as cantidad_disponible,
                coalesce((select json_agg(json_build_object('id', a.id, 'nombre_completo', a.nombre_completo) order by la.orden)
                  from public.libro_autores la join public.autores a on a.id = la.autor_id
                  where la.libro_id = l.id), '[]') as autores
           from public.libros l
          where l.activo = true and (l.id::text = $1 or lower(l.id_libro_texto) = lower($1))
          limit 1`,
        [String(value)],
      );
      return rows[0] || null;
    },
    async getCover(id) {
      const { rows } = await db.query('select portada_path, portada_mime from public.libros where id = $1 and activo = true', [id]);
      return rows[0] || null;
    },
    async getDigital(id) {
      const { rows } = await db.query(
        `select ad.storage_path, ad.mime_type, ad.nombre_original
           from public.archivos_digitales ad
           join public.libros l on l.id = ad.libro_id
          where l.id = $1 and l.activo = true and l.digital_disponible = true and ad.activo = true`,
        [id],
      );
      return rows[0] || null;
    },
  };
}

