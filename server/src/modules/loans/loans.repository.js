export function createLoansRepository(db) {
  const executor = (tx) => tx || db;

  return {
    transaction: (callback) => db.transaction(callback),
    async findClientById(tx, id) {
      const { rows } = await executor(tx).query(
        'select id, identificacion, nombre_completo, telefono, correo from public.clientes where id = $1',
        [id],
      );
      return rows[0] || null;
    },
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
            where cliente_id = $1 and estado in ('listo_retiro', 'activo', 'atrasado')
              and ($2::bigint is null or id <> $2)
         ) as blocked`,
        [clientId, exceptLoanId],
      );
      return rows[0].blocked;
    },
    async lockBooks(tx, ids) {
      const { rows } = await executor(tx).query(
        `select id, id_libro_texto, titulo, cantidad_total, cantidad_no_disponible, activo
           from public.libros
          where id = any($1::bigint[])
          order by id
          for update`,
        [ids],
      );
      return rows;
    },
    async getCommittedByBook(tx, ids, excludeLoanId = null) {
      const { rows } = await executor(tx).query(
        `select d.libro_id,
                coalesce(sum(greatest(coalesce(d.cantidad_aprobada, d.cantidad_solicitada) - d.cantidad_devuelta, 0)), 0)::integer as cantidad_comprometida
           from public.prestamo_detalles d
           join public.prestamos p on p.id = d.prestamo_id
          where d.libro_id = any($1::bigint[]) and p.estado in ('pendiente', 'listo_retiro', 'activo', 'atrasado')
            and ($2::bigint is null or p.id <> $2)
          group by d.libro_id`,
        [ids, excludeLoanId],
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
          `insert into public.prestamo_detalles
            (prestamo_id, libro_id, cantidad_solicitada, cantidad_aprobada, motivo_rechazo)
           values ($1, $2, $3, $4, $5)`,
          [loanId, item.libro_id, item.cantidad, item.cantidad_aprobada ?? null, item.motivo_rechazo || null],
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
                  'cantidad_aprobada', d.cantidad_aprobada, 'cantidad_devuelta', d.cantidad_devuelta,
                  'motivo_rechazo', d.motivo_rechazo,
                  'incidencias', coalesce((select json_agg(json_build_object(
                    'id', i.id, 'tipo', i.tipo, 'cantidad', i.cantidad, 'comentario', i.comentario,
                    'estado', i.estado, 'resolucion', i.resolucion, 'registrada_en', i.registrada_en
                  ) order by i.registrada_en desc) from public.incidencias_prestamo i
                    where i.prestamo_detalle_id = d.id), '[]'::json),
                  'estado_revision', case when d.cantidad_aprobada is null then 'pendiente'
                    when d.cantidad_aprobada = 0 then 'rechazado' else 'aprobado' end,
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
          order by case p.estado when 'pendiente' then 0 when 'listo_retiro' then 1 when 'atrasado' then 2 when 'activo' then 3 else 4 end,
                   p.fecha_solicitud asc`,
        params,
      );
      return rows;
    },
    async getClientStatus(code, clientId) {
      const { rows } = await db.query(
        `select p.codigo, p.estado, p.fecha_solicitud, p.fecha_entrega, p.fecha_limite,
                p.fecha_expiracion_retiro, p.fecha_devolucion,
                coalesce(json_agg(json_build_object(
                  'titulo', l.titulo, 'cantidad_solicitada', d.cantidad_solicitada,
                  'cantidad_aprobada', d.cantidad_aprobada, 'motivo_rechazo', d.motivo_rechazo,
                  'estado_revision', case when d.cantidad_aprobada is null then 'pendiente'
                    when d.cantidad_aprobada = 0 then 'rechazado' else 'aprobado' end
                ) order by d.id), '[]') as items
           from public.prestamos p
           join public.prestamo_detalles d on d.prestamo_id = p.id
           join public.libros l on l.id = d.libro_id
          where upper(p.codigo) = upper($1) and p.cliente_id = $2
          group by p.id`,
        [code, clientId],
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
    reviewDetail(tx, detailId, approvedQuantity, reason) {
      return executor(tx).query(
        `update public.prestamo_detalles
            set cantidad_aprobada = $2, motivo_rechazo = $3
          where id = $1`,
        [detailId, approvedQuantity, reason || null],
      );
    },
    finishReview(tx, loanId, staffId, state, reason, pickupExpiresAt = null) {
      return executor(tx).query(
        `update public.prestamos
            set estado = $3, bibliotecario_id = $2,
                fecha_aprobacion = case when $3 = 'listo_retiro' then now() else null end,
                motivo_rechazo = $4,
                fecha_expiracion_retiro = case when $3 = 'listo_retiro' then $5::timestamptz else null end
          where id = $1`,
        [loanId, staffId, state, reason || null, pickupExpiresAt],
      );
    },
    deliver(tx, loanId, staffId, dueDate) {
      return executor(tx).query(
        `update public.prestamos
            set estado = 'activo', bibliotecario_id = $2,
                fecha_entrega = now(), fecha_limite = $3
          where id = $1`,
        [loanId, staffId, dueDate],
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
    async getOpenIncidentQuantity(tx, detailId) {
      const { rows } = await executor(tx).query(
        `select coalesce(sum(cantidad), 0)::integer as cantidad
           from public.incidencias_prestamo
          where prestamo_detalle_id = $1 and estado = 'abierta' and tipo = 'extraviado'`,
        [detailId],
      );
      return Number(rows[0].cantidad);
    },
    async createIncident(tx, input) {
      const { rows } = await executor(tx).query(
        `insert into public.incidencias_prestamo
          (prestamo_id, prestamo_detalle_id, libro_id, tipo, cantidad, comentario, registrada_por)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning *`,
        [input.loanId, input.detailId, input.bookId, input.type, input.quantity, input.comment || null, input.staffId],
      );
      return rows[0];
    },
    async lockIncident(tx, incidentId) {
      const { rows } = await executor(tx).query(
        `select i.*, d.cantidad_aprobada, d.cantidad_devuelta, l.titulo,
                p.estado as prestamo_estado, p.fecha_limite
           from public.incidencias_prestamo i
           join public.prestamo_detalles d on d.id = i.prestamo_detalle_id
           join public.libros l on l.id = i.libro_id
           join public.prestamos p on p.id = i.prestamo_id
          where i.id = $1
          for update of i, d, l, p`,
        [incidentId],
      );
      return rows[0] || null;
    },
    async adjustBookUnavailable(tx, bookId, unavailableDelta, totalDelta = 0) {
      const { rows } = await executor(tx).query(
        `update public.libros
            set cantidad_no_disponible = cantidad_no_disponible + $2,
                cantidad_total = cantidad_total + $3
          where id = $1
            and cantidad_no_disponible + $2 >= 0
            and cantidad_total + $3 >= 0
            and cantidad_no_disponible + $2 <= cantidad_total + $3
          returning *`,
        [bookId, unavailableDelta, totalDelta],
      );
      return rows[0] || null;
    },
    resolveIncident(tx, incidentId, resolution, comment, staffId) {
      return executor(tx).query(
        `update public.incidencias_prestamo
            set estado = 'resuelta', resolucion = $2, comentario_resolucion = $3,
                resuelta_por = $4, resuelta_en = now()
          where id = $1`,
        [incidentId, resolution, comment || null, staffId],
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
    async lockExpiredReady(tx) {
      const { rows } = await executor(tx).query(
        `select id, cliente_id, codigo
           from public.prestamos
          where estado = 'listo_retiro' and fecha_expiracion_retiro <= now()
          order by id
          for update skip locked`,
      );
      return rows;
    },
    expireReady(tx, loanId) {
      return executor(tx).query(
        `update public.prestamos
            set estado = 'expirado', motivo_rechazo = 'No se retiró el material dentro del plazo establecido.'
          where id = $1 and estado = 'listo_retiro'`,
        [loanId],
      );
    },
  };
}
