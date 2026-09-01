export function createClientAuthRepository(db) {
  const executor = (tx) => tx || db;

  const accountSelect = `
    select ca.id, ca.cliente_id, ca.password_hash, ca.estado, ca.debe_cambiar_password,
           ca.intentos_fallidos, ca.bloqueado_hasta, ca.version_sesion, ca.ultimo_acceso,
           ca.motivo_inactivacion, ca.inactivada_en,
           c.identificacion, c.nombre_completo, c.telefono, c.correo
      from public.cuentas_clientes ca
      join public.clientes c on c.id = ca.cliente_id`;

  return {
    transaction: (callback) => db.transaction(callback),

    async findAccountByIdentification(identification) {
      const { rows } = await db.query(
        `${accountSelect} where c.identificacion = $1 limit 1`,
        [identification],
      );
      return rows[0] || null;
    },

    async findActiveById(id) {
      const { rows } = await db.query(
        `${accountSelect} where ca.id = $1 and ca.estado = true limit 1`,
        [id],
      );
      return rows[0] || null;
    },

    async findClientForUpdate(tx, identification) {
      const { rows } = await executor(tx).query(
        `select c.*, ca.id as cuenta_id
           from public.clientes c
           left join public.cuentas_clientes ca on ca.cliente_id = c.id
          where c.identificacion = $1
          for update of c`,
        [identification],
      );
      return rows[0] || null;
    },

    async createClient(tx, input) {
      const { rows } = await executor(tx).query(
        `insert into public.clientes (identificacion, nombre_completo, telefono, correo)
         values ($1, $2, $3, $4)
         returning *`,
        [input.identificacion, input.nombre_completo, input.telefono || null, input.correo || null],
      );
      return rows[0];
    },

    async createAccount(tx, { clientId, passwordHash, mustChange = false }) {
      const { rows } = await executor(tx).query(
        `insert into public.cuentas_clientes (cliente_id, password_hash, debe_cambiar_password)
         values ($1, $2, $3)
         returning id, cliente_id, estado, debe_cambiar_password, version_sesion`,
        [clientId, passwordHash, mustChange],
      );
      return rows[0];
    },

    async hasPreviousLoanCode(tx, clientId, code) {
      const { rows } = await executor(tx).query(
        `select exists(
           select 1 from public.prestamos
            where cliente_id = $1 and upper(codigo) = upper($2)
         ) as matches`,
        [clientId, code],
      );
      return rows[0].matches;
    },

    recordFailedAttempt(id) {
      return db.query(
        `update public.cuentas_clientes
            set intentos_fallidos = intentos_fallidos + 1,
                bloqueado_hasta = case
                  when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes'
                  else bloqueado_hasta
                end
          where id = $1`,
        [id],
      );
    },

    markLogin(id) {
      return db.query(
        `update public.cuentas_clientes
            set intentos_fallidos = 0, bloqueado_hasta = null, ultimo_acceso = now()
          where id = $1`,
        [id],
      );
    },

    async updatePassword(id, passwordHash, mustChange = false) {
      const { rows } = await db.query(
        `update public.cuentas_clientes
            set password_hash = $2, debe_cambiar_password = $3,
                version_sesion = version_sesion + 1,
                intentos_fallidos = 0, bloqueado_hasta = null
          where id = $1 and estado = true
          returning version_sesion, debe_cambiar_password`,
        [id, passwordHash, mustChange],
      );
      return rows[0] || null;
    },

    async updateProfile(clientId, input) {
      const { rows } = await db.query(
        `update public.clientes
            set telefono = $2, correo = $3
          where id = $1
          returning id, identificacion, nombre_completo, telefono, correo`,
        [clientId, input.telefono || null, input.correo || null],
      );
      return rows[0] || null;
    },

    async listLoans(clientId) {
      const { rows } = await db.query(
        `select p.id, p.codigo, p.estado, p.fecha_solicitud, p.fecha_aprobacion,
                p.fecha_entrega, p.fecha_limite, p.fecha_devolucion, p.fecha_expiracion_retiro,
                coalesce(json_agg(json_build_object(
                  'id', d.id, 'libro_id', l.id, 'titulo', l.titulo,
                  'id_libro_texto', l.id_libro_texto,
                  'cantidad_solicitada', d.cantidad_solicitada,
                  'cantidad_aprobada', d.cantidad_aprobada,
                  'cantidad_devuelta', d.cantidad_devuelta,
                  'motivo_rechazo', d.motivo_rechazo,
                  'incidencias', coalesce((select json_agg(json_build_object(
                    'id', i.id, 'tipo', i.tipo, 'cantidad', i.cantidad, 'comentario', i.comentario,
                    'estado', i.estado, 'resolucion', i.resolucion
                  ) order by i.registrada_en desc) from public.incidencias_prestamo i
                    where i.prestamo_detalle_id = d.id), '[]'::json),
                  'estado_revision', case when d.cantidad_aprobada is null then 'pendiente'
                    when d.cantidad_aprobada = 0 then 'rechazado' else 'aprobado' end
                ) order by d.id) filter (where d.id is not null), '[]') as detalles
           from public.prestamos p
           left join public.prestamo_detalles d on d.prestamo_id = p.id
           left join public.libros l on l.id = d.libro_id
          where p.cliente_id = $1
          group by p.id
          order by p.fecha_solicitud desc`,
        [clientId],
      );
      return rows;
    },

    async findLoan(clientId, loanId) {
      const { rows } = await db.query(
        `select p.id, p.codigo, p.estado, p.fecha_solicitud, p.fecha_aprobacion,
                p.fecha_entrega, p.fecha_limite, p.fecha_devolucion, p.fecha_expiracion_retiro,
                coalesce(json_agg(json_build_object(
                  'id', d.id, 'libro_id', l.id, 'titulo', l.titulo,
                  'id_libro_texto', l.id_libro_texto, 'tipo_material', l.tipo_material,
                  'cantidad_solicitada', d.cantidad_solicitada,
                  'cantidad_aprobada', d.cantidad_aprobada,
                  'cantidad_devuelta', d.cantidad_devuelta,
                  'motivo_rechazo', d.motivo_rechazo,
                  'incidencias', coalesce((select json_agg(json_build_object(
                    'id', i.id, 'tipo', i.tipo, 'cantidad', i.cantidad, 'comentario', i.comentario,
                    'estado', i.estado, 'resolucion', i.resolucion
                  ) order by i.registrada_en desc) from public.incidencias_prestamo i
                    where i.prestamo_detalle_id = d.id), '[]'::json),
                  'estado_revision', case when d.cantidad_aprobada is null then 'pendiente'
                    when d.cantidad_aprobada = 0 then 'rechazado' else 'aprobado' end
                ) order by d.id) filter (where d.id is not null), '[]') as detalles
           from public.prestamos p
           left join public.prestamo_detalles d on d.prestamo_id = p.id
           left join public.libros l on l.id = d.libro_id
          where p.cliente_id = $1 and p.id = $2
          group by p.id`,
        [clientId, loanId],
      );
      return rows[0] || null;
    },

    async findLoanByCode(clientId, code) {
      const { rows } = await db.query(
        `select id from public.prestamos
          where cliente_id = $1 and upper(codigo) = upper($2)
          limit 1`,
        [clientId, code],
      );
      return rows[0] || null;
    },

    async listClients(search = '') {
      const term = `%${search}%`;
      const { rows } = await db.query(
        `select c.id, c.identificacion, c.nombre_completo, c.telefono, c.correo,
                ca.id as cuenta_id, coalesce(ca.estado, false) as cuenta_activa,
                coalesce(ca.debe_cambiar_password, false) as debe_cambiar_password,
                ca.ultimo_acceso, ca.motivo_inactivacion, ca.inactivada_en
           from public.clientes c
           left join public.cuentas_clientes ca on ca.cliente_id = c.id
          where $1 = '%%' or c.identificacion ilike $1 or c.nombre_completo ilike $1
          order by c.nombre_completo
          limit 100`,
        [term],
      );
      return rows;
    },

    async findClientByIdForUpdate(tx, id) {
      const { rows } = await executor(tx).query(
        `select c.*, ca.id as cuenta_id
           from public.clientes c
           left join public.cuentas_clientes ca on ca.cliente_id = c.id
          where c.id = $1
          for update of c`,
        [id],
      );
      return rows[0] || null;
    },

    async resetClientPassword(tx, accountId, passwordHash) {
      const { rows } = await executor(tx).query(
        `update public.cuentas_clientes
            set password_hash = $2, debe_cambiar_password = true,
                version_sesion = version_sesion + 1,
                intentos_fallidos = 0, bloqueado_hasta = null
          where id = $1
          returning id, cliente_id, estado, debe_cambiar_password, version_sesion`,
        [accountId, passwordHash],
      );
      return rows[0] || null;
    },

    async setClientAccountStatus(tx, accountId, input, staffId) {
      const { rows } = await executor(tx).query(
        `update public.cuentas_clientes
            set estado = $2,
                motivo_inactivacion = case when $2 then null else $3 end,
                inactivada_en = case when $2 then null else now() end,
                inactivada_por = case when $2 then null else $4 end,
                version_sesion = version_sesion + 1,
                intentos_fallidos = 0,
                bloqueado_hasta = null
          where id = $1
          returning id, cliente_id, estado, motivo_inactivacion, inactivada_en, version_sesion`,
        [accountId, input.estado, input.motivo || null, staffId],
      );
      return rows[0] || null;
    },

    addMovement(tx, movement) {
      return executor(tx).query(
        `insert into public.movimientos
          (tipo, tipo_actor, cliente_id, cuenta_personal_id, actor_nombre, detalle)
         values ('gestion_cuenta', $1, $2, $3, $4, $5)`,
        [movement.tipo_actor, movement.cliente_id, movement.cuenta_personal_id,
          movement.actor_nombre, movement.detalle],
      );
    },
  };
}
