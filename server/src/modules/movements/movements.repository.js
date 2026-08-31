export function createMovementsRepository(db) {
  return {
    async list(filters = {}) {
      const params = [];
      const where = ['1=1'];
      if (filters.tipo) {
        params.push(filters.tipo);
        where.push(`m.tipo = $${params.length}`);
      }
      if (filters.search) {
        params.push(`%${filters.search}%`);
        where.push(`(m.actor_nombre ilike $${params.length} or m.detalle ilike $${params.length} or l.titulo ilike $${params.length} or p.codigo ilike $${params.length})`);
      }
      const { rows } = await db.query(
        `select m.*, l.titulo as libro_titulo, l.id_libro_texto, p.codigo as prestamo_codigo
           from public.movimientos m
           left join public.libros l on l.id = m.libro_id
           left join public.prestamos p on p.id = m.prestamo_id
          where ${where.join(' and ')}
          order by m.fecha_hora desc
          limit 500`,
        params,
      );
      return rows;
    },
  };
}

