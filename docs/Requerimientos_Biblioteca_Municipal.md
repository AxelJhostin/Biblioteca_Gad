# Sistema de Gestión — Biblioteca Municipal
## Documento de Análisis de Requerimientos (versión 2.1)

---

## 1. Alcance y decisiones generales

- El catálogo, las fichas y la lectura digital son públicos. Únicamente la solicitud de préstamos físicos exige una cuenta Cliente autenticada.
- Sí se requiere autenticación (login) para los roles Bibliotecario y Administrador.
- El Cliente puede registrarse por sí mismo con cédula ecuatoriana y contraseña. Los datos de identidad se reutilizan desde su perfil al solicitar.
- Bibliotecarios y Administradores pueden activar cuentas para clientes existentes y restablecer contraseñas temporales; el Cliente deberá cambiarlas en su siguiente acceso.
- Los libros digitales son de acceso libre y sin restricciones, mediante un visor embebido dentro del sistema. No se permite la descarga directa del archivo.
- El plazo de devolución se define caso por caso cuando el bibliotecario registra la entrega física; aprobar una solicitud no inicia todavía el préstamo.
- No existen sanciones ni multas por atraso. Si un cliente tiene un préstamo vencido sin devolver, el sistema únicamente bloquea nuevos préstamos para esa persona hasta que devuelva lo pendiente.
- La gestión de reservas de libros físicos no disponibles queda fuera de alcance de esta versión.
- La biblioteca mantiene la misma identidad institucional del Municipio de Jipijapa que Rehabilitación GAD; se reutilizará el mismo archivo de logotipo como referencia visual.

---

## 2. Entidades de información

### 2.1 Libro

| Campo | Descripción |
|---|---|
| ID Libro | Identificador propio ya existente en la biblioteca física (se conserva, no se regenera). |
| Tipo de material | Categoría del ítem: libro, revista, folleto, tesis, etc. |
| Género | Clasificación literaria o temática: lírico, poesía, narrativa, ensayo, otros. |
| Título | Nombre de la obra. |
| Descripción | Sinopsis o resumen del contenido. |
| Año de publicación | Año en que fue publicada la obra. |
| Cantidad total | Número total de ejemplares físicos que posee la biblioteca. |
| Cantidad disponible | Ejemplares físicos libres en este momento (total − unidades aprobadas pendientes de devolución − unidades pendientes de revisión o listas para retiro). Se calcula, no se ingresa manualmente. |
| ¿Disponible en digital? | Indica si existe una versión digital visualizable del libro. |
| Archivo digital | Referencia al archivo (PDF u otro) mostrado en el visor embebido, si aplica. |
| Imagen de portada | Imagen opcional mostrada en el catálogo y en el detalle del libro. |

> **Formato pendiente del ID Libro:** hasta confirmar con el personal de la biblioteca si el identificador físico es numérico, alfanumérico, código de barras, ISBN u otro formato, se manejará como texto libre (`string`).

### 2.2 Autor

Se maneja como entidad independiente (no como texto libre dentro de Libro), porque un libro puede tener varios autores y un mismo autor puede tener varias obras registradas (relación muchos a muchos).

| Campo | Descripción |
|---|---|
| ID Autor | Identificador interno del autor. |
| Nombre completo | Nombre del autor o autora. |

> **Relación:** Libro ↔ Autor es muchos-a-muchos, mediante una tabla intermedia `Libro_Autor`.

### 2.3 Usuario / Cliente

Identidad bibliotecaria propietaria de las solicitudes y préstamos. Puede existir sin cuenta cuando corresponde a historial anterior o préstamos presenciales.

| Campo | Descripción |
|---|---|
| ID Cliente | Cédula ecuatoriana de exactamente 10 dígitos numéricos, usada también para verificar historial de préstamos. |
| Nombre completo | Nombre del solicitante compuesto por letras. Admite espacios, apóstrofes, puntos y guiones, pero no números. |
| Contacto | Teléfono ecuatoriano y/o correo electrónico. El teléfono admite celular nacional de 10 dígitos iniciado en `09` o fijo nacional de 9 dígitos con código de provincia. |

### 2.4 Cuenta de cliente

Credenciales separadas de la identidad bibliotecaria y de las cuentas del personal. Existe como máximo una por Cliente.

| Campo | Descripción |
|---|---|
| ID Cuenta | Identificador interno. |
| Cliente | Relación única con Usuario/Cliente. |
| Contraseña | Se conserva exclusivamente como hash bcrypt. |
| Estado | Activa o inactiva. |
| Cambio obligatorio | Indica si debe sustituir una contraseña temporal. |
| Seguridad de sesión | Intentos fallidos, bloqueo temporal, versión de sesión y último acceso. |

### 2.5 Cuenta de personal (Bibliotecario / Administrador)

| Campo | Descripción |
|---|---|
| ID Cuenta | Identificador interno. |
| Nombre completo | Nombre del funcionario. |
| Usuario y contraseña | Credenciales de acceso al sistema. |
| Rol | Bibliotecario o Administrador. |
| Estado | Activo / inactivo (gestionado por el Administrador). |

### 2.6 Préstamo

Reemplaza al bloque original "Información de libro prestado": aquellas preguntas (¿fue prestado?, ¿está disponible?, ¿tiene pendientes?) no son datos que se almacenan, sino consultas que se responden a partir de esta entidad.

| Campo | Descripción |
|---|---|
| ID Préstamo | Identificador del préstamo. |
| Cliente | Referencia al Usuario/Cliente que solicita. |
| Bibliotecario | Funcionario que gestionó/aprobó el préstamo. |
| Fecha de solicitud | Cuando el cliente pide el préstamo. |
| Fecha de aprobación | Cuando el bibliotecario acepta la solicitud y el material queda listo para retiro. |
| Fecha de entrega | Cuando el cliente retira físicamente el o los libros. |
| Fecha límite de devolución | Definida por el bibliotecario según el caso, al registrar la entrega. |
| Fecha real de devolución | Se registra al devolver; nula si sigue prestado. |
| Estado | Pendiente / listo para retirar / rechazado / activo / devuelto / atrasado. |

### 2.7 Detalle de Préstamo

Un préstamo puede incluir varios libros distintos y varias unidades de cada uno, por lo que se separa en una tabla de detalle:

| Campo | Descripción |
|---|---|
| ID Detalle | Identificador de la línea de detalle. |
| Préstamo | Referencia al préstamo al que pertenece. |
| Libro | Referencia al libro prestado. |
| Cantidad solicitada | Número de ejemplares que el Cliente pidió de ese libro. |
| Cantidad aprobada | Nula mientras se revisa; cero si se rechaza la línea; positiva si se aprueba total o parcialmente. Nunca supera la solicitada. |
| Motivo de decisión | Comentario breve opcional de rechazo o reducción, visible al Cliente en su historial. |
| Cantidad devuelta | Número de ejemplares aprobados ya devueltos; permite devoluciones parciales. |

### 2.8 Movimiento

Registra el historial funcional que el Administrador consulta como movimientos del sistema.

| Campo | Descripción |
|---|---|
| ID Movimiento | Identificador interno del movimiento. |
| Tipo de movimiento | Préstamo, devolución, ingreso de libro, edición de libro, rechazo de solicitud o gestión de cuenta. |
| Fecha y hora | Momento exacto en que se produjo la acción. |
| Usuario/cuenta que lo generó | Cliente, bibliotecario o administrador, según corresponda. |
| Libro relacionado | Referencia opcional al libro afectado. |
| Préstamo relacionado | Referencia opcional al préstamo afectado. |
| Detalle o comentario | Texto breve opcional que describe la operación. |

> Al decidir una línea de solicitud (aprobar, reducir o rechazar), registrar su entrega, registrar una devolución, ingresar un libro o editar un libro, el sistema genera obligatoriamente un Movimiento.

---

## 3. Funciones por rol

### 3.1 Visitante y Cliente

1. Ver y navegar el catálogo completo, buscar por título, autor, género o tipo de material, y consultar el detalle de cada libro.
2. Ver disponibilidad física (cantidad disponible) de un libro.
3. Ver si el libro tiene versión digital disponible.
4. Visualizar el libro digital mediante visor embebido (sin descarga), con zoom, navegación y vista opcional de una o dos páginas. La portada se presenta sola y las páginas interiores pueden mostrarse como un libro abierto.
5. Preparar una selección de uno o varios libros físicos sin iniciar sesión.
6. Registrarse, activar una cuenta con historial previo e iniciar sesión con cédula y contraseña.
7. Enviar la solicitud física utilizando obligatoriamente la identidad de su sesión.
8. Consultar exclusivamente sus propias solicitudes, préstamos, fechas y devoluciones.
9. Actualizar teléfono/correo y cambiar su propia contraseña.
10. Recibir en **Mi cuenta** un aviso interno cuando una solicitud física quede aprobada y lista para retirar. No se envían correos, SMS ni mensajes externos.

### 3.2 Bibliotecario (con autenticación)

1. Revisar todas las solicitudes de préstamo pendientes, incluyendo las creadas o gestionadas por cualquier cuenta de Bibliotecario o Administrador.
2. Decidir cada material: aprobar toda la cantidad, aprobar una cantidad menor o rechazar solamente esa línea. La revisión se guarda de forma completa y atómica para no dejar líneas sin decisión.
3. Si existe al menos un material aprobado, dejar únicamente esas unidades reservadas en estado `listo_retiro`; el Cliente ve inmediatamente el aviso interno en **Mi cuenta** con los materiales aprobados.
4. Cuando el cliente se presente, registrar la entrega física y definir la fecha límite de devolución; recién entonces el préstamo queda `activo`.
5. Registrar la devolución de libros prestados, liberando los ejemplares.
6. Consultar el catálogo completo: existencias, cantidad disponible y detalles.
7. Verificar disponibilidad de libros específicos.
8. Consultar qué clientes tienen libros físicos prestados actualmente, y quiénes están atrasados.
9. Registrar un préstamo directamente cuando el cliente se presenta en la biblioteca, ingresando cédula, nombre, contacto, materiales, cantidades y fecha límite. La entrega queda activa en una sola operación.
10. Exportar el inventario y los préstamos en PDF o Excel, respetando el filtro aplicado en cada módulo.
11. Buscar clientes, activar sus cuentas y restablecer contraseñas temporales.

### 3.3 Administrador (con autenticación)

1. Registrar libros nuevos en el catálogo (datos físicos).
2. Editar la información de libros existentes.
3. Ingresar o asociar archivos digitales a un libro (para el visor embebido).
4. Revisar historial de movimientos: préstamos, devoluciones, ingresos, ediciones de libros y rechazos de solicitudes.
5. Gestionar cuentas de bibliotecarios (crear, editar, activar/desactivar).
6. Restablecer o cambiar la contraseña de una cuenta de Bibliotecario. Los bibliotecarios no disponen de recuperación ni autogestión de contraseña.
7. Exportar inventario, préstamos y el historial de movimientos en PDF o Excel, respetando los permisos y filtros de cada módulo.
8. Buscar clientes, activar sus cuentas y restablecer contraseñas temporales.
9. Consultar el mismo historial completo de solicitudes y préstamos que los Bibliotecarios, incluidos los originados por otras cuentas de personal.

---

## 4. Reglas de negocio

- El sistema debe contabilizar cuántos libros tiene actualmente prestados cada cliente.
- Una solicitud física solo puede enviarse desde una cuenta Cliente activa y utiliza el `cliente_id` de la sesión; nunca acepta una cédula editable como propietario.
- Un Cliente únicamente puede consultar préstamos asociados a su propio `cliente_id`.
- Cambiar o restablecer una contraseña incrementa la versión de sesión e invalida tokens anteriores.
- Una contraseña temporal debe cambiarse antes de solicitar materiales o consultar actividad.
- Los clientes con historial previo se vinculan al registro existente mediante comprobación segura o asistencia del personal; no se duplican.
- No se puede aprobar una línea de préstamo por una cantidad superior a la solicitada ni a la disponibilidad que fue apartada para esa línea.
- Un préstamo puede incluir más de un ejemplar de un mismo libro.
- Un préstamo puede incluir cualquier cantidad de libros distintos a la vez; no existe límite funcional de títulos por solicitud. Los límites de tamaño de petición son solo una salvaguarda técnica.
- No se puede generar un nuevo préstamo si el cliente tiene un préstamo listo para retirar, activo o atrasado.
- El préstamo directo registrado por personal aplica las mismas validaciones de cliente, disponibilidad, concurrencia y bloqueo que una solicitud pública.
- Si un préstamo supera su fecha límite de devolución sin haberse devuelto, cambia a estado "atrasado"; esto no genera multas, solo bloquea nuevos préstamos para ese cliente hasta que devuelva lo pendiente.
- La cantidad disponible de un libro se recalcula automáticamente al registrar una solicitud válida (para apartar unidades), al reducir o rechazar una línea, al entregar y al registrar una devolución. El estado `listo_retiro` mantiene únicamente las unidades aprobadas apartadas.
- Al crear solicitudes concurrentes por el último ejemplar disponible, la primera solicitud válida en orden de fecha y hora aparta la unidad. En una solicitud con varios materiales, las líneas posteriores sin disponibilidad se rechazan automáticamente sin afectar las demás; no se crea una reserva o lista de espera.
- Rechazar una línea libera sus unidades, registra el Movimiento correspondiente y no genera notificaciones externas. Si todas las líneas se rechazan, el préstamo queda `rechazado`.
- Si se aprueba al menos una línea, la solicitud queda `listo_retiro` y genera un aviso interno visible en **Mi cuenta** solamente para los materiales y cantidades aprobados. El aviso desaparece cuando el personal registra la entrega.
- No se incluyen notificaciones externas por correo, WhatsApp, SMS ni servicios de terceros.
- No se requiere un mecanismo de respaldo adicional dentro de la aplicación: la base de datos en la nube gestiona sus propios respaldos.
- El visor digital debe funcionar con teclado y controles táctiles. En pantallas móviles se prioriza una página por vez; las transiciones se reducen si el dispositivo solicita menos movimiento.
- Los reportes son documentos de consulta: no modifican datos y solo pueden generarse desde una sesión de personal activa.
- Los archivos PDF y Excel deben incluir identidad municipal, título, fecha y hora de emisión, responsable autenticado, filtros aplicados y total de registros.
- El bibliotecario puede exportar inventario y préstamos. La exportación de Movimientos es exclusiva del Administrador.
- Para evitar consumos excesivos de memoria, una exportación admite hasta 5.000 registros; si el resultado es mayor, el sistema solicita aplicar un filtro antes de generar el archivo.

---

## 5. Puntos a confirmar más adelante (fuera de esta versión)

- Sistema de reservas para libros físicos no disponibles.
- Indicadores estadísticos avanzados, gráficos ejecutivos o reportes adicionales distintos de inventario, préstamos y movimientos.
- Formato de archivo digital permitido, si la biblioteca desea aceptar alternativas al PDF. No se define límite de tamaño de PDF en esta versión.
