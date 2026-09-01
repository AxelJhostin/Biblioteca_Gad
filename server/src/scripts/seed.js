import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createDatabase } from '../db/index.js';

const name = process.env.ADMIN_NAME || 'Administrador Biblioteca';
const user = process.env.ADMIN_USER || 'admin';
const password = process.env.ADMIN_PASSWORD;
const librarianName = process.env.LIBRARIAN_NAME || 'Bibliotecaria de Pruebas';
const librarianUser = process.env.LIBRARIAN_USER || 'bibliotecaria';
const librarianPassword = process.env.LIBRARIAN_PASSWORD;
const clientIdentification = process.env.CLIENT_DEMO_IDENTIFICATION || '1301000001';
const clientPassword = process.env.CLIENT_DEMO_PASSWORD;

if (!password || password.length < 10) {
  throw new Error('Configure ADMIN_PASSWORD con al menos 10 caracteres antes de ejecutar el seed.');
}

const db = createDatabase();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    `insert into public.cuentas_personal (nombre_completo, usuario, password_hash, rol, estado)
     values ($1, $2, $3, 'administrador', true)
     on conflict (lower(usuario)) do update
       set nombre_completo = excluded.nombre_completo,
           password_hash = excluded.password_hash,
           rol = 'administrador',
           estado = true`,
    [name, user, passwordHash],
  );
  console.log(`Cuenta administradora preparada: ${user}`);
  if (librarianPassword) {
    if (librarianPassword.length < 10) throw new Error('LIBRARIAN_PASSWORD debe tener al menos 10 caracteres.');
    const librarianHash = await bcrypt.hash(librarianPassword, 12);
    await db.query(
      `insert into public.cuentas_personal (nombre_completo, usuario, password_hash, rol, estado)
       values ($1, $2, $3, 'bibliotecario', true)
       on conflict (lower(usuario)) do update
         set nombre_completo = excluded.nombre_completo,
             password_hash = excluded.password_hash,
             rol = 'bibliotecario',
             estado = true`,
      [librarianName, librarianUser, librarianHash],
    );
    console.log(`Cuenta bibliotecaria de prueba preparada: ${librarianUser}`);
  }
  if (clientPassword) {
    if (clientPassword.length < 10) throw new Error('CLIENT_DEMO_PASSWORD debe tener al menos 10 caracteres.');
    const clientHash = await bcrypt.hash(clientPassword, 12);
    const { rows } = await db.query(
      'select id from public.clientes where identificacion = $1 limit 1',
      [clientIdentification],
    );
    if (!rows[0]) throw new Error(`No existe el cliente local de demostración ${clientIdentification}.`);
    await db.query(
      `insert into public.cuentas_clientes (cliente_id, password_hash, estado, debe_cambiar_password)
       values ($1, $2, true, false)
       on conflict (cliente_id) do update
         set password_hash = excluded.password_hash,
             estado = true,
             debe_cambiar_password = false,
             intentos_fallidos = 0,
             bloqueado_hasta = null,
             version_sesion = public.cuentas_clientes.version_sesion + 1`,
      [rows[0].id, clientHash],
    );
    console.log(`Cuenta cliente de prueba preparada: ${clientIdentification}`);
  }
} finally {
  await db.close();
}
