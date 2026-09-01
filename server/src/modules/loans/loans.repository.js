export function createLoansRepository(db) {
  const executor = (tx) => tx || db;

  return {
    transaction: (callback) => db.transaction(callback),
    async upsertClient(tx, client) {
      const { rows } = await executor(tx).query(
        `insert into public.clientes (identificacion, nombre_completo, telefono, correo)
         values ($1, $2, $3, $4)
         on conflict (upper(identificacion)) do update
           set nombre_completo = excluded.nombre_completo,
               telefono = excluded.telefono,
               correo = excluded.correo
         returning *`,
        [client.identificacion, client.nombre_completo, client.telefono || null, client.correo || null],
      );
      return rows[0];
    },
    async hasOpenLoan(tx, clientId, exceptLoanId = null) {
      const { rows } = await executor(tx).query(
        `select exists(
           select 1 from public.prestamos
            where cliente_id = $1 and estado in ('activo', 'atrasado')
              and ($2::bigint is null or id <> $2)
         ) as blocked`,
        [clientId, exceptLoanId],
      );
      return rows[0].blocked;
    },
    async lockBooks(tx, ids) {
      const { rows } = await executor(tx).query(
        `select id, id_libro_texto, titulo, cantidad_total, activo
           from public.libros
          where id = any($1::bigint[])
          order by id
          for update`,
        [ids],
      );
      return rows;
    },
    async getCommittedByBook(tx, ids) {
      const { rows } = await executor(tx).query(
        `select d.libro_id,
                coalesce(sum(d.cantidad_solicitada - d.cantidad_devuelta), 0)::integer as cantidad_comprometida
           from public.prestamo_detalles d
           join public.prestamos p on p.id = d.prestamo_id
          where d.libro_id = any($1::bigint[]) and p.estado in ('pendiente', 'activo', 'atrasado')
          group by d.libro_id`,
        [ids],
      );
      return new Map(rows.map((row) => [Number(row.libro_id), Number(row.cantidad_comprometida)]));
    },
    async createLoan(tx, { clientId, state, reason }) {
      const { rows } = await executor(tx).query(
        `insert into public.prestamos (cliente_id, estado, motivo_rechazo)
         values ($1, $2, $3)
         returning *`,
        [clientId, state, reason || null],
      );
      return rows[0];
    },
    async createDirectLoan(tx, { clientId, staffId, dueDate }) {
      const { rows } = await executor(tx).query(
        `insert into public.prestamos
          (cliente_id, bibliotecario_id, fecha_aprobacion, fecha_entrega, fecha_limite, estado)
         values ($1, $2, now(), now(), $3, 'activo')
         returning *`,
        [clientId, staffId, dueDate],
      );
      return rows[0];
    },
    async addDetails(tx, loanId, items) {
      for (const item of items) {
        await executor(tx).query(
          `insert into public.prestamo_detalles (prestamo_id, libro_id, cantidad_solicitada)
           values ($1, $2, $3)`,
          [loanId, item.libro_id, item.cantidad],
        );
      }
    },
    addMovement(tx, movement) {
      return executor(tx).query(
        `insert into public.movimientos
          (tipo, tipo_actor, cliente_id, cuenta_personal_id, actor_nombre, libro_id, prestamo_id, detalle)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [movement.tipo, movement.tipo_actor, movement.cliente_id || null, movement.cuenta_personal_id || null,
          movement.actor_nombre, movement.libro_id || null, movement.prestamo_id || null, movement.detalle || null],
      );
    },
    async list(filters = {}) {
      const params = [];
      const where = ['1=1'];
      if (filters.estado) {
        params.push(filters.estado);
        where.push(`p.estado = $${params.length}`);
      }
      if (filters.search) {
        params.push(`%${filters.search}%`);
        where.push(`(p.codigo ilike $${params.length} or c.identificacion ilike $${params.length} or c.nombre_completo ilike $${params.length})`);
      }
      const { rows } = await db.query(
        `select p.*, c.identificacion, c.nombre_completo, c.telefono, c.correo,
                cp.nombre_completo as bibliotecario_nombre,
                coalesce(json_agg(json_build_object(
                  'id', d.id, 'libro_id', d.libro_id, 'titulo', l.titulo,
                  'id_libro_texto', l.id_libro_texto, 'cantidad_solicitada', d.cantidad_solicitada,
                  'cantidad_devuelta', d.cantidad_devuelta,
                  'tipo_material', l.tipo_material, 'tipo_material_otro', l.tipo_material_otro,
                  'genero', l.genero, 'genero_otro', l.genero_otro,
                  'anio_publicacion', l.anio_publicacion, 'descripcion', l.descripcion,
                  'cantidad_total', l.cantidad_total, 'tiene_portada', l.portada_path is not null,
                  'autores', coalesce((select json_agg(json_build_object(
                    'id', a.id, 'nombre_completo', a.nombre_completo
                  ) order by la.orden)
                    from public.libro_autores la
                    join public.autores a on a.id = la.autor_id
                   where la.libro_id = l.id), '[]'::json)
                ) order by d.id) filter (where d.id is not null), '[]') as detalles
           from public.prestamos p
           join public.clientes c on c.id = p.cliente_id
           left join public.cuentas_personal cp on cp.id = p.bibliotecario_id
           left join public.prestamo_detalles d on d.prestamo_id = p.id
           left join public.libros l on l.id = d.libro_id
          where ${where.join(' and ')}
          group by p.id, c.id, cp.id
          order by case p.estado when 'pendiente' then 0 when 'atrasado' then 1 when 'activo' then 2 else 3 end,
                   p.fecha_solicitud asc`,
        params,
      );
      return rows;
    },
    async getPublicStatus(code, identification) {
      const { rows } = await db.query(
        `select p.codigo, p.estado, p.fecha_solicitud, p.fecha_entrega, p.fecha_limite, p.fecha_devolucion,
                coalesce(json_agg(json_build_object('titulo', l.titulo, 'cantidad', d.cantidad_solicitada) order by d.id), '[]') as items
           from public.prestamos p
           join public.clientes c on c.id = p.cliente_id
           join public.prestamo_detalles d on d.prestamo_id = p.id
           join public.libros l on l.id = d.libro_id
          where upper(p.codigo) = upper($1) and upper(c.identificacion) = upper($2)
          group by p.id`,
        [code, identification],
      );
      return rows[0] || null;
    },
    async lockLoan(tx, id) {
      const { rows } = await executor(tx).query('select * from public.prestamos where id = $1 for update', [id]);
      return rows[0] || null;
    },
    async getDetails(tx, loanId, lock = false) {
      const { rows } = await executor(tx).query(
        `select d.*, l.titulo, l.id_libro_texto
           from public.prestamo_detalles d
           join public.libros l on l.id = d.libro_id
          where d.prestamo_id = $1
          order by d.id ${lock ? 'for update of d' : ''}`,
        [loanId],
      );
      return rows;
    },
    activate(tx, loanId, staffId, dueDate) {
      return executor(tx).query(
        `update public.prestamos
            set estado = 'activo', bibliotecario_id = $2, fecha_aprobacion = now(),
                fecha_entrega = now(), fecha_limite = $3
          where id = $1`,
        [loanId, staffId, dueDate],
      );
    },
    reject(tx, loanId, staffId, reason) {
      return executor(tx).query(
        `update public.prestamos
            set estado = 'rechazado', bibliotecario_id = $2, motivo_rechazo = $3
          where id = $1`,
        [loanId, staffId, reason || null],
      );
    },
    updateReturnedQuantity(tx, detailId, amount) {
      return executor(tx).query(
        `update public.prestamo_detalles
            set cantidad_devuelta = cantidad_devuelta + $2, fecha_ultima_devolucion = now()
          where id = $1`,
        [detailId, amount],
      );
    },
    setLoanState(tx, loanId, state) {
      return executor(tx).query(
        `update public.prestamos
            set estado = $2,
                fecha_devolucion = case when $2 = 'devuelto' then now() else fecha_devolucion end
          where id = $1`,
        [loanId, state],
      );
    },
    markOverdue() {
      return db.query(
        `update public.prestamos
            set estado = 'atrasado'
          where estado = 'activo' and fecha_limite < (now() at time zone 'America/Guayaquil')::date`,
      );
    },
  };
}
