import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createDatabase } from '../db/index.js';

const name = process.env.ADMIN_NAME || 'Administrador Biblioteca';
const user = process.env.ADMIN_USER || 'admin';
const password = process.env.ADMIN_PASSWORD;

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
} finally {
  await db.close();
}

