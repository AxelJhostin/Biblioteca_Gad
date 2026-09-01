# Entrega final y guía de relevo

## Sistema de Biblioteca Municipal de Jipijapa

**Fecha de corte:** 1 de septiembre de 2026  
**Rama revisada:** `main`  
**Estado general:** funcional y verificado en entorno local  
**Despliegue remoto:** preparado y documentado, pero no ejecutado  

Este documento resume el estado real del proyecto y permite que el personal municipal o el siguiente responsable pueda instalarlo, probarlo, desplegarlo y continuar su evolución sin repetir el análisis realizado durante el desarrollo.

> Esta guía no contiene secretos ni credenciales de producción. Las cuentas de demostración son exclusivamente locales y están identificadas en el README.

## 1. Resumen ejecutivo

El sistema cubre la administración del catálogo físico y digital, las solicitudes y préstamos, las devoluciones, el personal, los movimientos de auditoría y la generación de reportes institucionales de la Biblioteca Municipal de Jipijapa.

La solución conserva la identidad visual municipal usada en Rehabilitación GAD, pero tiene una arquitectura, reglas de negocio y modelo de datos propios para la biblioteca. Está organizada en cliente, API, módulos de dominio, migraciones y pruebas automatizadas.

Al momento de esta entrega:

- El alcance originalmente aprobado está implementado y probado localmente.
- La aplicación funciona en escritorio y dispositivos móviles.
- Supabase local se ejecuta mediante Docker y contiene datos de demostración reproducibles.
- El despliegue para Supabase, Render y Vercel está preparado, pero no se modificó ningún proyecto remoto.
- La solicitud de última hora para incorporar cuentas de clientes está completamente especificada en `PLAN_CUENTAS_CLIENTES.md`, pero todavía no fue implementada en código ni base de datos.

## 2. Funcionalidad entregada

### Portal público

- Catálogo completo con búsqueda por título, autor, género y tipo de material.
- Visualización de portada, información general y disponibilidad física.
- Selección de varios libros y cantidades para una solicitud.
- Validación de cédula ecuatoriana, nombres y teléfono ecuatoriano.
- Mensajes claros cuando faltan libros o existen datos inválidos.
- Lectura de material digital mediante un visor PDF integrado.
- Zoom entre 50 % y 200 %.
- Vista de una o dos páginas, transición tipo hoja y navegación por teclado o gestos.
- Desplazamiento interno vertical y horizontal dentro del documento.
- Adaptación automática a una página en pantallas móviles.

### Bibliotecario

- Inicio de sesión protegido.
- Consulta detallada de solicitudes y materiales solicitados.
- Aprobación, entrega o rechazo de solicitudes.
- Registro de préstamos presenciales directos.
- Registro de devoluciones parciales y completas.
- Consulta detallada del catálogo, portadas y disponibilidad.
- Gestión de libros, ejemplares y archivos digitales conforme a permisos.

### Administrador

- Todas las operaciones autorizadas para el rol administrativo.
- Gestión de cuentas del personal.
- Restablecimiento de contraseñas de bibliotecarios.
- Consulta del historial de movimientos.
- Exportación de inventario, préstamos y movimientos en PDF y Excel.
- Reportes con encabezado, identidad visual y estructura institucional municipal.

### Reglas de negocio relevantes

- Las solicitudes concurrentes se atienden por fecha y hora de llegada.
- El último ejemplar disponible se asigna de forma transaccional a la primera solicitud que cumpla las condiciones.
- Un rechazo cambia el estado del préstamo y genera el movimiento correspondiente; no envía notificaciones.
- Cada aprobación, rechazo, devolución, ingreso o edición relevante deja trazabilidad en `Movimiento`.
- Un cliente con material activo o atrasado queda sujeto a las restricciones definidas en los requerimientos.
- El identificador físico del libro se conserva como texto libre hasta que la biblioteca confirme su formato definitivo.

## 3. Arquitectura técnica

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| Cliente | React, Vite, React Router, Bootstrap | Interfaz pública e interna, validaciones y experiencia adaptable |
| API | Node.js, Express, Zod | Autenticación, autorización, validación y reglas de negocio |
| Datos | PostgreSQL mediante Supabase | Persistencia transaccional, restricciones y migraciones |
| Archivos | Supabase Storage privado | Portadas y documentos digitales |
| Entorno local | Supabase CLI y Docker | Base de datos, Storage y servicios reproducibles |
| Pruebas | Node Test Runner, Supertest, Vitest y Playwright | Pruebas unitarias, integración HTTP, componentes y flujos E2E |
| Despliegue | Render y Vercel | API y cliente web, respectivamente |

La API Express es el único punto de acceso de la aplicación a PostgreSQL. Las credenciales privilegiadas y las claves del servidor nunca deben enviarse al navegador.

## 4. Puesta en marcha local

### Requisitos

- Node.js 20.19 o superior.
- npm.
- Docker Desktop en ejecución.
- Supabase CLI disponible mediante las dependencias del proyecto.

### Instalación

Desde la raíz del repositorio:

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run local:setup
npm run dev
```

`local:setup` inicia Supabase local, aplica las migraciones y carga los datos de demostración. Si el entorno ya existe y debe reconstruirse desde cero, se puede usar:

```bash
npm run local:reset
```

### Servicios locales

| Servicio | Dirección |
| --- | --- |
| Aplicación web | `http://localhost:5173` |
| API | `http://localhost:4000` |
| API de Supabase local | `http://127.0.0.1:55321` |
| PostgreSQL local | `127.0.0.1:55322` |
| Supabase Studio | `http://127.0.0.1:55323` |

Las cuentas locales de administrador y bibliotecario están documentadas en la sección **Cuentas locales de prueba** del `README.md`. No deben reutilizarse en producción.

## 5. Verificación y QA

La comprobación completa se ejecuta con:

```bash
npx playwright install chromium
npm run qa:full
```

La última ejecución integral registrada terminó correctamente con:

- 20 pruebas del servidor, entre unitarias e integración HTTP.
- 14 pruebas del cliente y sus componentes.
- 3 escenarios E2E en navegador.
- Compilación de producción del cliente y servidor.

Los escenarios E2E comprueban, entre otros puntos:

- Validaciones y solicitud pública desde un viewport móvil.
- Visor digital: zoom, una o dos páginas, adaptación móvil y desplazamiento interno del PDF.
- Acceso administrativo y exportación de reportes PDF/XLSX.

Antes de una entrega o despliegue también se recomienda ejecutar:

```bash
npm audit --omit=dev
npm run qa:full
```

Si solo se modificó documentación, no es necesario repetir toda la batería, pero sí revisar el diff y los enlaces.

## 6. Mapa de documentación

| Documento | Uso |
| --- | --- |
| `README.md` | Instalación, comandos, credenciales locales, arquitectura y operación diaria |
| `Requerimientos_Biblioteca_Municipal.md` | Necesidades funcionales y reglas aprobadas |
| `ESPECIFICACION_FUNCIONAL_TECNICA_BIBLIOTECA.md` | Diseño funcional y técnico detallado |
| `DEPLOY_SUPABASE_RENDER.md` | Preparación y procedimiento de despliegue |
| `PLAN_CUENTAS_CLIENTES.md` | Ampliación pendiente para registro e inicio de sesión de clientes |
| `ENTREGA_FINAL_PASANTIA.md` | Estado de entrega, relevo, riesgos y pasos siguientes |

## 7. Ampliación pendiente: cuentas de clientes

La nueva solicitud municipal se encuentra diseñada, pero deliberadamente no fue incorporada al código durante esta entrega. Su fuente de verdad es `PLAN_CUENTAS_CLIENTES.md`.

Los acuerdos principales son:

- La cuenta será obligatoria únicamente para solicitar préstamos físicos.
- El catálogo, los detalles y la lectura digital continuarán siendo públicos.
- El cliente podrá registrarse por sí mismo con cédula ecuatoriana y contraseña.
- La cédula será el identificador de inicio de sesión.
- Bibliotecarios y administradores podrán restablecer contraseñas de clientes.
- No habrá recuperación automática por correo en esta versión.
- Las credenciales de clientes estarán separadas de las cuentas del personal.
- Los clientes históricos deberán activar una cuenta enlazada a su registro existente, sin duplicar su historial.

La implementación debe seguir el orden definido en el plan: migración, repositorios, servicios, endpoints, interfaz, pruebas y actualización documental.

## 8. Despliegue y propiedad de credenciales

El orden recomendado para publicar es:

1. La institución define la cuenta y el proyecto definitivo de Supabase.
2. Se aplican las migraciones en un entorno remoto vacío o expresamente autorizado.
3. Se configuran Storage, políticas y variables privadas.
4. Se despliega la API en Render.
5. Se despliega el cliente en Vercel con la URL pública de la API.
6. Se ejecuta una prueba de humo de los tres roles y del flujo público.

El procedimiento exacto y las variables necesarias están en `DEPLOY_SUPABASE_RENDER.md`.

### Advertencias importantes

- No ejecutar comandos de sustitución del proyecto Rehabilitación GAD sin autorización explícita y respaldo verificado.
- No eliminar ni limpiar una base remota solamente porque las credenciales estén disponibles.
- No guardar contraseñas, JWT secrets, claves de servicio o cadenas de conexión reales en Git.
- No colocar claves privadas de Supabase en variables `VITE_*` ni en el cliente.
- No utilizar las cuentas o contraseñas de demostración en producción.
- No cargar los datos semilla locales en producción salvo aprobación expresa.

Hasta la fecha de corte, el Supabase remoto usado por Rehabilitación GAD no fue modificado por este proyecto.

## 9. Seguridad y protección de datos

La continuación del proyecto debe conservar estas reglas:

- Contraseñas almacenadas únicamente como hash seguro.
- Tokens con expiración y secretos robustos administrados por el servidor.
- Autorización por rol aplicada en la API, no solo ocultando opciones en la interfaz.
- Validación Zod en toda entrada externa y restricciones complementarias en PostgreSQL.
- Limitación de intentos en autenticación y endpoints públicos sensibles.
- Archivos validados por tipo permitido y entregados mediante acceso controlado.
- Operaciones de préstamo y disponibilidad dentro de transacciones.
- Registro de movimientos para acciones administrativas y bibliotecarias relevantes.
- Respaldo o punto de recuperación confirmado antes de cualquier cambio remoto destructivo.

La base en la nube administrará sus respaldos; no se diseñó un mecanismo adicional de respaldo dentro de la aplicación.

## 10. Notas operativas

- Un servicio gratuito de Render puede entrar en reposo y tardar en responder a la primera solicitud.
- El almacenamiento local de archivos sirve como apoyo de desarrollo, pero no es persistente para producción en Render.
- Las migraciones nuevas deben crearse como archivos adicionales; no se deben reescribir migraciones ya aplicadas.
- El identificador de libro sigue siendo `string` hasta confirmar el sistema físico usado por la biblioteca.
- No se definió un límite funcional para el tamaño de PDF en esta versión; la infraestructura de producción puede imponer límites técnicos.
- El primer despliegue remoto requiere una aceptación funcional nueva, aunque toda la batería local esté aprobada.

## 11. Lista de entrega institucional

### Código y documentación

- [ ] Revisar `git status` y confirmar qué archivos se entregarán.
- [ ] Crear el commit final con un mensaje descriptivo.
- [ ] Compartir el repositorio y esta guía con el responsable institucional.
- [ ] Confirmar quién será responsable del mantenimiento posterior.

### Infraestructura

- [ ] Definir la cuenta institucional de Supabase.
- [ ] Definir propietarios y accesos de Render y Vercel.
- [ ] Generar secretos distintos de los valores locales.
- [ ] Confirmar respaldo antes de aplicar cambios a una base existente.
- [ ] Aplicar migraciones y configurar Storage.
- [ ] Verificar el endpoint de salud de la API.

### Aceptación funcional

- [ ] Probar catálogo, filtros y detalle desde escritorio y móvil.
- [ ] Probar solicitud, aprobación, rechazo, entrega y devolución.
- [ ] Probar préstamo directo desde bibliotecario.
- [ ] Probar accesos y restricciones de bibliotecario y administrador.
- [ ] Probar visor digital, zoom, dos páginas y desplazamiento.
- [ ] Probar reportes PDF y Excel con datos reales de ensayo.
- [ ] Cambiar todas las contraseñas temporales antes de uso real.

### Solicitud de cuentas de clientes

- [ ] Obtener aprobación formal de `PLAN_CUENTAS_CLIENTES.md`.
- [ ] Implementar primero en Supabase local.
- [ ] Ejecutar pruebas unitarias, integración y E2E del nuevo flujo.
- [ ] Actualizar requerimientos, especificación y README al terminar.

## 12. Próximos pasos recomendados

1. Entregar y validar esta documentación con el responsable de la biblioteca.
2. Definir las cuentas institucionales de infraestructura y la política de custodia de credenciales.
3. Implementar localmente la ampliación de cuentas de clientes siguiendo su plan técnico.
4. Ejecutar `npm run qa:full` y corregir cualquier regresión.
5. Desplegar en un proyecto Supabase autorizado, Render y Vercel.
6. Realizar una aceptación final con usuarios reales de cada rol.

## 13. Estado de cierre

El código actual queda listo para demostrar y operar localmente dentro del alcance implementado. El proyecto remoto anterior permanece intacto. La ampliación de cuentas de clientes queda documentada con suficiente detalle para continuarla sin improvisar el modelo de datos, la seguridad o el flujo de los usuarios.

Esta separación permite presentar una versión estable hoy y desarrollar el cambio de última hora de forma controlada, verificable y sin poner en riesgo la información existente.
