export function createAdminRepository(db) {
  const executor = (tx) => tx || db;
  return {
    transaction: (callback) => db.transaction(callback),
    async createBook(tx, input) {
      const { rows } = await executor(tx).query(
        `insert into public.libros
          (id_libro_texto, tipo_material, tipo_material_otro, genero, genero_otro,
           titulo, descripcion, anio_publicacion, cantidad_total, activo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
         returning *`,
        [input.id_libro_texto, input.tipo_material, input.tipo_material_otro || null,
          input.genero, input.genero_otro || null, input.titulo, input.descripcion || null,
          input.anio_publicacion || null, input.cantidad_total],
      );
      return rows[0];
    },
    async lockBook(tx, id) {
      const { rows } = await executor(tx).query('select * from public.libros where id = $1 for update', [id]);
      return rows[0] || null;
    },
    async committedQuantity(tx, bookId) {
      const { rows } = await executor(tx).query(
        `select coalesce(sum(d.cantidad_solicitada - d.cantidad_devuelta), 0)::integer as total
           from public.prestamo_detalles d
           join public.prestamos p on p.id = d.prestamo_id
          where d.libro_id = $1 and p.estado in ('pendiente','activo','atrasado')`,
        [bookId],
      );
      return Number(rows[0].total);
    },
    async updateBook(tx, id, input) {
      const { rows } = await executor(tx).query(
        `update public.libros set
           id_libro_texto=$2, tipo_material=$3, tipo_material_otro=$4, genero=$5,
           genero_otro=$6, titulo=$7, descripcion=$8, anio_publicacion=$9,
           cantidad_total=$10, activo=$11
         where id=$1 returning *`,
        [id, input.id_libro_texto, input.tipo_material, input.tipo_material_otro || null,
          input.genero, input.genero_otro || null, input.titulo, input.descripcion || null,
          input.anio_publicacion || null, input.cantidad_total, input.activo],
      );
      return rows[0];
    },
    async syncAuthors(tx, bookId, authors) {
      await executor(tx).query('delete from public.libro_autores where libro_id = $1', [bookId]);
      let order = 1;
      for (const name of authors) {
        const { rows } = await executor(tx).query(
          `insert into public.autores (nombre_completo) values ($1)
           on conflict (lower(nombre_completo)) do update set nombre_completo = excluded.nombre_completo
           returning id`,
          [name],
        );
        await executor(tx).query(
          'insert into public.libro_autores (libro_id, autor_id, orden) values ($1,$2,$3)',
          [bookId, rows[0].id, order++],
        );
      }
    },
    updateCover(id, storagePath, mimeType) {
      return db.query('update public.libros set portada_path=$2, portada_mime=$3 where id=$1', [id, storagePath, mimeType]);
    },
    async replaceDigital(tx, id, file) {
      await executor(tx).query(
        'update public.archivos_digitales set activo=false, desactivado_en=now() where libro_id=$1 and activo=true', [id],
      );
      await executor(tx).query(
        `insert into public.archivos_digitales (libro_id,nombre_original,storage_path,mime_type,tamano_bytes)
         values ($1,$2,$3,$4,$5)`,
        [id, file.originalName, file.storagePath, file.mimeType, file.size],
      );
      await executor(tx).query('update public.libros set digital_disponible=true where id=$1', [id]);
    },
    addMovement(tx, movement) {
      return executor(tx).query(
        `insert into public.movimientos
          (tipo,tipo_actor,cuenta_personal_id,actor_nombre,libro_id,prestamo_id,detalle)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [movement.tipo, movement.tipo_actor, movement.cuenta_personal_id, movement.actor_nombre,
          movement.libro_id || null, movement.prestamo_id || null, movement.detalle || null],
      );
    },
    async listStaff() {
      const { rows } = await db.query(
        `select id,nombre_completo,usuario,rol,estado,ultimo_acceso,creado_en
           from public.cuentas_personal order by nombre_completo`,
      );
      return rows;
    },
    async createStaff(input) {
      const { rows } = await db.query(
        `insert into public.cuentas_personal (nombre_completo,usuario,password_hash,rol,estado)
         values ($1,$2,$3,$4,true) returning id,nombre_completo,usuario,rol,estado`,
        [input.nombre_completo, input.usuario, input.password_hash, input.rol],
      );
      return rows[0];
    },
    async updateStaff(id, input) {
      const { rows } = await db.query(
        `update public.cuentas_personal
            set nombre_completo=$2,usuario=$3,rol=$4,estado=$5
          where id=$1 returning id,nombre_completo,usuario,rol,estado`,
        [id, input.nombre_completo, input.usuario, input.rol, input.estado],
      );
      return rows[0] || null;
    },
    async resetPassword(id, passwordHash) {
      const { rows } = await db.query(
        `update public.cuentas_personal set password_hash=$2 where id=$1 and rol='bibliotecario'
         returning id,nombre_completo,usuario,rol,estado`,
        [id, passwordHash],
      );
      return rows[0] || null;
    },
  };
}

