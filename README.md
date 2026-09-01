# Biblioteca Municipal de Jipijapa

Sistema web modular para administrar el catálogo físico y digital, solicitudes, préstamos, devoluciones, personal e historial de movimientos de la Biblioteca Municipal de Jipijapa.

El proyecto reutiliza la identidad visual del sistema Rehabilitación GAD por pertenecer al mismo municipio: paleta cálida, navegación turquesa y el logotipo institucional. La funcionalidad y el modelo de datos fueron desarrollados específicamente para la biblioteca.

## Estado actual

La base funcional incluye:

- Catálogo público con búsqueda por título, autor, género y tipo de material.
- Portada opcional, detalle de obra y disponibilidad física calculada.
- Visor PDF integrado, sin enlace de descarga creado por la aplicación.
- Solicitud de varios libros y cantidades sin crear cuenta de cliente.
- Prioridad transaccional por orden de llegada para el último ejemplar.
- Login para bibliotecarios y administradores.
- Aprobación/entrega, préstamo directo presencial, rechazo y devoluciones parciales o completas.
- Vencimientos y bloqueo de clientes con material activo o atrasado.
- Gestión de catálogo, archivos digitales y cuentas del personal.
- Restablecimiento de contraseña de bibliotecarios solo por administrador.
- Historial funcional de Movimientos accesible al administrador.
- Pruebas unitarias, pruebas HTTP de integración y compilación de producción.

Los requisitos que gobiernan el desarrollo están en [Requerimientos_Biblioteca_Municipal.md](./Requerimientos_Biblioteca_Municipal.md) y [ESPECIFICACION_FUNCIONAL_TECNICA_BIBLIOTECA.md](./ESPECIFICACION_FUNCIONAL_TECNICA_BIBLIOTECA.md).

## Arquitectura

```text
client/                          React + Vite
├── src/components/             layouts y componentes reutilizables
├── src/pages/public/           catálogo, detalle, solicitud y visor
├── src/pages/staff/            panel interno por rol
├── src/state/                  sesión y solicitud pública
└── src/test/                   configuración de pruebas

server/                          Node.js + Express
├── src/core/                   errores, HTTP y validación transversal
├── src/config/                 variables de entorno validadas
├── src/db/                     pool y transacciones PostgreSQL
├── src/modules/                módulos por dominio
│   ├── auth/
│   ├── catalog/
│   ├── loans/
│   ├── admin/
│   ├── movements/
│   ├── dashboard/
│   └── storage/
├── src/scripts/                migraciones y bootstrap de administrador
└── test/                       pruebas unitarias e integración HTTP

supabase/
├── migrations/                 esquema PostgreSQL reproducible
├── config.toml                 entorno local oficial de Supabase
└── seed.sql                    punto de entrada para datos iniciales
```

La API Express es el único acceso de la aplicación a PostgreSQL. El navegador no recibe credenciales de base de datos ni la clave secreta de Supabase.

## Tecnología

- Node.js 20.19 o superior.
- React 18, Vite 8, React Router y Axios.
- Bootstrap 5, CSS propio, Font Awesome y SweetAlert2.
- Express, Zod, JWT, bcrypt, Helmet y limitación de solicitudes públicas.
- PostgreSQL administrado por Supabase mediante `pg`.
- Supabase Storage privado para portadas y documentos digitales.
- Node Test Runner, Supertest, Vitest y Testing Library.

Las versiones están fijadas y `package-lock.json` debe conservarse en el repositorio.

## Instalación local

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

El archivo de ejemplo ya está preparado para Supabase local en Docker:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres
DB_SSL=false
JWT_SECRET=biblioteca-local-jipijapa-2026-cambiar-en-produccion
CLIENT_URL=http://localhost:5173
```

Para usar Storage en Supabase:

```env
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY` es exclusivamente del servidor. Nunca debe aparecer en `client/.env`, variables `VITE_*`, commits, capturas ni registros.

Si Storage no está configurado, las portadas y PDF se guardan localmente bajo `server/uploads/` durante desarrollo.

### 3. Supabase local con Docker

La forma predeterminada de desarrollo es Supabase CLI local. Requiere Docker
Desktop activo. La primera ejecución descarga las imágenes y puede tardar varios
minutos:

```bash
npm run local:setup
```

Este comando inicia Supabase, reconstruye la base con las migraciones y crea la
cuenta administradora configurada en `server/.env`. Los reinicios normales no
eliminan datos:

```bash
npm run supabase:start
npm run dev
```

Para reconstruir deliberadamente la base desde cero:

```bash
npm run local:reset
```

Servicios locales principales:

- Aplicación: `http://localhost:5173`
- API Express: `http://localhost:4000`
- Supabase API/Storage: `http://127.0.0.1:55321`
- PostgreSQL: `127.0.0.1:55322`, base/usuario/contraseña `postgres`
- Supabase Studio: `http://127.0.0.1:55323`

El bloque `5532x` evita conflictos con otros proyectos Supabase locales que
utilicen los puertos predeterminados `5432x`.

Use `npm run supabase:status` para ver el estado y las claves locales, y
`npm run supabase:stop` para detener los contenedores. Este entorno es solo para
desarrollo y no debe exponerse a Internet.

La migración crea tablas, relaciones, restricciones, índices y RLS. Los roles
`anon` y `authenticated` no reciben acceso directo a ninguna tabla de negocio.
No combine `supabase db reset` y `npm run db:migrate` sobre la misma base sin
revisar el historial: para desarrollo local, Supabase CLI administra las
migraciones de `supabase/migrations`.

### 4. Cuentas locales de prueba

Defina en `server/.env`:

```env
ADMIN_NAME=Administrador Biblioteca
ADMIN_USER=admin
ADMIN_PASSWORD="una-contraseña-temporal-segura"
LIBRARIAN_NAME=Bibliotecaria de Pruebas
LIBRARIAN_USER=bibliotecaria
LIBRARIAN_PASSWORD="Biblioteca#2026"
```

Luego ejecute:

```bash
npm run db:seed
```

El script es repetible y prepara el administrador y, cuando se define `LIBRARIAN_PASSWORD`, la cuenta bibliotecaria local. En el entorno de desarrollo incluido se puede probar con:

- Administrador: `admin` / `Admin#Cambiar2026`
- Bibliotecaria: `bibliotecaria` / `Biblioteca#2026`

Estas credenciales son únicamente para Docker local y deben reemplazarse u omitirse antes de publicar.

El archivo `supabase/seed.sql` carga diez materiales, autores, clientes y solicitudes sintéticas. Supabase lo ejecuta al reconstruir la base; también puede aplicarse sobre una base local existente porque usa inserciones repetibles y no elimina datos manuales.

### 5. Desarrollo

```bash
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000`
- Salud: `http://localhost:4000/api/health`

## Scripts

| Comando | Función |
|---|---|
| `npm run dev` | Inicia API y cliente en paralelo. |
| `npm run local:setup` | Inicia Supabase, reconstruye la base y crea el administrador local. |
| `npm run local:reset` | Reconstruye la base local y vuelve a crear el administrador. |
| `npm run supabase:start` | Inicia los contenedores locales. |
| `npm run supabase:status` | Muestra URLs y credenciales locales. |
| `npm run supabase:stop` | Detiene los contenedores conservando los datos. |
| `npm run build` | Genera el frontend optimizado en `client/dist`. |
| `npm test` | Ejecuta pruebas del servidor y cliente. |
| `npm run test:coverage` | Ejecuta las suites con cobertura. |
| `npm run qa` | Ejecuta pruebas y compilación de producción. |
| `npm run db:migrate` | Aplica migraciones pendientes. |
| `npm run db:seed` | Crea o actualiza las cuentas locales configuradas. |

## Pruebas y estrategia de QA

La suite cubre actualmente:

- Autenticación correcta e intento inválido.
- Validación de contacto del cliente.
- Bloqueo por préstamo activo/atrasado.
- Priorización del último ejemplar y orden estable de bloqueos.
- Rechazo automático cuando el stock ya fue comprometido.
- Endpoints públicos por HTTP.
- Protección de endpoints internos.
- Estado local de la solicitud en React.
- Mapeo visual de estados operativos.

Antes de fusionar una entrega:

```bash
npm audit
npm run qa
```

Para cambios de base de datos también se debe validar la migración sobre una base vacía y una base con la migración anterior aplicada.

## Reglas importantes de implementación

### Concurrencia del último ejemplar

La creación de solicitudes se ejecuta dentro de una transacción. Los libros se bloquean con `FOR UPDATE` en orden ascendente de ID; después se calcula el material ya comprometido por solicitudes pendientes, préstamos activos y atrasados. Esto garantiza que la primera transacción válida aparte la unidad y que las posteriores se registren como rechazadas sin disponibilidad negativa.

### Disponibilidad

```text
disponible = cantidad_total
             - cantidades de solicitudes pendientes
             - cantidades activas o atrasadas aún no devueltas
```

No existe un campo editable de cantidad disponible.

### Archivos

- Portadas: JPG, PNG o WebP.
- Lectura digital V1: PDF.
- No existe un límite de tamaño definido por la aplicación; siguen aplicando los límites técnicos del proveedor y la infraestructura.
- Los buckets son privados y se crean desde el servidor cuando se realiza la primera carga.
- La API entrega PDF con disposición `inline` y sin caché privada persistente.

### Contraseñas

- Se almacenan con bcrypt, nunca en texto plano.
- Los bibliotecarios no tienen recuperación por correo ni autogestión.
- Solo un administrador puede restablecer la contraseña de un bibliotecario.
- Una cuenta inactiva es rechazada en cada operación protegida, incluso si conserva un JWT anterior.

## API principal

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/api/catalogo` | Público |
| `GET` | `/api/catalogo/:id` | Público |
| `GET` | `/api/catalogo/:id/portada` | Público |
| `GET` | `/api/catalogo/:id/visor` | Público condicionado |
| `POST` | `/api/solicitudes` | Público, con rate limit |
| `GET` | `/api/solicitudes/:codigo/consulta` | Público con identificación |
| `POST` | `/api/auth/login` | Personal |
| `GET` | `/api/prestamos` | Bibliotecario/Administrador |
| `POST` | `/api/prestamos/directo` | Bibliotecario/Administrador |
| `POST` | `/api/prestamos/:id/aprobar-entregar` | Bibliotecario/Administrador |
| `POST` | `/api/prestamos/:id/rechazar` | Bibliotecario/Administrador |
| `POST` | `/api/prestamos/:id/devoluciones` | Bibliotecario/Administrador |
| `POST/PATCH` | `/api/admin/libros[/:id]` | Administrador |
| `POST` | `/api/admin/libros/:id/portada` | Administrador |
| `POST` | `/api/admin/libros/:id/digital` | Administrador |
| `GET/POST/PATCH` | `/api/admin/personal[/:id]` | Administrador |
| `POST` | `/api/admin/personal/:id/restablecer-password` | Administrador |
| `GET` | `/api/movimientos` | Administrador |

## Despliegue

### Backend en Render

El archivo `render.yaml` instala dependencias, aplica migraciones y arranca la API. Configure en Render:

- `DATABASE_URL`: conexión directa si Render alcanza IPv6; en caso contrario, Shared Pooler en modo sesión (`5432`) para un backend persistente.
- `DB_SSL=true` y validación de certificado activa.
- `CLIENT_URL`: URL del frontend, sin ruta final.
- `SUPABASE_URL` y `SUPABASE_SECRET_KEY`.
- `JWT_SECRET`: valor largo y aleatorio.

### Frontend en Vercel

Importe el repositorio con `client` como Root Directory y configure:

```env
VITE_API_URL=https://<api-render>
```

El archivo `client/vercel.json` permite abrir rutas internas directamente.

## Escalabilidad

Los módulos se comunican mediante repositorios y servicios, no importando SQL desde las páginas o reglas de negocio desde las rutas. Esto permite:

- Sustituir almacenamiento local por Supabase Storage sin modificar controladores.
- Probar reglas con repositorios falsos y API mediante dependencias inyectadas.
- Añadir reportes, notificaciones o reservas como módulos independientes.
- Separar procesos programados cuando el volumen lo requiera.
- Escalar horizontalmente la API porque el estado operativo reside en PostgreSQL/Storage.

## Documentación de decisiones

Cambios funcionales deben actualizar primero la especificación y sus criterios de aceptación. Migraciones posteriores deben generarse con:

```bash
npx supabase migration new nombre_descriptivo
```

No edite una migración que ya haya sido aplicada en producción; cree una nueva.
