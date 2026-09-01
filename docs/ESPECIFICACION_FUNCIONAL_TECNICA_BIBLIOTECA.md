# Especificación funcional y técnica — Sistema de Gestión de Biblioteca Municipal

**Versión:** 1.5

**Fecha:** 1 de septiembre de 2026

**Estado:** Implementado y validado localmente
**Documento fuente:** [Requerimientos de la Biblioteca Municipal](./Requerimientos_Biblioteca_Municipal.md)

---

## 1. Propósito

Construir un sistema web para administrar el catálogo físico y digital de la Biblioteca Municipal, las cuentas de clientes, las solicitudes y préstamos físicos, las devoluciones y las cuentas del personal.

El sistema conservará la línea visual y la arquitectura de referencia de **Rehabilitación GAD**: una aplicación React/Vite con API Express, PostgreSQL y control de acceso por roles. La identidad visible se adaptará a la Biblioteca Municipal (nombre, logotipo, textos e iconografía), sin reutilizar contenido clínico ni datos de aquel sistema.

## 2. Alcance de la versión 1

### 2.1 Incluido

- Catálogo público, búsqueda, filtros, ficha de obra, portada opcional y disponibilidad física calculada.
- Consulta pública de material digital mediante visor integrado, sin botón ni enlace de descarga.
- Registro, activación, inicio de sesión, perfil e historial propio para clientes.
- Solicitud de préstamo físico exclusiva para una cuenta Cliente autenticada.
- Autenticación separada para clientes y para bibliotecarios/administradores.
- Revisión completa y mixta por material: aprobar, reducir cantidades o rechazar líneas; entrega y devolución de préstamos.
- Expiración automática de retiros, corrección auditada e incidencias por daño, reparación, extravío o baja.
- Bloqueo de nuevas solicitudes de un cliente que tenga material sin devolver vencido o activo.
- Gestión administrativa de libros, autores, archivos digitales y cuentas de bibliotecarios.
- Historial de movimientos de préstamos, devoluciones, ingresos, ediciones y rechazos.
- Exportación institucional de inventario, préstamos y movimientos en PDF y Excel.
- Diseño responsive basado en el panel de referencia.

### 2.2 Fuera de alcance

- Recuperación automática de contraseña por correo, SMS o WhatsApp.
- Reservas de ejemplares no disponibles.
- Multas, sanciones, cobros o pagos por atraso.
- Integración con correo, WhatsApp, SMS, lectores de códigos de barras o servicios externos.
- Analítica avanzada, tableros históricos, gráficos ejecutivos o reportes distintos de inventario, préstamos y movimientos.
- Gestión de varias sucursales, ubicaciones físicas, ejemplares individualizados o inventario por estantería.
- Reservas o lista de espera de libros no disponibles. La prioridad por orden de llegada de una solicitud es una preasignación interna del flujo de préstamo, no un módulo de reservas.

## 3. Glosario y principios

| Término | Definición |
|---|---|
| Cliente | Persona con identidad bibliotecaria; requiere una cuenta autenticada únicamente para solicitar préstamos físicos y consultar su actividad. |
| Visitante | Persona sin sesión que puede consultar catálogo, fichas y lectura digital, además de preparar una selección. |
| Personal | Cuenta autenticada con rol `bibliotecario` o `administrador`. |
| Libro | Registro bibliográfico y de existencias de una obra o material. Incluye libros, revistas, folletos, tesis u otros tipos. |
| Ejemplar | Una unidad física disponible de un libro. En V1 se administra por cantidad, no por código individual. |
| Solicitud | Pedido público con una o más líneas de material. Cada línea pendiente aparta cantidades para respetar el orden de llegada y luego se decide de forma independiente. |
| Préstamo activo | Material entregado físicamente al cliente y aún no devuelto por completo. |
| Atraso | Estado de un préstamo con material pendiente cuya fecha límite ya pasó. No genera multa. |
| Movimiento | Registro funcional e inmutable de una acción relevante: préstamo, devolución, ingreso o edición de libro, o rechazo de solicitud. |
| Visor digital | Experiencia de lectura integrada en la aplicación; no se presenta una opción de descarga directa. |

Principios de negocio:

1. La disponibilidad nunca se edita manualmente: se calcula a partir de existencias totales menos cantidades aprobadas pendientes de devolver y cantidades pendientes de revisión o listas para retiro.
2. Las decisiones críticas de inventario y permisos se validan en la API, no solo en la interfaz.
3. El identificador físico existente de cada libro se conserva como ID Libro, no se reemplaza ni regenera y se mantiene como texto hasta confirmar su formato.
4. Cada cambio relevante deja rastro de quién lo realizó, cuándo y sobre qué registro mediante la entidad Movimiento.

## 4. Roles y permisos

| Capacidades | Visitante | Cliente autenticado | Bibliotecario | Administrador |
|---|:---:|:---:|:---:|:---:|
| Consultar catálogo, ficha y disponibilidad | Sí | Sí | Sí | Sí |
| Usar visor digital | Sí | Sí | Sí | Sí |
| Enviar solicitud física | — | Sí | — | — |
| Consultar actividad propia | — | Sí | — | — |
| Revisar solicitudes de todas las cuentas internas | — | — | Sí | Sí |
| Aprobar, reducir, rechazar, entregar o devolver por material | — | — | Sí | Sí |
| Consultar historial completo de préstamos | — | — | Sí | Sí |
| Registrar préstamo directo presencial | — | — | Sí | Sí |
| Gestionar contraseñas de clientes | — | — | Sí | Sí |
| Exportar inventario y préstamos en PDF/Excel | — | — | Sí | Sí |
| Crear o editar libros y autores | — | — | — | Sí |
| Cargar o reemplazar archivo digital | — | — | — | Sí |
| Consultar/exportar movimientos completos | — | — | — | Sí |

Notas:

- Las sesiones de Cliente y Personal usan claves locales y tokens diferenciados por `type`; una nunca autoriza rutas de la otra.
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
3. El visor ofrece zoom entre 50 % y 200 %, navegación con botones, teclado y gesto horizontal.
4. En pantallas amplias puede alternarse entre página individual y libro abierto: la portada aparece sola y las páginas interiores se agrupan 2–3, 4–5 y sucesivamente.
5. El cambio de página usa una transición breve tipo hoja; `prefers-reduced-motion` la desactiva. En móvil se prioriza una página por vez para conservar legibilidad y rendimiento.
6. El visor no ofrece un control de descarga ni enlaza al archivo original.
7. Si no existe archivo digital o está inactivo, la acción no se muestra.

> Restricción conocida: ningún visor web puede impedir de forma absoluta que una persona capture contenido mostrado en su navegador. El requisito se implementa como ausencia de descarga directa, URLs no expuestas en la interfaz, autorización del endpoint de visualización y entrega optimizada para lectura; no como un mecanismo DRM.

### 5.3 Registro, autenticación y solicitud de préstamo

1. La persona puede agregar uno o varios libros físicos antes de autenticarse; la selección se conserva en el navegador.
2. Para enviar debe registrarse o iniciar sesión con cédula y contraseña. Un cliente histórico activa su cuenta mediante contacto y código previo o con asistencia del personal.
3. La pantalla muestra nombre, cédula y contacto de la sesión, sin permitir cambiar el propietario de la solicitud.
4. La API obtiene `cliente_id` exclusivamente del token validado, verifica que no existan préstamos listos para retirar, activos o atrasados y, dentro de una transacción, comprueba las existencias no comprometidas.
5. No existe un máximo funcional de títulos por solicitud. El Cliente agrega cada libro una sola vez y define una cantidad positiva; los límites de tamaño HTTP son únicamente defensas técnicas contra abuso.
6. La primera línea válida que llega por una cantidad disponible queda pendiente y aparta esas unidades. El orden lo determina el registro exitoso de la transacción y su fecha/hora.
7. Si una línea no tiene unidades suficientes o el material ya no está activo, esa línea se registra como rechazada automáticamente, sin apartar existencias; las demás líneas disponibles continúan en estado pendiente. Solo si ninguna línea puede continuar, el préstamo completo queda `rechazado`. No hay lista de espera.
8. La pantalla muestra un código y la solicitud aparece inmediatamente en **Mi cuenta**, con el estado de cada material. No se envía notificación externa en V1.

Al recibir una solicitud pública, se registra un Movimiento de tipo `préstamo` con actor `cliente`; toda línea rechazada automáticamente genera además su propio Movimiento `rechazo_solicitud`. La decisión de cada línea y la entrega física generan Movimientos separados con el actor de personal correspondiente.

### 5.4 Revisión y entrega por bibliotecario

1. Bibliotecario y Administrador abren la misma bandeja global de solicitudes pendientes, sin filtro por la cuenta que registró o gestionó el préstamo.
2. Revisan datos del cliente, títulos, cantidades solicitadas, disponibilidad vigente e historial de préstamos abiertos.
3. En cada línea pendiente escogen una decisión: aprobar toda la cantidad, aprobar una cantidad menor o rechazarla. Para una reducción o rechazo pueden registrar una observación breve opcional, visible al Cliente en su historial.
4. La API exige una decisión para todas las líneas pendientes y la guarda de forma atómica. Una reducción libera inmediatamente la diferencia; un rechazo libera todas las unidades de esa línea y registra su Movimiento.
5. Si hay al menos una línea aprobada, el préstamo pasa a `listo_retiro`, conserva solo esas unidades apartadas y registra quién efectuó la revisión. Si todas se rechazan, el préstamo pasa a `rechazado`.
6. La cuenta del Cliente muestra un aviso interno destacado con el código y únicamente los materiales/cantidades aprobados. El historial siempre conserva y explica las líneas rechazadas. No se crea correo, WhatsApp, SMS ni otra notificación externa.
7. Cuando el cliente se presenta, el bibliotecario abre **Préstamos**, usa **Registrar entrega**, define la fecha límite y confirma la entrega física. Solo las líneas aprobadas pasan a `activo`.
8. Cada decisión, transición de entrega y devolución se ejecuta en una transacción y genera su Movimiento correspondiente.
9. La aprobación vence después de `PICKUP_EXPIRY_DAYS` (5 días por defecto). El proceso horario cambia el estado a `expirado`, libera las unidades y registra un Movimiento del sistema.
10. Antes de la entrega, Personal puede corregir una revisión con motivo obligatorio. La API vuelve a comprobar stock, préstamo abierto y todas las líneas; una corrección exitosa reinicia el plazo de retiro.

### 5.5 Devolución

1. El bibliotecario localiza un préstamo por código, identificación o cliente.
2. Registra las cantidades devueltas por cada línea aprobada del préstamo. Puede devolverse una parte o todo el material aprobado.
3. La API impide devolver más unidades de las que siguen pendientes.
4. Al devolver parcialmente, las unidades devueltas vuelven a estar disponibles y el préstamo sigue `activo` o `atrasado` si aún vence.
5. Cuando todas las líneas están devueltas, se registra la fecha real de devolución y el préstamo queda `devuelto`.

### 5.5.1 Incidencias físicas

1. Sobre un préstamo activo o atrasado, Personal selecciona material, cantidad y situación: dañado, reparación o extraviado.
2. Dañado/reparación cuenta como recibido, pero aumenta `cantidad_no_disponible`; no vuelve al catálogo hasta resolverse.
3. Extravío no cuenta como devolución y mantiene el préstamo abierto. Al recuperarse, se recibe; al darse de baja, se resuelve la línea y se reduce el inventario total.
4. Una incidencia de daño/reparación se resuelve reintegrando el ejemplar o dándolo de baja. Cada acción deja actor, fecha y Movimiento.

### 5.5.1 Préstamo directo presencial

1. El bibliotecario abre **Préstamos** y selecciona **Nuevo préstamo**.
2. Ingresa cédula ecuatoriana, nombre sin números, al menos un contacto, fecha límite y uno o varios materiales disponibles.
3. La API bloquea los libros en orden estable, comprueba existencias y verifica que el cliente no tenga otro préstamo listo para retirar, activo o atrasado.
4. En una sola transacción se crea el préstamo `activo`, se registran aprobación y entrega con el personal autenticado y se genera su Movimiento.
5. Si falta disponibilidad o el cliente está bloqueado, no se crea un préstamo parcial y la interfaz explica el motivo.

### 5.6 Vencimientos y bloqueo

- Un préstamo con unidades pendientes pasa a `atrasado` cuando la fecha local de la biblioteca supera su fecha límite.
- El estado se recalcula al consultar préstamos y mediante una tarea programada diaria; así no depende de que un usuario abra una página.
- No se aplican multas ni sanciones.
- Mientras el cliente tenga un préstamo `listo_retiro`, `activo` o `atrasado`, la API rechaza nuevas solicitudes. Las solicitudes pendientes previas pueden seguir siendo revisadas, pero no deben aprobarse si en ese momento ya existe otro préstamo abierto.

### 5.7 Exportación de reportes

1. En Catálogo y Préstamos, el bibliotecario o administrador selecciona PDF o Excel; en Movimientos la acción aparece únicamente al administrador.
2. El reporte respeta el texto, estado o tipo filtrado en el módulo desde el que se genera.
3. La API vuelve a consultar los datos con SQL parametrizado y autorización del servidor; el navegador no construye ni altera el contenido institucional.
4. PDF y Excel incluyen logotipo municipal, nombre de la institución, título, fecha/hora local de emisión, responsable autenticado, criterio aplicado y total de registros.
5. Los PDF usan página A4 horizontal, encabezado repetible, tabla legible y numeración. Los Excel incluyen encabezado municipal, filtros, filas inmovilizadas, anchos definidos y configuración de impresión horizontal.
6. Si el resultado supera 5.000 registros, la API responde `413 REPORT_TOO_LARGE` y solicita aplicar un filtro. No se entrega un reporte truncado silenciosamente.
7. La descarga usa `Cache-Control: private, no-store` y nunca contiene contraseñas ni secretos de infraestructura.

## 6. Reglas de negocio verificables

| ID | Regla |
|---|---|
| RN-01 | El ID Libro se almacena temporalmente como texto libre, es único y obligatorio. Su formato definitivo se confirma con el personal de la biblioteca antes de fijar restricciones adicionales. |
| RN-02 | Un libro puede tener uno o varios autores; un autor puede estar asociado a varios libros. |
| RN-03 | `cantidad_disponible = cantidad_total − cantidades aprobadas pendientes de devolver − cantidades pendientes de revisión o listas para retiro`. Nunca admite valores negativos. |
| RN-04 | Una solicitud debe contener al menos una línea de libro y cada cantidad debe ser un entero positivo. No tiene un límite funcional de títulos; un libro solo aparece una vez por solicitud. |
| RN-05 | Si una línea supera la disponibilidad al instante de registrarla, únicamente esa línea queda automáticamente rechazada. El préstamo completo queda `rechazado` solo si ninguna línea conserva disponibilidad. |
| RN-06 | El registro de la solicitud bloquea las filas de libros afectadas dentro de una transacción. Así, la primera línea válida por el último ejemplar aparta la unidad y las posteriores no pueden sobreasignarla. |
| RN-07 | Un cliente con préstamo `listo_retiro`, `activo` o `atrasado` no puede crear ni recibir la aprobación de un nuevo préstamo. |
| RN-08 | El plazo de devolución es obligatorio, se establece por préstamo al entregarlo y debe ser igual o posterior a la fecha de entrega. |
| RN-09 | Los préstamos vencidos no generan multa; solamente conservan el bloqueo definido en RN-07. |
| RN-10 | Un rechazo libera las unidades de su línea; una aprobación reducida libera la diferencia. Una devolución parcial libera únicamente las unidades aprobadas y recibidas. |
| RN-11 | La fecha real de devolución se completa solo cuando todas las líneas aprobadas del préstamo fueron devueltas. |
| RN-12 | Solo un administrador puede modificar catálogo, archivos digitales o cuentas del personal. |
| RN-13 | La lectura digital es pública cuando el libro está marcado como digital y tiene un archivo activo; el archivo no se ofrece como descarga. |
| RN-14 | Decidir cada línea de una solicitud (aprobar, reducir o rechazar), registrar la entrega, registrar una devolución, ingresar un libro y editarlo generan obligatoriamente un Movimiento con actor, fecha/hora, referencias y detalle opcional. |
| RN-15 | Al registrar o identificar un Cliente, la cédula contiene exactamente 10 dígitos; el nombre no admite números; y el teléfono, cuando se proporciona, debe ser un celular ecuatoriano `09` de 10 dígitos o un fijo nacional de 9 dígitos. |
| RN-16 | Inventario y préstamos pueden exportarse por ambos roles internos; Movimientos solo por Administrador. Los documentos respetan filtros, registran responsable y no modifican datos. |
| RN-17 | La API determina el propietario de una solicitud desde la sesión Cliente, nunca desde una cédula enviada en el formulario. |
| RN-18 | El Cliente solo consulta su actividad; cambiar o restablecer contraseña invalida tokens anteriores mediante `version_sesion`. |
| RN-19 | Bibliotecario y Administrador pueden consultar y exportar el historial completo de préstamos y solicitudes, independientemente de la cuenta de personal que los creó, revisó, entregó o devolvió. |
| RN-20 | La cédula Cliente debe superar el algoritmo ecuatoriano de provincia, tipo y dígito verificador; diez dígitos por sí solos no son suficientes. |
| RN-21 | Una aprobación no retirada expira después del plazo configurado, libera stock y no puede entregarse fuera de plazo. |
| RN-22 | Toda corrección de revisión exige motivo, ocurre antes de la entrega, decide todas las líneas y vuelve a validar stock de forma transaccional. |
| RN-23 | Dañados/reparación se descuentan como fuera de circulación; extraviados permanecen pendientes hasta recuperación o baja. |
| RN-24 | Inactivar/reactivar una cuenta Cliente exige Personal autenticado, invalida sesiones y genera Movimiento; nunca borra el historial. |
| RN-25 | No puede desactivarse un libro comprometido ni reducirse su total por debajo de unidades comprometidas más unidades fuera de circulación. |

## 7. Modelo de información

Los identificadores técnicos pueden ser enteros autogenerados. El **ID Libro** es el identificador de negocio visible, preserva el valor que ya usa la biblioteca y se almacena como texto hasta confirmar su formato.

### 7.1 Tablas principales

| Entidad | Campos principales | Reglas / notas |
|---|---|---|
| `libros` | `id`, `id_libro_texto`, `tipo_material`, `genero`, `titulo`, `descripcion`, `anio_publicacion`, `cantidad_total`, `cantidad_no_disponible`, `portada_ruta`, `digital_disponible`, `activo`, fechas | Fuera de circulación nunca supera el total; portada opcional; disponibilidad calculada. |
| `autores` | `id`, `nombre_completo`, fechas | Nombre obligatorio; se normaliza para evitar duplicados accidentales. |
| `libro_autores` | `libro_id`, `autor_id`, `orden` | Relación muchos a muchos; pareja única. |
| `archivos_digitales` | `id`, `libro_id`, `nombre_original`, `ruta_segura`, `mime_type`, `tamano_bytes`, `estado`, fechas | En V1, un archivo activo por libro; conservar versiones inactivas para historial. |
| `clientes` | `id`, `identificacion`, `nombre_completo`, `telefono`, `correo`, fechas | No son cuentas. La identificación es una cédula ecuatoriana única de 10 dígitos. El nombre no admite números. Teléfono ecuatoriano o correo obligatorio. |
| `cuentas_clientes` | `id`, `cliente_id`, `password_hash`, `estado`, `motivo_inactivacion`, `inactivada_en`, `inactivada_por`, `debe_cambiar_password`, `intentos_fallidos`, `bloqueado_hasta`, `version_sesion`, `ultimo_acceso`, fechas | Inactivación auditada e invalidación de sesiones por versión. RLS activa y sin privilegios para Data API. |
| `cuentas_personal` | `id`, `nombre_completo`, `usuario`, `password_hash`, `rol`, `estado`, último acceso, fechas | Roles fijos: `bibliotecario`, `administrador`. Nunca se guarda contraseña en texto. |
| `prestamos` | `id`, `codigo`, `cliente_id`, `bibliotecario_id`, `fecha_solicitud`, `fecha_aprobacion`, `fecha_expiracion_retiro`, `fecha_entrega`, `fecha_limite`, `fecha_devolucion`, `estado`, `motivo_rechazo`, fechas | Una aprobación requiere fecha de expiración y mantiene cantidades apartadas solo hasta retiro o vencimiento. |
| `prestamo_detalles` | `id`, `prestamo_id`, `libro_id`, `cantidad_solicitada`, `cantidad_aprobada`, `motivo_rechazo`, `cantidad_devuelta`, `fecha_ultima_devolucion` | `cantidad_aprobada`: nula al pendiente, `0` al rechazo, positiva al aprobar total o parcialmente; nunca supera la solicitada. Solo las unidades aprobadas pueden entregarse/devolverse; no se eliminan líneas ya operadas. |
| `movimientos` | `id`, `tipo`, `fecha_hora`, `tipo_actor`, `cliente_id`, `cuenta_personal_id`, `actor_nombre`, `libro_id`, `prestamo_id`, `detalle` | Historial funcional inmutable. Tipo: préstamo, devolución, ingreso de libro, edición de libro o rechazo de solicitud. El actor puede ser cliente, bibliotecario o administrador. |
| `incidencias_prestamo` | préstamo, detalle, libro, tipo, cantidad, comentario, estado, responsables y fechas de registro/resolución | Conserva daño, reparación o extravío y su resolución como reintegro, recuperación o baja. RLS activa y sin acceso directo desde Data API. |

### 7.2 Relaciones

```text
libros ──< libro_autores >── autores
libros ──< archivos_digitales
clientes ──< prestamos >── cuentas_personal
clientes ── 0..1 cuentas_clientes
prestamos ──< prestamo_detalles >── libros
prestamos / prestamo_detalles ──< incidencias_prestamo >── libros
clientes / cuentas_personal ──< movimientos >── libros / prestamos
```

### 7.3 Estados del préstamo

| Estado | Significado | Modifica disponibilidad | Transiciones permitidas |
|---|---|:---:|---|
| `pendiente` | Solicitud pública con al menos una línea a la espera de revisión; las líneas pendientes están apartadas por orden de llegada. | Sí | `listo_retiro`, `rechazado` |
| `listo_retiro` | Solicitud aprobada y notificada; aparta unidades hasta la fecha de expiración. | Sí | `activo`, `expirado` |
| `activo` | Aprobado y entregado físicamente. | Sí | `atrasado`, `devuelto` |
| `atrasado` | Tiene unidades pendientes después de la fecha límite. | Sí | `devuelto` |
| `devuelto` | Todas las unidades fueron recibidas. | No | Ninguna |
| `rechazado` | Solicitud no aceptada, de forma manual o automática por falta de disponibilidad. | No | Ninguna |
| `expirado` | Aprobación no retirada dentro del plazo; conserva historial y libera existencias. | No | Ninguna |

El estado funcional de cada línea se deriva de `cantidad_aprobada`: pendiente (nula), rechazada (cero) o aprobada (positiva). El estado global “aprobado” se implementa como `listo_retiro` cuando existe al menos una línea aprobada, acompañado por `fecha_aprobacion`, `bibliotecario_id` y Movimientos. La interfaz separa revisión y entrega para que el Cliente sepa exactamente qué puede retirar. Tanto `pendiente` como `listo_retiro` apartan solo las unidades aplicables; esto no constituye una lista de espera ni un módulo general de reservas.

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
| Inicio | Sí | Sí | Indicadores operativos: pendientes, listos para retirar, activos y atrasados. No sustituye reportes. |
| Solicitudes | Sí | Sí | Bandeja global; filtrar, ver detalle y decidir todas las líneas: aprobar, reducir o rechazar. |
| Préstamos | Sí | Sí | Historial completo compartido; buscar, registrar entrega de material aprobado, consultar vencimientos, registrar devoluciones y exportar PDF/Excel. |
| Préstamo directo | Sí | Sí | Registrar datos del cliente, seleccionar materiales disponibles y entregar en una operación. |
| Catálogo | Consulta | Gestión total | Existencias, ficha, alta, edición, estado y exportación de inventario. |
| Autores | Consulta | Gestión total | Crear, editar y asociar autores. |
| Digitales | Consulta de estado | Gestión total | Cargar, reemplazar, activar o desactivar archivo digital. |
| Clientes | Consulta | Consulta | Historial de préstamos por identificación. No hay edición manual independiente en V1. |
| Personal | — | Gestión total | Crear, editar, activar/desactivar bibliotecarios y administrar cuentas. |
| Movimientos | — | Completa | Historial filtrable y exportación PDF/Excel exclusiva del Administrador. |
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
                 ├─ generador institucional de reportes
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
- Multer para recepción de archivos, PDFKit para reportes PDF y write-excel-file para libros de trabajo XLSX.
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
| `POST` | `/api/clientes/auth/registro` | Público limitado | Crear Cliente y cuenta en una transacción. |
| `POST` | `/api/clientes/auth/activar` | Público limitado | Vincular cuenta con historial previo mediante comprobación segura. |
| `POST` | `/api/clientes/auth/login` | Público limitado | Iniciar sesión con cédula y contraseña. |
| `GET` | `/api/clientes/auth/me` | Cliente | Validar sesión de Cliente. |
| `POST` | `/api/clientes/auth/cambiar-password` | Cliente | Cambiar contraseña e invalidar tokens anteriores. |
| `GET/PATCH` | `/api/clientes/me` | Cliente | Consultar o actualizar el contacto propio. |
| `GET` | `/api/clientes/me/prestamos[/:id]` | Cliente propietario | Consultar exclusivamente actividad propia. |
| `POST` | `/api/clientes/me/solicitudes` | Cliente | Crear solicitud usando el `cliente_id` de la sesión. |
| `POST` | `/api/solicitudes` | Cliente | Alias protegido para crear una solicitud autenticada. |
| `GET` | `/api/solicitudes/:codigo/consulta` | Cliente propietario | Consultar estado del código propio. |
| `GET` | `/api/clientes` | Bibliotecario/Admin | Buscar clientes y estado de cuenta. |
| `POST` | `/api/clientes/:id/activar-cuenta` | Bibliotecario/Admin | Activar cuenta con contraseña temporal. |
| `POST` | `/api/clientes/:id/restablecer-password` | Bibliotecario/Admin | Restablecer e invalidar sesiones anteriores. |
| `PATCH` | `/api/clientes/:id/estado-cuenta` | Bibliotecario/Admin | Inactivar o reactivar una cuenta con motivo y trazabilidad. |
| `POST` | `/api/auth/login` | Público | Login de personal. |
| `GET` | `/api/auth/me` | Personal | Validar y recuperar sesión. |
| `GET` | `/api/prestamos` | Bibliotecario/Admin | Listar el historial completo de solicitudes y préstamos por cualquiera de sus estados, sin filtro por cuenta de personal. |
| `POST` | `/api/prestamos/directo` | Bibliotecario/Admin | Registrar y entregar un préstamo presencial en una transacción. |
| `POST` | `/api/prestamos/:id/revisar` | Bibliotecario/Admin | Decidir atómicamente cada línea pendiente: aprobar total/parcial o rechazar; deja lista para retiro si existe una línea aprobada. |
| `POST` | `/api/prestamos/:id/corregir-revision` | Bibliotecario/Admin | Corregir con motivo una revisión aún no entregada y volver a validar disponibilidad. |
| `POST` | `/api/prestamos/:id/entregar` | Bibliotecario/Admin | Registrar retiro, fecha límite y activar el préstamo. |
| `POST` | `/api/prestamos/:id/devoluciones` | Bibliotecario/Admin | Registrar devolución por líneas y cantidades. |
| `POST` | `/api/prestamos/:id/incidencias` | Bibliotecario/Admin | Registrar daño, reparación o extravío sobre unidades pendientes. |
| `POST` | `/api/prestamos/incidencias/:id/resolver` | Bibliotecario/Admin | Reintegrar, recuperar o dar de baja el ejemplar afectado. |
| `GET` | `/api/admin/libros` | Admin | Catálogo administrativo. |
| `POST/PATCH` | `/api/admin/libros[/:id]` | Admin | Crear o editar libro. |
| `POST` | `/api/admin/libros/:id/digital` | Admin | Cargar o reemplazar archivo digital. |
| `GET/POST/PATCH` | `/api/admin/autores[/:id]` | Admin | Gestionar autores. |
| `GET/POST/PATCH` | `/api/admin/personal[/:id]` | Admin | Gestionar cuentas del personal. |
| `GET` | `/api/movimientos` | Admin | Consultar historial de movimientos filtrado. |
| `GET` | `/api/reportes/inventario/:formato` | Bibliotecario/Admin | Descargar inventario filtrado; `formato` es `pdf` o `xlsx`. |
| `GET` | `/api/reportes/prestamos/:formato` | Bibliotecario/Admin | Descargar préstamos filtrados; `formato` es `pdf` o `xlsx`. |
| `GET` | `/api/reportes/movimientos/:formato` | Admin | Descargar movimientos filtrados; `formato` es `pdf` o `xlsx`. |

### 10.1 Errores esperados

| Código | Uso |
|---|---|
| `400` | Datos mal formados. |
| `401` | Sesión ausente, inválida o expirada. |
| `403` | Rol insuficiente o cuenta inactiva. |
| `404` | Recurso inexistente o archivo no disponible. |
| `409` | Conflicto de negocio: stock insuficiente, préstamo ya procesado, código o identificación duplicada. |
| `413` | El reporte supera 5.000 registros y requiere un filtro más específico. |
| `422` | Datos válidos en forma pero incumplen una regla de negocio. |
| `500` | Error no controlado; no expone detalles internos. |

## 11. Seguridad, privacidad y validaciones

- Usar HTTPS en producción y variables de entorno para secretos, URLs y credenciales.
- Contraseñas protegidas con bcrypt; jamás se devuelven en la API ni se escriben en Movimientos.
- JWT con secreto obligatorio en producción, vencimiento configurable y limpieza de sesión en el cliente si expira.
- Autorización aplicada tanto en rutas de interfaz como en cada endpoint protegido.
- Consultas SQL parametrizadas y validación estricta de identificadores, fechas, cantidades, archivos y estados.
- Archivos digitales permitidos inicialmente: PDF. No se define un límite de tamaño a nivel de aplicación en esta versión; aplican únicamente las restricciones técnicas del proveedor de almacenamiento y despliegue. La carga comprueba MIME y firma binaria `%PDF-`.
- Los accesos de Cliente y Personal tienen límites de frecuencia independientes; las respuestas no revelan si una cuenta existe.
- Los archivos se almacenan con nombre interno aleatorio, tipo MIME validado y ruta no navegable directamente.
- El visor utiliza endpoint controlado; se envían cabeceras `Content-Disposition: inline` y se evita toda opción de descarga creada por la aplicación.
- La información de clientes se limita a identificación, nombre y contacto necesarios para la operación. No se muestran datos personales completos en el catálogo ni a terceros.
- La entidad Movimiento registra obligatoriamente préstamos, devoluciones, ingresos/ediciones de libros y rechazos. Podrá complementarse con trazas técnicas de inicio de sesión sin reemplazar ese historial funcional.
- Solo el administrador puede establecer una nueva contraseña para una cuenta de bibliotecario. No habrá opción de recuperación por correo, enlace de autogestión ni cambio de contraseña desde el perfil del bibliotecario.
- La zona pública aplica límites de frecuencia y tamaño de petición para reducir abuso de formularios; no se introduce un límite funcional a la cantidad de títulos por solicitud ni CAPTCHA en V1 salvo que la operación lo requiera.

## 12. Requisitos no funcionales

| Área | Criterio |
|---|---|
| Idioma y zona horaria | Interfaz y validaciones en español; fechas operativas en `America/Guayaquil`. |
| Compatibilidad | Últimas dos versiones de Chrome, Edge, Firefox y Safari; diseño adaptable desde 360 px. |
| Rendimiento | Catálogo paginado en servidor; búsquedas indexadas; no cargar archivos digitales en listados. |
| Consistencia | Registro, revisión mixta, entrega y devolución se ejecutan en transacciones de base de datos. |
| Accesibilidad | Etiquetas de formulario, foco visible, contraste suficiente, navegación básica por teclado y mensajes de error asociados al campo. |
| Disponibilidad | La aplicación informa de forma clara errores de conexión o mantenimiento, sin perder datos de formularios en curso cuando sea posible. |
| Mantenibilidad | Separar componentes, páginas, rutas, reglas de negocio y migraciones; no duplicar reglas entre cliente y servidor. |
| Pruebas | Pruebas unitarias, integración HTTP y E2E con navegador para móvil, autenticación y descargas PDF/Excel. |

## 13. Datos iniciales y migración

1. Cargar los libros existentes respetando exactamente su ID Libro como texto libre hasta confirmar el formato físico definitivo.
2. Importar la imagen de portada cuando exista y esté autorizada; la ausencia de portada no impide cargar el libro.
3. Consolidar autores duplicados antes o durante la importación y asociarlos mediante `libro_autores`.
4. Ingresar cantidad total real por cada libro; la disponibilidad inicial será igual al total si no se importan préstamos vigentes.
5. Crear una cuenta administradora inicial y entregar de forma segura sus credenciales; solo esta cuenta podrá restablecer contraseñas de bibliotecarios.
6. Si existen préstamos físicos al momento de salida, importarlos como `activo` con sus fechas y cantidades pendientes para preservar disponibilidad y bloqueos.
7. Cargar archivos digitales únicamente cuando se confirme la titularidad y autorización de publicación de cada obra.

## 14. Estado de implementación

| Fase | Entregable | Resultado verificable |
|---|---|---|
| 0. Base | Repositorio, variables de entorno, esquema, migraciones y diseño base municipal. | Aplicación inicia, conecta a BD y muestra shell responsive. |
| 1. Catálogo | Libros, autores, portada opcional, búsqueda pública por título/autor/género/tipo, ficha y disponibilidad calculada. | Público encuentra obras, ve portada cuando existe y consulta stock real. |
| 2. Solicitudes | Selección sin límite funcional de títulos, cuenta Cliente, registro atómico por orden de llegada y bandeja global de personal. | Solo una sesión Cliente envía la solicitud; la primera línea válida aparta stock y una línea posterior sin disponibilidad queda rechazada sin afectar las demás. |
| 3. Circulación | Revisión mixta por línea, entrega, vencimientos, bloqueo y devoluciones parciales/totales. | Stock no se sobreasigna; las unidades reducidas/rechazadas y devueltas se liberan correctamente. |
| 4. Administración | CRUD de catálogo/autores, personal, archivos digitales, restablecimiento de contraseña y Movimientos. | Solo administrador modifica recursos administrativos y queda historial funcional. |
| 5. Lectura y cierre | Visor digital, reportes PDF/Excel, endurecimiento de seguridad, pruebas, datos iniciales y despliegue. | Lectura y exportaciones integradas, pruebas críticas aprobadas y ambiente listo para publicar. |

## 15. Criterios de aceptación del MVP

1. Una persona sin iniciar sesión puede navegar el catálogo y encontrar un libro por título, autor, género o tipo de material; ve portada cuando existe y su disponibilidad real.
2. Un libro con varios autores los muestra y conserva todas sus asociaciones.
3. Una persona puede preparar libros sin sesión, pero debe registrar o activar una cuenta para enviar la solicitud.
4. La solicitud utiliza el Cliente de la sesión y falla si tiene un préstamo listo para retirar, activo o atrasado. Puede incluir muchos títulos; si un material no tiene disponibilidad, se rechaza solo esa línea.
5. Bibliotecario o Administrador decide cada línea de una solicitud: puede aprobar toda o parte de la cantidad y rechazar otras. Si hay una aprobación, queda `listo_retiro`, el Cliente recibe un aviso interno solo con lo aprobado y al entregar se define la fecha límite y pasa a `activo`.
6. Dos operaciones concurrentes no pueden dejar disponibilidad negativa: la primera línea válida por el último ejemplar lo aparta y las posteriores sin stock se rechazan automáticamente sin afectar las líneas disponibles de la misma solicitud.
7. Un préstamo pasa a atrasado al superar su fecha límite y el cliente queda bloqueado, sin multas.
8. Una devolución parcial libera solo las unidades efectivamente recibidas; una devolución total cierra el préstamo.
9. Solo un administrador puede crear/editar libros, cargar digital, gestionar cuentas y restablecer la contraseña de un bibliotecario.
10. Un archivo digital activo se lee desde el visor sin que la aplicación ofrezca descarga directa.
11. Préstamos, devoluciones, ingresos/ediciones de libros y rechazos aparecen en Movimientos con actor, fecha/hora, referencias y detalle opcional.
12. La interfaz funciona en escritorio y móvil, conserva la identidad visual acordada y no muestra módulos clínicos de la aplicación de referencia.
13. Personal autenticado descarga inventario y préstamos en PDF/Excel; solo el Administrador descarga Movimientos. Los archivos muestran identidad municipal, responsable, filtros y total.
14. Los recorridos críticos de catálogo/solicitud móvil, cuenta Cliente, revisión mixta, login de personal y descargas se ejecutan mediante pruebas E2E repetibles.
15. El Cliente consulta solo su historial, actualiza su contacto y cambia contraseña; personal puede restablecerla sin ver ni registrar el secreto.
16. El rechazo no genera aviso; la aprobación sí genera únicamente un aviso interno en **Mi cuenta**, sin correo, WhatsApp ni SMS.
17. Administrador y cualquier Bibliotecario ven y exportan el mismo historial completo de préstamos; ninguna consulta se restringe a la cuenta interna que intervino en la operación.

## 16. Decisiones pendientes antes de producción

Estas decisiones no bloquean la construcción de la base, pero deben confirmarse antes de publicar el sistema:

| Tema | Propuesta inicial | Decisión pendiente |
|---|---|---|
| Identidad visual | Se reutiliza el logo y línea visual de Rehabilitación GAD, por ser del mismo Municipio de Jipijapa. | No pendiente para iniciar. |
| Archivos digitales | PDF sin límite de tamaño definido por la aplicación y un archivo activo por libro. | Confirmar formatos adicionales y autorización de obras. |
| Almacenamiento | Supabase Storage privado servido por API; respaldos de base de datos gestionados por el proveedor en la nube. | Confirmar cuenta/proyecto y política vigente del proveedor. |
| Contacto | Teléfono ecuatoriano y/o correo obligatorio. El teléfono, si se ingresa, es celular `09` de 10 dígitos o fijo nacional de 9 dígitos. | Confirmado para V1. |
| Identificación | Cédula ecuatoriana única de exactamente 10 dígitos numéricos. | Confirmado para V1. |
| Reportes | Inventario, préstamos y movimientos se exportan en PDF/Excel institucional. | Definir únicamente si se requieren indicadores o reportes adicionales. |
| Notificaciones | La aprobación muestra un aviso interno en **Mi cuenta** derivado de `listo_retiro`; no hay correo, WhatsApp ni SMS en V1. | Confirmar únicamente si una versión futura requiere canales externos o recordatorios. |

---

Este documento define el contrato funcional de la primera versión. Cualquier cambio de alcance deberá actualizar esta especificación y sus criterios de aceptación antes de implementarse.
