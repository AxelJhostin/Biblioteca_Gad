export function createAuthRepository(db) {
  return {
    async findByLogin(login) {
      const { rows } = await db.query(
        `select id, nombre_completo, usuario, password_hash, rol, estado
           from public.cuentas_personal
          where lower(usuario) = lower($1)
          limit 1`,
        [login],
      );
      return rows[0] || null;
    },
    async findActiveById(id) {
      const { rows } = await db.query(
        `select id, nombre_completo, usuario, rol, estado
           from public.cuentas_personal
          where id = $1 and estado = true`,
        [id],
      );
      return rows[0] || null;
    },
    markLogin(id) {
      return db.query('update public.cuentas_personal set ultimo_acceso = now() where id = $1', [id]);
    },
  };
}

