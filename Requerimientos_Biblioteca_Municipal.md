# Sistema de Gestión — Biblioteca Municipal
## Documento de Análisis de Requerimientos (versión revisada)

---

## 1. Alcance y decisiones generales

- No se requiere autenticación para el rol Cliente/Usuario. Cualquier persona puede consultar el catálogo y visualizar libros digitales sin registrarse.
- Sí se requiere autenticación (login) para los roles Bibliotecario y Administrador.
- Para solicitar un préstamo físico, el sistema solicita nombre completo, cédula ecuatoriana y contacto en el momento de la solicitud, sin necesidad de crear una cuenta.
- Los libros digitales son de acceso libre y sin restricciones, mediante un visor embebido dentro del sistema. No se permite la descarga directa del archivo.
- El plazo de devolución de cada préstamo se define caso por caso por el bibliotecario al momento de aprobarlo (no es un valor fijo del sistema).
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
| Cantidad disponible | Ejemplares físicos libres en este momento (total − prestados activos/atrasados − unidades apartadas por solicitudes pendientes). Se calcula, no se ingresa manualmente. |
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

Datos que se solicitan al momento de pedir un préstamo físico. No implica creación de cuenta ni login.

| Campo | Descripción |
|---|---|
| ID Cliente | Cédula ecuatoriana de exactamente 10 dígitos numéricos, usada también para verificar historial de préstamos. |
| Nombre completo | Nombre del solicitante compuesto por letras. Admite espacios, apóstrofes, puntos y guiones, pero no números. |
| Contacto | Teléfono ecuatoriano y/o correo electrónico. El teléfono admite celular nacional de 10 dígitos iniciado en `09` o fijo nacional de 9 dígitos con código de provincia. |

### 2.4 Cuenta de personal (Bibliotecario / Administrador)

| Campo | Descripción |
|---|---|
| ID Cuenta | Identificador interno. |
| Nombre completo | Nombre del funcionario. |
| Usuario y contraseña | Credenciales de acceso al sistema. |
| Rol | Bibliotecario o Administrador. |
| Estado | Activo / inactivo (gestionado por el Administrador). |

### 2.5 Préstamo

Reemplaza al bloque original "Información de libro prestado": aquellas preguntas (¿fue prestado?, ¿está disponible?, ¿tiene pendientes?) no son datos que se almacenan, sino consultas que se responden a partir de esta entidad.

| Campo | Descripción |
|---|---|
| ID Préstamo | Identificador del préstamo. |
| Cliente | Referencia al Usuario/Cliente que solicita. |
| Bibliotecario | Funcionario que gestionó/aprobó el préstamo. |
| Fecha de solicitud | Cuando el cliente pide el préstamo. |
| Fecha de entrega | Cuando el bibliotecario aprueba y entrega el o los libros. |
| Fecha límite de devolución | Definida por el bibliotecario según el caso, al aprobar. |
| Fecha real de devolución | Se registra al devolver; nula si sigue prestado. |
| Estado | Pendiente / aprobado / rechazado / activo / devuelto / atrasado. |

### 2.6 Detalle de Préstamo

Un préstamo puede incluir varios libros distintos y varias unidades de cada uno, por lo que se separa en una tabla de detalle:

| Campo | Descripción |
|---|---|
| ID Detalle | Identificador de la línea de detalle. |
| Préstamo | Referencia al préstamo al que pertenece. |
| Libro | Referencia al libro prestado. |
| Cantidad | Número de ejemplares de ese libro incluidos en el préstamo. |
| Cantidad devuelta | Número de ejemplares ya devueltos de la línea; permite devoluciones parciales. |

### 2.7 Movimiento

Registra el historial funcional que el Administrador consulta como movimientos del sistema.

| Campo | Descripción |
|---|---|
| ID Movimiento | Identificador interno del movimiento. |
| Tipo de movimiento | Préstamo, devolución, ingreso de libro, edición de libro o rechazo de solicitud. |
| Fecha y hora | Momento exacto en que se produjo la acción. |
| Usuario/cuenta que lo generó | Cliente, bibliotecario o administrador, según corresponda. |
| Libro relacionado | Referencia opcional al libro afectado. |
| Préstamo relacionado | Referencia opcional al préstamo afectado. |
| Detalle o comentario | Texto breve opcional que describe la operación. |

> Al aprobar un préstamo, rechazar una solicitud, registrar una devolución, ingresar un libro o editar un libro, el sistema genera obligatoriamente un Movimiento.

---

## 3. Funciones por rol

### 3.1 Cliente (sin autenticación)

1. Ver y navegar el catálogo completo, buscar por título, autor, género o tipo de material, y consultar el detalle de cada libro.
2. Ver disponibilidad física (cantidad disponible) de un libro.
3. Ver si el libro tiene versión digital disponible.
4. Visualizar el libro digital mediante visor embebido (sin descarga).
5. Solicitar préstamo de uno o varios libros físicos, ingresando sus datos de contacto en ese momento.

### 3.2 Bibliotecario (con autenticación)

1. Revisar solicitudes de préstamo pendientes y aprobarlas o rechazarlas.
2. Al aprobar, definir la fecha límite de devolución según el caso.
3. Registrar la entrega física del préstamo aprobado.
4. Registrar la devolución de libros prestados, liberando los ejemplares.
5. Consultar el catálogo completo: existencias, cantidad disponible y detalles.
6. Verificar disponibilidad de libros específicos.
7. Consultar qué clientes tienen libros físicos prestados actualmente, y quiénes están atrasados.
8. Registrar un préstamo directamente cuando el cliente se presenta en la biblioteca, ingresando cédula, nombre, contacto, materiales, cantidades y fecha límite. La entrega queda activa en una sola operación.

### 3.3 Administrador (con autenticación)

1. Registrar libros nuevos en el catálogo (datos físicos).
2. Editar la información de libros existentes.
3. Ingresar o asociar archivos digitales a un libro (para el visor embebido).
4. Revisar historial de movimientos: préstamos, devoluciones, ingresos, ediciones de libros y rechazos de solicitudes.
5. Gestionar cuentas de bibliotecarios (crear, editar, activar/desactivar).
6. Restablecer o cambiar la contraseña de una cuenta de Bibliotecario. Los bibliotecarios no disponen de recuperación ni autogestión de contraseña.

---

## 4. Reglas de negocio

- El sistema debe contabilizar cuántos libros tiene actualmente prestados cada cliente.
- No se puede aprobar un préstamo si la cantidad solicitada de un libro supera la cantidad disponible.
- Un préstamo puede incluir más de un ejemplar de un mismo libro.
- Un préstamo puede incluir varios libros distintos a la vez.
- No se puede generar un nuevo préstamo si el cliente tiene préstamos pendientes por devolver (activos o atrasados).
- El préstamo directo registrado por personal aplica las mismas validaciones de cliente, disponibilidad, concurrencia y bloqueo que una solicitud pública.
- Si un préstamo supera su fecha límite de devolución sin haberse devuelto, cambia a estado "atrasado"; esto no genera multas, solo bloquea nuevos préstamos para ese cliente hasta que devuelva lo pendiente.
- La cantidad disponible de un libro se recalcula automáticamente al registrar una solicitud válida (para apartar unidades), al rechazarla, al aprobar/entregar el préstamo y al registrar una devolución.
- Al crear solicitudes concurrentes por el último ejemplar disponible, la primera solicitud válida en orden de fecha y hora aparta la unidad. Las solicitudes posteriores sin disponibilidad se rechazan automáticamente; no se crea una reserva o lista de espera.
- Rechazar una solicitud únicamente cambia su estado a `rechazado` y registra el movimiento correspondiente. No genera notificaciones ni otras acciones hacia el cliente.
- No se requiere un mecanismo de respaldo adicional dentro de la aplicación: la base de datos en la nube gestiona sus propios respaldos.

---

## 5. Puntos a confirmar más adelante (fuera de esta versión)

- Sistema de reservas para libros físicos no disponibles.
- Reportes o estadísticas específicas que necesite el Administrador (más allá del historial de movimientos).
- Formato de archivo digital permitido, si la biblioteca desea aceptar alternativas al PDF. No se define límite de tamaño de PDF en esta versión.
