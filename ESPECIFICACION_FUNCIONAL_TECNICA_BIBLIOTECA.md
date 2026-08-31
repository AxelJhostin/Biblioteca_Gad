# Especificación funcional y técnica — Sistema de Gestión de Biblioteca Municipal

**Versión:** 1.0  
**Fecha:** 31 de agosto de 2026  
**Estado:** Base aprobable para iniciar el desarrollo  
**Documento fuente:** `Requerimientos_Biblioteca_Municipal.md`

---

## 1. Propósito

Construir un sistema web para administrar el catálogo físico y digital de la Biblioteca Municipal, las solicitudes y préstamos físicos, las devoluciones y las cuentas del personal.

El sistema conservará la línea visual y la arquitectura de referencia de **Rehabilitación GAD**: una aplicación React/Vite con API Express, PostgreSQL y control de acceso por roles. La identidad visible se adaptará a la Biblioteca Municipal (nombre, logotipo, textos e iconografía), sin reutilizar contenido clínico ni datos de aquel sistema.

## 2. Alcance de la versión 1

### 2.1 Incluido

- Catálogo público, búsqueda, filtros, ficha de obra, portada opcional y disponibilidad física calculada.
- Consulta pública de material digital mediante visor integrado, sin botón ni enlace de descarga.
- Solicitud pública de préstamo físico, sin crear una cuenta para el cliente.
- Autenticación únicamente para bibliotecarios y administradores.
- Revisión, aprobación, rechazo, entrega y devolución de préstamos.
- Bloqueo de nuevas solicitudes de un cliente que tenga material sin devolver vencido o activo.
- Gestión administrativa de libros, autores, archivos digitales y cuentas de bibliotecarios.
- Historial de movimientos de préstamos, devoluciones, ingresos, ediciones y rechazos.
- Diseño responsive basado en el panel de referencia.

### 2.2 Fuera de alcance

- Registro, inicio de sesión o perfil para clientes.
- Reservas de ejemplares no disponibles.
- Multas, sanciones, cobros o pagos por atraso.
- Integración con correo, WhatsApp, SMS, lectores de códigos de barras o servicios externos.
- Reportes estadísticos avanzados o exportación a PDF/Excel. El historial operativo sí forma parte de esta versión.
- Gestión de varias sucursales, ubicaciones físicas, ejemplares individualizados o inventario por estantería.
- Reservas o lista de espera de libros no disponibles. La prioridad por orden de llegada de una solicitud es una preasignación interna del flujo de préstamo, no un módulo de reservas.

## 3. Glosario y principios

| Término | Definición |
|---|---|
| Cliente | Persona que consulta el catálogo o solicita un préstamo. No posee cuenta de acceso. |
| Personal | Cuenta autenticada con rol `bibliotecario` o `administrador`. |
| Libro | Registro bibliográfico y de existencias de una obra o material. Incluye libros, revistas, folletos, tesis u otros tipos. |
| Ejemplar | Una unidad física disponible de un libro. En V1 se administra por cantidad, no por código individual. |
| Solicitud | Pedido público pendiente de revisión. Al registrarse válidamente, aparta cantidades para respetar el orden de llegada. |
| Préstamo activo | Material entregado físicamente al cliente y aún no devuelto por completo. |
| Atraso | Estado de un préstamo con material pendiente cuya fecha límite ya pasó. No genera multa. |
| Movimiento | Registro funcional e inmutable de una acción relevante: préstamo, devolución, ingreso o edición de libro, o rechazo de solicitud. |
| Visor digital | Experiencia de lectura integrada en la aplicación; no se presenta una opción de descarga directa. |

Principios de negocio:

1. La disponibilidad nunca se edita manualmente: se calcula a partir de existencias totales menos cantidades prestadas o apartadas por solicitudes pendientes.
2. Las decisiones críticas de inventario y permisos se validan en la API, no solo en la interfaz.
3. El identificador físico existente de cada libro se conserva como ID Libro, no se reemplaza ni regenera y se mantiene como texto hasta confirmar su formato.
4. Cada cambio relevante deja rastro de quién lo realizó, cuándo y sobre qué registro mediante la entidad Movimiento.

## 4. Roles y permisos

| Capacidades | Público / cliente | Bibliotecario | Administrador |
|---|:---:|:---:|:---:|
| Consultar catálogo, ficha y disponibilidad | Sí | Sí | Sí |
| Usar visor digital | Sí | Sí | Sí |
| Solicitar préstamo sin login | Sí | — | — |
| Revisar solicitudes | — | Sí | Sí |
| Aprobar, rechazar, entregar o devolver | — | Sí | Sí |
| Consultar préstamos activos y atrasados | — | Sí | Sí |
| Crear o editar libros y autores | — | — | Sí |
| Cargar o reemplazar archivo digital | — | — | Sí |
| Consultar movimientos completos | — | — | Sí |
| Crear, editar, activar o desactivar cuentas | — | — | Sí |

Notas:

- No existe un rol autenticado de cliente.
- Una cuenta inactiva no puede iniciar sesión ni ejecutar acciones posteriores aunque conserve un token previo; la API verifica su vigencia en operaciones protegidas.
- El administrador hereda las capacidades del bibliotecario.

## 5. Casos de uso y flujos

### 5.1 Consulta de catálogo público

1. La persona abre la página principal del catálogo.
2. Puede buscar por título, autor, tipo de material o género, además de navegar el catálogo completo. El código bibliotecario podrá incorporarse como criterio adicional cuando la biblioteca confirme su formato.
3. Puede filtrar por tipo, género, disponibilidad física y disponibilidad digital.
4. Cada tarjeta muestra la imagen de portada si existe, título, autores, tipo, año, disponibilidad y distintivo digital.
5. Al abrir la ficha ve descripción, todos los autores, datos bibliográficos, existencias y acciones disponibles.

### 5.2 Lectura de material digital

1. Desde una ficha con archivo digital disponible, la persona selecciona **Leer en línea**.
2. El sistema abre el visor dentro de una página o modal de la aplicación.
3. El visor muestra páginas, zoom y navegación; no ofrece un control de descarga ni enlaza al archivo original.
4. Si no existe archivo digital o está inactivo, la acción no se muestra.

> Restricción conocida: ningún visor web puede impedir de forma absoluta que una persona capture contenido mostrado en su navegador. El requisito se implementa como ausencia de descarga directa, URLs no expuestas en la interfaz, autorización del endpoint de visualización y entrega optimizada para lectura; no como un mecanismo DRM.

### 5.3 Solicitud pública de préstamo

1. La persona agrega uno o varios libros físicos disponibles a una solicitud.
2. Por cada libro indica una cantidad entera mayor a cero, hasta la disponibilidad mostrada.
3. Completa identificación, nombre completo y al menos un medio de contacto (teléfono o correo).
4. La API verifica que el cliente no tenga préstamos activos o atrasados y, dentro de una transacción, comprueba las existencias que no están prestadas ni apartadas previamente.
5. La primera solicitud válida que llega por una cantidad disponible queda en estado `pendiente` y aparta esas unidades. El orden lo determina el registro exitoso de la transacción y su fecha/hora.
6. Si no hay unidades suficientes, la solicitud se registra automáticamente como `rechazado`, sin apartar existencias ni crear lista de espera. La respuesta informa que el material ya no está disponible.
7. La pantalla muestra un código de solicitud para consulta presencial. No se envía notificación externa en V1.

Al recibir una solicitud pública, se registra un Movimiento de tipo `préstamo` con actor `cliente` y el detalle “Solicitud registrada” o “Solicitud rechazada automáticamente”, según el resultado. Al aprobar y entregar se registra un segundo Movimiento de préstamo con el actor de personal correspondiente.

### 5.4 Revisión y entrega por bibliotecario

1. El bibliotecario abre la bandeja de solicitudes pendientes.
2. Revisa datos del cliente, títulos, cantidades solicitadas, disponibilidad vigente e historial de préstamos abiertos.
3. Puede rechazar la solicitud e ingresar una observación opcional visible solo al personal. El rechazo libera las unidades apartadas, deja el registro en `rechazado` y no notifica al cliente.
4. Para aceptar, usa la acción **Aprobar y entregar**, define la fecha límite de devolución y confirma la entrega física.
5. La API realiza una transacción: valida que la solicitud continúe pendiente y con sus unidades apartadas, registra fecha de aprobación y entrega, deja el préstamo en `activo` y genera el Movimiento de préstamo.

### 5.5 Devolución

1. El bibliotecario localiza un préstamo por código, identificación o cliente.
2. Registra las cantidades devueltas por cada línea del préstamo. Puede devolverse una parte o todo el material.
3. La API impide devolver más unidades de las que siguen pendientes.
4. Al devolver parcialmente, las unidades devueltas vuelven a estar disponibles y el préstamo sigue `activo` o `atrasado` si aún vence.
5. Cuando todas las líneas están devueltas, se registra la fecha real de devolución y el préstamo queda `devuelto`.

### 5.6 Vencimientos y bloqueo

- Un préstamo con unidades pendientes pasa a `atrasado` cuando la fecha local de la biblioteca supera su fecha límite.
- El estado se recalcula al consultar préstamos y mediante una tarea programada diaria; así no depende de que un usuario abra una página.
- No se aplican multas ni sanciones.
- Mientras el cliente tenga uno o más préstamos `activo` o `atrasado`, la API rechaza nuevas solicitudes. Las solicitudes pendientes previas pueden seguir siendo revisadas, pero no deben aprobarse si en ese momento ya existe un préstamo abierto.

## 6. Reglas de negocio verificables

| ID | Regla |
|---|---|
| RN-01 | El ID Libro se almacena temporalmente como texto libre, es único y obligatorio. Su formato definitivo se confirma con el personal de la biblioteca antes de fijar restricciones adicionales. |
| RN-02 | Un libro puede tener uno o varios autores; un autor puede estar asociado a varios libros. |
| RN-03 | `cantidad_disponible = cantidad_total − cantidades pendientes de devolver − cantidades apartadas por solicitudes pendientes`. Nunca admite valores negativos. |
| RN-04 | Una solicitud debe contener al menos una línea de libro y cada cantidad debe ser un entero positivo. |
| RN-05 | No se puede solicitar una cantidad superior a la disponible al instante de registrar la solicitud; una solicitud sin stock suficiente queda automáticamente `rechazado`. |
| RN-06 | El registro de la solicitud bloquea las filas de libros afectadas dentro de una transacción. Así, la primera solicitud válida por el último ejemplar aparta la unidad y las posteriores no pueden sobreasignarla. |
| RN-07 | Un cliente con préstamo `activo` o `atrasado` no puede crear ni recibir la aprobación de un nuevo préstamo. |
| RN-08 | El plazo de devolución es obligatorio, se establece por préstamo al entregarlo y debe ser igual o posterior a la fecha de entrega. |
| RN-09 | Los préstamos vencidos no generan multa; solamente conservan el bloqueo definido en RN-07. |
| RN-10 | Un rechazo libera cualquier unidad previamente apartada por la solicitud. Una devolución parcial libera únicamente las unidades recibidas. |
| RN-11 | La fecha real de devolución se completa solo cuando todas las líneas del préstamo fueron devueltas. |
| RN-12 | Solo un administrador puede modificar catálogo, archivos digitales o cuentas del personal. |
| RN-13 | La lectura digital es pública cuando el libro está marcado como digital y tiene un archivo activo; el archivo no se ofrece como descarga. |
| RN-14 | Aprobar préstamo, rechazar solicitud, registrar devolución, ingresar libro y editar libro generan obligatoriamente un Movimiento con actor, fecha/hora, referencias y detalle opcional. |

## 7. Modelo de información

Los identificadores técnicos pueden ser enteros autogenerados. El **ID Libro** es el identificador de negocio visible, preserva el valor que ya usa la biblioteca y se almacena como texto hasta confirmar su formato.

### 7.1 Tablas principales

| Entidad | Campos principales | Reglas / notas |
|---|---|---|
| `libros` | `id`, `id_libro_texto`, `tipo_material`, `genero`, `titulo`, `descripcion`, `anio_publicacion`, `cantidad_total`, `portada_ruta`, `digital_disponible`, `activo`, fechas | `id_libro_texto` es único y se mantiene como texto libre hasta confirmar el formato físico; total entero >= 0; portada opcional; disponibilidad calculada. |
| `autores` | `id`, `nombre_completo`, fechas | Nombre obligatorio; se normaliza para evitar duplicados accidentales. |
| `libro_autores` | `libro_id`, `autor_id`, `orden` | Relación muchos a muchos; pareja única. |
| `archivos_digitales` | `id`, `libro_id`, `nombre_original`, `ruta_segura`, `mime_type`, `tamano_bytes`, `estado`, fechas | En V1, un archivo activo por libro; conservar versiones inactivas para historial. |
| `clientes` | `id`, `identificacion`, `nombre_completo`, `telefono`, `correo`, fechas | No son cuentas. Identificación única. Teléfono o correo obligatorio. |
| `cuentas_personal` | `id`, `nombre_completo`, `usuario`, `password_hash`, `rol`, `estado`, último acceso, fechas | Roles fijos: `bibliotecario`, `administrador`. Nunca se guarda contraseña en texto. |
| `prestamos` | `id`, `codigo`, `cliente_id`, `bibliotecario_id`, `fecha_solicitud`, `fecha_aprobacion`, `fecha_entrega`, `fecha_limite`, `fecha_devolucion`, `estado`, `motivo_rechazo`, fechas | `codigo` público de consulta; bibliotecario nulo hasta la revisión; una solicitud pendiente mantiene cantidades apartadas. |
| `prestamo_detalles` | `id`, `prestamo_id`, `libro_id`, `cantidad_solicitada`, `cantidad_devuelta`, `fecha_ultima_devolucion` | Pendiente = solicitada − devuelta; no se eliminan líneas ya operadas. |
| `movimientos` | `id`, `tipo`, `fecha_hora`, `tipo_actor`, `cliente_id`, `cuenta_personal_id`, `actor_nombre`, `libro_id`, `prestamo_id`, `detalle` | Historial funcional inmutable. Tipo: préstamo, devolución, ingreso de libro, edición de libro o rechazo de solicitud. El actor puede ser cliente, bibliotecario o administrador. |

### 7.2 Relaciones

```text
libros ──< libro_autores >── autores
libros ──< archivos_digitales
clientes ──< prestamos >── cuentas_personal
prestamos ──< prestamo_detalles >── libros
clientes / cuentas_personal ──< movimientos >── libros / prestamos
```

### 7.3 Estados del préstamo

| Estado | Significado | Modifica disponibilidad | Transiciones permitidas |
|---|---|:---:|---|
| `pendiente` | Solicitud pública a la espera de revisión; sus unidades están apartadas por orden de llegada. | Sí | `activo`, `rechazado` |
| `activo` | Aprobado y entregado físicamente. | Sí | `atrasado`, `devuelto` |
| `atrasado` | Tiene unidades pendientes después de la fecha límite. | Sí | `devuelto` |
| `devuelto` | Todas las unidades fueron recibidas. | No | Ninguna |
| `rechazado` | Solicitud no aceptada, de forma manual o automática por falta de disponibilidad. | No | Ninguna |

El estado `aprobado` mencionado en el levantamiento queda registrado mediante `fecha_aprobacion`, `bibliotecario_id` y el Movimiento de préstamo. En V1 la interfaz une aprobación y entrega en una sola acción atómica, por lo que no deja préstamos reservados sin entregar. Las cantidades de una solicitud pendiente ya estaban apartadas exclusivamente para respetar el orden de llegada; esto no constituye un módulo de reservas ni una lista de espera.

### 7.4 Catálogos controlados

- **Tipo de material inicial:** libro, revista, folleto, tesis, otro.
- **Género inicial:** lírico, poesía, narrativa, ensayo, otro.
- Cuando se selecciona `otro`, el administrador registra el valor descriptivo correspondiente.
- Estos valores estarán centralizados para poder ampliarlos sin alterar préstamos históricos.

## 8. Pantallas y experiencia de usuario

### 8.1 Zona pública

| Ruta propuesta | Pantalla | Contenido y acciones |
|---|---|---|
| `/` | Catálogo | Buscador, filtros, tarjetas, paginación y acceso a solicitud. |
| `/libros/:codigo` | Ficha del libro | Portada opcional, datos, autores, existencias, disponibilidad digital y acciones de leer o solicitar. |
| `/solicitud` | Solicitud de préstamo | Resumen de libros/cantidades y formulario de identificación/contacto. |
| `/solicitud/confirmacion/:codigo` | Confirmación | Código de solicitud y resumen; no requiere cuenta. |
| `/libros/:codigo/leer` | Visor digital | Lectura embebida, navegación por páginas y cierre para volver a la ficha. |
| `/personal/login` | Inicio de sesión | Acceso solo para bibliotecario y administrador. |

### 8.2 Panel de personal

| Módulo | Bibliotecario | Administrador | Función |
|---|:---:|:---:|---|
| Inicio | Sí | Sí | Indicadores operativos: solicitudes pendientes, préstamos activos y atrasados. No sustituye reportes. |
| Solicitudes | Sí | Sí | Filtrar, ver detalle, aprobar y entregar o rechazar. |
| Préstamos | Sí | Sí | Buscar, consultar vencimientos y registrar devoluciones parciales o totales. |
| Catálogo | Consulta | Gestión total | Existencias, ficha, alta, edición y estado de libros. |
| Autores | Consulta | Gestión total | Crear, editar y asociar autores. |
| Digitales | Consulta de estado | Gestión total | Cargar, reemplazar, activar o desactivar archivo digital. |
| Clientes | Consulta | Consulta | Historial de préstamos por identificación. No hay edición manual independiente en V1. |
| Personal | — | Gestión total | Crear, editar, activar/desactivar bibliotecarios y administrar cuentas. |
| Movimientos | — | Completa | Historial filtrable por fecha, tipo, libro, préstamo y actor. |
| Perfil / salir | Sí | Sí | Datos básicos y cierre de sesión. |

### 8.3 Sistema visual de referencia

Se reutilizarán los patrones de `Rehabilitacion_Gad`:

- Barra lateral fija, colapsable en escritorio y modal/deslizable en móvil.
- Barra superior con nombre de la institución, usuario y salida.
- Fondo crema, superficie blanca, tarjetas redondeadas y sombras suaves.
- Misma identidad institucional del Municipio de Jipijapa: se reutiliza el archivo de logotipo de Rehabilitación GAD, junto con su paleta turquesa, coral y ámbar.
- Tipografías Nunito para lectura y Poppins para títulos; Bootstrap 5 y Font Awesome para estructura e iconos.
- Tablas con filtros, mensajes de estado claros, formularios accesibles y diseño responsive desde móvil.

## 9. Arquitectura técnica acordada

```text
Navegador
  └─ React 18 + Vite + React Router + Bootstrap 5
       └─ Axios con API REST
            └─ Node.js 20 + Express
                 ├─ autenticación JWT y control de rol
                 ├─ reglas de préstamo y Movimientos
                 ├─ visor/stream seguro de documentos
                 └─ PostgreSQL (Supabase)
```

### 9.1 Frontend

- React 18 con JavaScript/JSX y Vite.
- React Router para rutas públicas, panel protegido y redirección por permiso.
- Axios para la API y manejo centralizado de errores de sesión.
- Bootstrap 5, CSS propio centralizado, Font Awesome, SweetAlert2 para confirmaciones.
- PDF.js o visor basado en páginas para el contenido digital; no usar un enlace de descarga expuesto.

### 9.2 Backend

- Node.js 20 y Express con módulos ECMAScript.
- PostgreSQL por `pg`; Supabase se usa como proveedor administrado de PostgreSQL, no se accede directamente desde el navegador.
- JWT de vida limitada para personal autenticado, contraseñas con `bcryptjs` y middleware de permisos.
- Multer para recepción de archivos y PDFKit/ExcelJS disponibles si se aprueban documentos o exportaciones en una fase posterior.
- API REST versionable bajo `/api`.

### 9.3 Almacenamiento y despliegue

- Desarrollo: cliente en `localhost:5173`, API en `localhost:4000`, PostgreSQL local o Supabase.
- Producción inicial: cliente en Vercel, API en Render, base PostgreSQL en Supabase.
- Los archivos digitales **no** se guardarán permanentemente en el disco efímero de Render. Para producción se usará Supabase Storage o almacenamiento compatible persistente, con rutas privadas y acceso a través de la API.
- No se implementará un mecanismo de respaldo adicional dentro de la aplicación. La base de datos en la nube gestiona sus propios respaldos; antes de producción se verificará la política vigente del proveedor.

## 10. Contrato de API inicial

Las respuestas usan JSON con `ok`, `message` cuando corresponda y datos en la clave del recurso. Todas las rutas de administración validan token, rol y estado de cuenta en el servidor.

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/api/catalogo` | Público | Buscar, filtrar y paginar libros con disponibilidad calculada. |
| `GET` | `/api/catalogo/:codigo` | Público | Ficha completa de un libro. |
| `GET` | `/api/catalogo/:codigo/visor` | Público condicionado | Entregar contenido apto para el visor si existe archivo digital activo. |
| `POST` | `/api/solicitudes` | Público | Crear solicitud de préstamo. |
| `GET` | `/api/solicitudes/:codigo/consulta` | Público | Consultar estado básico mediante código e identificación. |
| `POST` | `/api/auth/login` | Público | Login de personal. |
| `GET` | `/api/auth/me` | Personal | Validar y recuperar sesión. |
| `GET` | `/api/solicitudes` | Bibliotecario/Admin | Bandeja y filtros de solicitudes. |
| `POST` | `/api/solicitudes/:id/aprobar-entregar` | Bibliotecario/Admin | Definir fecha límite, verificar stock y activar préstamo. |
| `POST` | `/api/solicitudes/:id/rechazar` | Bibliotecario/Admin | Rechazar una solicitud pendiente. |
| `GET` | `/api/prestamos` | Bibliotecario/Admin | Listar préstamos activos, atrasados e historial. |
| `GET` | `/api/prestamos/:id` | Bibliotecario/Admin | Detalle e historial de devolución. |
| `POST` | `/api/prestamos/:id/devoluciones` | Bibliotecario/Admin | Registrar devolución por líneas y cantidades. |
| `GET` | `/api/admin/libros` | Admin | Catálogo administrativo. |
| `POST/PATCH` | `/api/admin/libros[/:id]` | Admin | Crear o editar libro. |
| `POST` | `/api/admin/libros/:id/digital` | Admin | Cargar o reemplazar archivo digital. |
| `GET/POST/PATCH` | `/api/admin/autores[/:id]` | Admin | Gestionar autores. |
| `GET/POST/PATCH` | `/api/admin/personal[/:id]` | Admin | Gestionar cuentas del personal. |
| `GET` | `/api/movimientos` | Admin | Consultar historial de movimientos filtrado. |

### 10.1 Errores esperados

| Código | Uso |
|---|---|
| `400` | Datos mal formados. |
| `401` | Sesión ausente, inválida o expirada. |
| `403` | Rol insuficiente o cuenta inactiva. |
| `404` | Recurso inexistente o archivo no disponible. |
| `409` | Conflicto de negocio: stock insuficiente, préstamo ya procesado, código o identificación duplicada. |
| `422` | Datos válidos en forma pero incumplen una regla de negocio. |
| `500` | Error no controlado; no expone detalles internos. |

## 11. Seguridad, privacidad y validaciones

- Usar HTTPS en producción y variables de entorno para secretos, URLs y credenciales.
- Contraseñas protegidas con bcrypt; jamás se devuelven en la API ni se escriben en Movimientos.
- JWT con secreto obligatorio en producción, vencimiento configurable y limpieza de sesión en el cliente si expira.
- Autorización aplicada tanto en rutas de interfaz como en cada endpoint protegido.
- Consultas SQL parametrizadas y validación estricta de identificadores, fechas, cantidades, archivos y estados.
- Archivos digitales permitidos inicialmente: PDF. No se define un límite de tamaño a nivel de aplicación en esta versión; aplican únicamente las restricciones técnicas del proveedor de almacenamiento y despliegue.
- Los archivos se almacenan con nombre interno aleatorio, tipo MIME validado y ruta no navegable directamente.
- El visor utiliza endpoint controlado; se envían cabeceras `Content-Disposition: inline` y se evita toda opción de descarga creada por la aplicación.
- La información de clientes se limita a identificación, nombre y contacto necesarios para la operación. No se muestran datos personales completos en el catálogo ni a terceros.
- La entidad Movimiento registra obligatoriamente préstamos, devoluciones, ingresos/ediciones de libros y rechazos. Podrá complementarse con trazas técnicas de inicio de sesión sin reemplazar ese historial funcional.
- Solo el administrador puede establecer una nueva contraseña para una cuenta de bibliotecario. No habrá opción de recuperación por correo, enlace de autogestión ni cambio de contraseña desde el perfil del bibliotecario.
- La zona pública aplica límites razonables de solicitud para reducir abuso de formularios; no se introduce CAPTCHA en V1 salvo que la operación lo requiera.

## 12. Requisitos no funcionales

| Área | Criterio |
|---|---|
| Idioma y zona horaria | Interfaz y validaciones en español; fechas operativas en `America/Guayaquil`. |
| Compatibilidad | Últimas dos versiones de Chrome, Edge, Firefox y Safari; diseño adaptable desde 360 px. |
| Rendimiento | Catálogo paginado en servidor; búsquedas indexadas; no cargar archivos digitales en listados. |
| Consistencia | Aprobación/entrega y devolución se ejecutan en transacciones de base de datos. |
| Accesibilidad | Etiquetas de formulario, foco visible, contraste suficiente, navegación básica por teclado y mensajes de error asociados al campo. |
| Disponibilidad | La aplicación informa de forma clara errores de conexión o mantenimiento, sin perder datos de formularios en curso cuando sea posible. |
| Mantenibilidad | Separar componentes, páginas, rutas, reglas de negocio y migraciones; no duplicar reglas entre cliente y servidor. |
| Pruebas | Pruebas unitarias de cálculos/reglas y pruebas de API para permisos, stock, vencimiento y devoluciones. |

## 13. Datos iniciales y migración

1. Cargar los libros existentes respetando exactamente su ID Libro como texto libre hasta confirmar el formato físico definitivo.
2. Importar la imagen de portada cuando exista y esté autorizada; la ausencia de portada no impide cargar el libro.
3. Consolidar autores duplicados antes o durante la importación y asociarlos mediante `libro_autores`.
4. Ingresar cantidad total real por cada libro; la disponibilidad inicial será igual al total si no se importan préstamos vigentes.
5. Crear una cuenta administradora inicial y entregar de forma segura sus credenciales; solo esta cuenta podrá restablecer contraseñas de bibliotecarios.
6. Si existen préstamos físicos al momento de salida, importarlos como `activo` con sus fechas y cantidades pendientes para preservar disponibilidad y bloqueos.
7. Cargar archivos digitales únicamente cuando se confirme la titularidad y autorización de publicación de cada obra.

## 14. Plan de implementación

| Fase | Entregable | Resultado verificable |
|---|---|---|
| 0. Base | Repositorio, variables de entorno, esquema, migraciones y diseño base municipal. | Aplicación inicia, conecta a BD y muestra shell responsive. |
| 1. Catálogo | Libros, autores, portada opcional, búsqueda pública por título/autor/género/tipo, ficha y disponibilidad calculada. | Público encuentra obras, ve portada cuando existe y consulta stock real. |
| 2. Solicitudes | Carrito de préstamo, cliente sin cuenta, registro atómico por orden de llegada y bandeja de personal. | La primera solicitud válida aparta stock; una posterior sin disponibilidad queda rechazada automáticamente. |
| 3. Circulación | Aprobación/entrega, vencimientos, bloqueo y devoluciones parciales/totales. | Stock no se sobreasigna y se libera correctamente al devolver. |
| 4. Administración | CRUD de catálogo/autores, personal, archivos digitales, restablecimiento de contraseña y Movimientos. | Solo administrador modifica recursos administrativos y queda historial funcional. |
| 5. Lectura y cierre | Visor digital, endurecimiento de seguridad, pruebas, datos iniciales y despliegue. | Lectura integrada, pruebas críticas aprobadas y ambiente productivo operativo. |

## 15. Criterios de aceptación del MVP

1. Una persona sin iniciar sesión puede navegar el catálogo y encontrar un libro por título, autor, género o tipo de material; ve portada cuando existe y su disponibilidad real.
2. Un libro con varios autores los muestra y conserva todas sus asociaciones.
3. Una persona puede solicitar varios libros y varias unidades de un mismo libro sin crear una cuenta.
4. La solicitud falla si supera disponibilidad, carece de contacto o el cliente tiene préstamo activo/atrasado.
5. Un bibliotecario puede aprobar y entregar una solicitud indicando una fecha límite; las cantidades pasan a no estar disponibles.
6. Dos operaciones concurrentes no pueden dejar disponibilidad negativa: la primera solicitud válida por el último ejemplar lo aparta y las posteriores sin stock quedan rechazadas automáticamente.
7. Un préstamo pasa a atrasado al superar su fecha límite y el cliente queda bloqueado, sin multas.
8. Una devolución parcial libera solo las unidades efectivamente recibidas; una devolución total cierra el préstamo.
9. Solo un administrador puede crear/editar libros, cargar digital, gestionar cuentas y restablecer la contraseña de un bibliotecario.
10. Un archivo digital activo se lee desde el visor sin que la aplicación ofrezca descarga directa.
11. Préstamos, devoluciones, ingresos/ediciones de libros y rechazos aparecen en Movimientos con actor, fecha/hora, referencias y detalle opcional.
12. La interfaz funciona en escritorio y móvil, conserva la identidad visual acordada y no muestra módulos clínicos de la aplicación de referencia.

## 16. Decisiones pendientes antes de producción

Estas decisiones no bloquean la construcción de la base, pero deben confirmarse antes de publicar el sistema:

| Tema | Propuesta inicial | Decisión pendiente |
|---|---|---|
| Identidad visual | Se reutiliza el logo y línea visual de Rehabilitación GAD, por ser del mismo Municipio de Jipijapa. | No pendiente para iniciar. |
| Archivos digitales | PDF sin límite de tamaño definido por la aplicación y un archivo activo por libro. | Confirmar formatos adicionales y autorización de obras. |
| Almacenamiento | Supabase Storage privado servido por API; respaldos de base de datos gestionados por el proveedor en la nube. | Confirmar cuenta/proyecto y política vigente del proveedor. |
| Contacto | Teléfono y/o correo obligatorio. | Definir formato preferido de teléfono y si se requerirá ambos. |
| Identificación | Campo de texto único, sin asumir un tipo documental específico. | Confirmar si solo se aceptará cédula ecuatoriana u otros documentos. |
| Reportes | Solo Movimientos y panel operativo en V1. | Definir indicadores y exportaciones para una fase posterior. |
| Notificaciones | No hay notificaciones externas en V1. | Confirmar necesidad de correo, WhatsApp o recordatorios. |

---

Este documento define el contrato funcional de la primera versión. Cualquier cambio de alcance deberá actualizar esta especificación y sus criterios de aceptación antes de implementarse.
