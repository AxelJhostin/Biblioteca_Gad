export function createDashboardRepository(db) {
  return {
    async get() {
      const { rows } = await db.query(`
        select
          (select count(*)::integer from public.prestamos where estado='pendiente') as solicitudes_pendientes,
          (select count(*)::integer from public.prestamos where estado='listo_retiro') as listos_retiro,
          (select count(*)::integer from public.prestamos where estado='activo') as prestamos_activos,
          (select count(*)::integer from public.prestamos where estado='atrasado') as prestamos_atrasados,
          (select count(*)::integer from public.libros where activo) as libros_catalogados,
          (select count(*)::integer from public.libros where activo and digital_disponible) as libros_digitales
      `);
      const recent = await db.query(
        `select p.id,p.codigo,p.estado,p.fecha_solicitud,c.nombre_completo,
                coalesce(json_agg(l.titulo order by d.id), '[]') as titulos
           from public.prestamos p
           join public.clientes c on c.id=p.cliente_id
           join public.prestamo_detalles d on d.prestamo_id=p.id
           join public.libros l on l.id=d.libro_id
          where p.estado in ('pendiente','listo_retiro','atrasado')
          group by p.id,c.id
          order by case p.estado when 'atrasado' then 0 when 'listo_retiro' then 1 else 2 end,p.fecha_solicitud asc
          limit 8`,
      );
      return { metrics: rows[0], attention: recent.rows };
    },
  };
}
