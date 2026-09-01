# Guía de despliegue en Supabase, Render y Vercel

> Estado actual: no se ha modificado ni eliminado ningún dato del Supabase
> remoto de Rehabilitación GAD. Todo lo descrito aquí queda preparado para una
> futura activación expresamente autorizada.

Este proyecto está preparado para reutilizar el proyecto de Supabase que alojó
Rehabilitación GAD. La sustitución elimina exclusivamente las tablas conocidas
de esa aplicación en `public`; nunca elimina ni modifica los esquemas internos
`auth`, `storage`, `realtime`, `vault`, `extensions` o `graphql`.

## 1. Orden de despliegue

1. Preparar la base de Supabase elegida y ejecutar las migraciones.
2. Desplegar la API en Render y comprobar `/api/health`.
3. Desplegar el frontend en Vercel con la URL pública de Render.
4. Actualizar `CLIENT_URL` en Render con el dominio definitivo de Vercel.
5. Volver a desplegar la API y ejecutar la prueba funcional completa.

No despliegue todavía Render apuntando al Supabase de Rehabilitación: el
reemplazo remoto está aplazado y las tablas clínicas continúan intactas.

## 2. Variables de producción de Render

Configure los secretos en Render, nunca en Git ni en variables `VITE_*`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_POOL_MAX=5
PICKUP_EXPIRY_DAYS=5
CLIENT_URL=https://<frontend>.vercel.app
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_COVERS_BUCKET=biblioteca-portadas
SUPABASE_DIGITAL_BUCKET=biblioteca-digitales
ADMIN_NAME=Administrador Biblioteca
ADMIN_USER=admin
ADMIN_PASSWORD=<contraseña-inicial-segura>
```

No configure `CLIENT_DEMO_IDENTIFICATION`, `CLIENT_DEMO_PASSWORD` ni `LIBRARIAN_PASSWORD` en producción; corresponden exclusivamente a los datos sintéticos de Docker local.

Para un backend persistente de Render en una red IPv4 se usa el **Shared Pooler
en modo sesión**, puerto `5432`. Obtenga siempre la cadena actual desde
**Supabase Dashboard → Connect**.

`JWT_SECRET` lo genera Render y debe ser distinto del utilizado por
Rehabilitación GAD. Los buckets se crean privados cuando se carga el primer
archivo. `PICKUP_EXPIRY_DAYS` define cuántos días se reserva un material
aprobado antes de marcar el retiro como vencido y liberar sus unidades.

## 3. Comprobación previa no destructiva de Supabase

Con `server/.env` apuntando temporalmente al proyecto remoto:

```bash
npm run db:replace:check
```

El comando debe mostrar únicamente las 24 tablas reconocidas de
Rehabilitación GAD y terminar con **Comprobación superada**. Si aparece una
tabla desconocida, el proceso se detiene.

Antes de eliminar datos, el responsable del municipio debe confirmar que la
base de Rehabilitación es prescindible o que dispone de un respaldo válido.

## 4. Sustitución remota aplazada

Esta operación queda disponible para el futuro y no debe ejecutarse sin nueva
autorización. Es irreversible desde la aplicación:

```bash
CONFIRM_REMOTE_REPLACE=BORRAR_REHABILITACION_GAD npm run db:replace:rehabilitacion
npm run db:migrate
npm run db:seed
```

El primer comando rechaza `localhost`, valida la huella de Rehabilitación y
solo ejecuta `DROP TABLE` sobre una lista blanca explícita. Después se instala
el esquema de Biblioteca y se crea la cuenta administradora configurada.

No se ejecuta `supabase/seed.sql` en producción: los materiales de demostración
son exclusivamente para el entorno local.

## 5. Backend en Render

El archivo `render.yaml` define el backend. Durante cada despliegue:

1. instala dependencias con `npm ci`;
2. aplica únicamente migraciones pendientes;
3. prepara la cuenta administradora configurada;
4. inicia la API y valida `/api/health`.

Los valores marcados `sync: false` se ingresan en el panel de Render. Render no
debe recibir `CONFIRM_REMOTE_REPLACE`; esa variable solo existe durante la
sustitución manual y se elimina inmediatamente después.

El Blueprint usa el plan gratuito. Como ese plan no incluye comandos
`pre-deploy`, la migración idempotente y el bootstrap del administrador se
ejecutan en `buildCommand`. Si cualquiera falla, el despliegue no continúa.

## 6. Frontend en Vercel

Importe el mismo repositorio y mantenga **Root Directory** en la raíz del
repositorio (`.`). El archivo `vercel.json` ya define:

- framework Vite;
- instalación reproducible mediante `npm ci`;
- compilación exclusiva del workspace `client`;
- salida estática en `client/dist`;
- rewrite de todas las rutas a `index.html` para React Router;
- cabeceras básicas contra MIME sniffing, iframes y permisos innecesarios.

Configure en **Settings → Environment Variables**, para Production y Preview:

```env
VITE_API_URL=https://<api-render>.onrender.com
```

`VITE_API_URL` es pública y solo contiene la dirección de la API. No coloque
`DATABASE_URL`, `SUPABASE_SECRET_KEY`, `JWT_SECRET` ni contraseñas en Vercel.

Después del primer despliegue copie el dominio definitivo, por ejemplo
`https://biblioteca-jipijapa.vercel.app`, y úselo como `CLIENT_URL` en Render.
Para permitir más de un dominio, `CLIENT_URL` admite una lista separada por
comas. Evite usar `*` porque el backend valida orígenes explícitos.

Los despliegues Preview de Vercel usan dominios variables. Si necesitan acceder
a la API real, agregue explícitamente la URL de Preview a `CLIENT_URL`; de lo
contrario es normal que el navegador bloquee esas peticiones por CORS.

## 7. Verificación posterior

```bash
curl https://<api-render>/api/health
```

Luego verifique catálogo público, registro/login de Cliente, solicitud autenticada,
historial propio, login de administrador, registro de libro con portada, préstamo directo, devolución y movimientos. Desde
el panel descargue además un PDF de Préstamos, un Excel de Inventario y confirme
que Movimientos ofrece ambos formatos únicamente al Administrador.

Compruebe también directamente rutas internas del frontend, por ejemplo:

```text
https://<frontend-vercel>/personal/login
https://<frontend-vercel>/solicitud
https://<frontend-vercel>/cuenta/login
https://<frontend-vercel>/mi-cuenta
https://<frontend-vercel>/panel
```

Las tres deben cargar `index.html` sin responder `404`; `/panel` debe redirigir
al login cuando no existe una sesión válida.
