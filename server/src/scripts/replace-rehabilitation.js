import 'dotenv/config';
import { createDatabase } from '../db/index.js';

const legacyTables = [
  'auditoria', 'caja', 'citas', 'diagnosticos', 'documentos_paciente',
  'especialidades', 'evoluciones', 'historias_clinicas', 'horarios',
  'movimientos_caja', 'notificaciones', 'pacientes', 'pagos', 'permisos',
  'prescripcion_detalle', 'prescripciones', 'profesional_duraciones',
  'profesionales', 'roles', 'roles_permisos', 'schema_migrations',
  'tratamiento_sesiones', 'tratamientos', 'usuarios',
];
const legacySet = new Set(legacyTables);
const requiredFingerprint = ['pacientes', 'citas', 'usuarios', 'roles'];
const execute = process.argv.includes('--execute');
const confirmation = process.env.CONFIRM_REMOTE_REPLACE;
const databaseUrl = new URL(process.env.DATABASE_URL || '');

if (execute && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
  throw new Error('El reemplazo remoto no puede ejecutarse contra localhost. Use `npm run local:reset` para la base local.');
}
if (execute && confirmation !== 'BORRAR_REHABILITACION_GAD') {
  throw new Error('Para ejecutar el reemplazo defina CONFIRM_REMOTE_REPLACE=BORRAR_REHABILITACION_GAD.');
}

const db = createDatabase();
try {
  const { rows } = await db.query(
    `select c.relname as tabla, coalesce(s.n_live_tup, 0)::bigint as filas_aprox
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       left join pg_catalog.pg_stat_user_tables s on s.relid = c.oid
      where n.nspname = 'public' and c.relkind in ('r', 'p')
      order by c.relname`,
  );
  const names = rows.map((row) => row.tabla);
  const unexpected = names.filter((name) => !legacySet.has(name));
  const missingFingerprint = requiredFingerprint.filter((name) => !names.includes(name));

  console.table(rows);
  if (unexpected.length) {
    throw new Error(`Reemplazo cancelado: existen tablas públicas fuera de la lista autorizada: ${unexpected.join(', ')}.`);
  }
  if (missingFingerprint.length) {
    throw new Error(`Reemplazo cancelado: la base no coincide con Rehabilitación GAD. Faltan: ${missingFingerprint.join(', ')}.`);
  }
  if (!execute) {
    console.log('Comprobación superada. No se eliminó ningún dato.');
    console.log('Para reemplazar esta base use --execute y la confirmación indicada en la documentación.');
  } else {
    await db.transaction(async (tx) => {
      for (const table of legacyTables) {
        await tx.query(`drop table if exists public."${table}" cascade`);
      }
    });
    console.log(`Reemplazo completado: se eliminaron ${names.length} tablas autorizadas de Rehabilitación GAD.`);
    console.log('Los esquemas internos de Supabase no fueron modificados. Ejecute db:migrate y db:seed para instalar Biblioteca.');
  }
} finally {
  await db.close();
}
