# Plan de incorporación de cuentas para clientes

**Proyecto:** Sistema de Biblioteca Municipal de Jipijapa  
**Estado:** Especificación aprobada para implementación posterior  
**Fecha de definición:** 1 de septiembre de 2026  
**Alcance de este documento:** documentación únicamente; no implica cambios actuales en código, base de datos ni Supabase.

## 1. Resumen de la decisión

La Biblioteca Municipal solicita incorporar una cuenta autenticada para el rol Cliente/Usuario.

Se confirman las siguientes decisiones:

1. El catálogo, las fichas de libros y la lectura digital continúan siendo públicos y no requieren cuenta.
2. La cuenta de cliente es obligatoria únicamente para solicitar préstamos físicos.
3. El cliente puede registrarse por sí mismo.
4. El inicio de sesión se realiza con cédula ecuatoriana y contraseña.
5. Bibliotecarios y administradores pueden restablecer la contraseña de una cuenta de cliente.
6. No se incorporan notificaciones, reservas, multas ni cancelación de solicitudes como parte de este cambio.

Este requerimiento reemplaza la decisión anterior que establecía solicitudes físicas sin autenticación. El resto de las reglas de préstamo, disponibilidad, concurrencia, devolución y movimientos se conserva.

## 2. Objetivo

Permitir que una persona se identifique de forma segura antes de solicitar material físico y consulte su propia actividad bibliotecaria, sin cerrar el acceso público al conocimiento ni modificar el funcionamiento del panel de personal.

La cuenta debe servir para:

- Evitar que el cliente vuelva a escribir sus datos en cada solicitud.
- Asociar cada solicitud con la identidad autenticada correcta.
- Consultar solicitudes, préstamos, fechas límite y devoluciones propias.
- Impedir que un cliente acceda al historial de otra persona.
- Mantener la posibilidad de que el personal registre préstamos presenciales.

## 3. Estado actual e impacto

El sistema ya dispone de la entidad `clientes`, identificada de forma única por cédula, y todos los préstamos se relacionan con ella. Por lo tanto, no se debe reemplazar esta entidad ni alterar el historial existente.

Actualmente falta:

- Una entidad separada para credenciales de clientes.
- Registro, login, validación de sesión y cambio de contraseña de clientes.
- Autorización por propietario para consultar solicitudes y préstamos.
- Pantallas de registro, login, perfil y actividad del cliente.
- Restablecimiento de contraseñas de clientes desde el panel interno.
- Protección de la creación de solicitudes físicas mediante sesión de cliente.

Los siguientes documentos deberán actualizarse al implementar este plan:

- `Requerimientos_Biblioteca_Municipal.md`
- `ESPECIFICACION_FUNCIONAL_TECNICA_BIBLIOTECA.md`
- `README.md`
- `DEPLOY_SUPABASE_RENDER.md`

## 4. Alcance funcional

### 4.1 Funciones públicas sin cuenta

- Navegar el catálogo completo.
- Buscar y filtrar libros.
- Consultar fichas y disponibilidad.
- Leer archivos digitales en el visor.
- Agregar materiales físicos al resumen de solicitud.
- Abrir las pantallas de registro e inicio de sesión.

Agregar materiales al resumen no crea todavía una solicitud ni aparta ejemplares.

### 4.2 Funciones del cliente autenticado

- Solicitar uno o varios materiales físicos disponibles.
- Consultar el estado de sus solicitudes: `pendiente`, `activo`, `atrasado`, `devuelto` o `rechazado`.
- Ver código, fecha, materiales y cantidades de cada solicitud o préstamo.
- Consultar fecha límite y cantidades pendientes de devolución.
- Consultar su historial personal.
- Ver sus datos de perfil.
- Actualizar teléfono y correo.
- Cambiar su contraseña.
- Cerrar sesión.

### 4.3 Restricciones del cliente

El cliente no puede:

- Consultar datos o préstamos de otra persona.
- Cambiar su cédula desde el perfil.
- Cambiar estados, fechas límite, cantidades entregadas o devoluciones.
- Aprobar, rechazar o cancelar solicitudes.
- Modificar existencias o información del catálogo.
- Restablecer una contraseña olvidada sin intervención del personal en esta versión.

### 4.4 Funciones adicionales del bibliotecario y administrador

Ambos roles internos pueden:

- Localizar un cliente por cédula o nombre.
- Ver si el cliente tiene cuenta activa.
- Crear o activar una cuenta para un cliente existente cuando sea necesario.
- Restablecer su contraseña mediante una contraseña temporal.
- Obligar al cliente a cambiar la contraseña temporal en el siguiente acceso.

La restricción actual se conserva para cuentas de personal: únicamente el Administrador puede restablecer la contraseña de un Bibliotecario.

## 5. Matriz de acceso

| Capacidad | Visitante | Cliente autenticado | Bibliotecario | Administrador |
|---|:---:|:---:|:---:|:---:|
| Ver catálogo y fichas | Sí | Sí | Sí | Sí |
| Leer material digital | Sí | Sí | Sí | Sí |
| Preparar selección física | Sí | Sí | — | — |
| Enviar solicitud física | — | Sí | — | — |
| Consultar actividad propia | — | Sí | — | — |
| Registrar préstamo presencial | — | — | Sí | Sí |
| Revisar solicitudes | — | — | Sí | Sí |
| Restablecer contraseña de cliente | — | — | Sí | Sí |
| Restablecer contraseña de bibliotecario | — | — | — | Sí |

## 6. Flujos definidos

### 6.1 Registro de un cliente nuevo

1. La persona abre **Crear cuenta**.
2. Ingresa cédula, nombre completo, teléfono y/o correo, contraseña y confirmación.
3. El cliente y la cuenta se crean dentro de una sola transacción.
4. La contraseña se almacena únicamente como hash.
5. La cuenta queda activa y la persona puede iniciar sesión.
6. El registro no genera automáticamente una solicitud.

### 6.2 Activación para un cliente con historial previo

Una cédula existente puede tener préstamos históricos aunque todavía no posea cuenta. No se debe permitir que cualquier persona se apropie de ese historial únicamente conociendo la cédula.

Se aplicará este orden:

1. El sistema detecta que existe `clientes`, pero no `cuentas_clientes`.
2. Para activación autónoma se solicita:
   - cédula;
   - teléfono o correo que coincida con el registro existente;
   - código de una solicitud previa asociada al cliente.
3. Si la comprobación es correcta, se crea únicamente la cuenta y se conserva el mismo `cliente_id`.
4. Si la persona no conserva el código o los datos no coinciden, el sistema no revela qué comprobación falló y solicita acudir a la biblioteca.
5. Bibliotecario o Administrador verifica la identidad y activa la cuenta con una contraseña temporal.

No se crearán clientes duplicados para resolver este caso.

### 6.3 Inicio de sesión

1. La persona ingresa cédula y contraseña.
2. La API busca la cuenta mediante la cédula normalizada.
3. Verifica estado, bloqueo temporal y hash de contraseña.
4. Si es válida, genera una sesión con rol `cliente` y referencia inequívoca a la cuenta.
5. Si debe cambiar contraseña, solo puede acceder a la pantalla de cambio y cerrar sesión.
6. Los errores deben ser genéricos: **“Credenciales incorrectas o cuenta inactiva.”**

### 6.4 Solicitud de préstamo físico

1. Un visitante puede seleccionar libros antes de iniciar sesión.
2. Al intentar enviar la solicitud, el sistema solicita registro o login y conserva la selección local.
3. Después de autenticarse, regresa a la solicitud.
4. La pantalla muestra los datos del perfil; no permite enviar otra cédula en el cuerpo de la solicitud.
5. La API obtiene `cliente_id` exclusivamente desde la sesión autenticada.
6. Se aplican las reglas existentes de bloqueo del cliente, disponibilidad y orden de llegada.
7. Si es válida, se crea el préstamo `pendiente`, se apartan unidades y se registra el Movimiento correspondiente.

### 6.5 Consulta de actividad

El cliente ve únicamente registros cuyo `cliente_id` coincide con el de su sesión. La consulta incluye:

- Código y fecha de solicitud.
- Estado actual.
- Materiales y cantidades.
- Fecha de aprobación y entrega, cuando existan.
- Fecha límite, cuando exista.
- Cantidad devuelta y pendiente por línea.
- Motivo de rechazo, solo si la biblioteca decide mostrar el comentario; por defecto se muestra únicamente el estado `rechazado`.

### 6.6 Cambio de contraseña

1. El cliente autenticado ingresa contraseña actual, nueva contraseña y confirmación.
2. La API verifica la contraseña actual.
3. Genera un nuevo hash con costo seguro.
4. Incrementa la versión de sesión para invalidar otros tokens.
5. Emite una sesión nueva para el dispositivo actual.

### 6.7 Restablecimiento por personal

1. Bibliotecario o Administrador localiza al cliente.
2. Selecciona **Restablecer contraseña**.
3. Ingresa una contraseña temporal de al menos 10 caracteres y la confirma.
4. La API genera el hash, marca `debe_cambiar_password = true` e incrementa `version_sesion`.
5. Todas las sesiones anteriores quedan inválidas.
6. En el siguiente login, el cliente debe establecer una contraseña nueva.

No se muestra, registra ni exporta ninguna contraseña.

## 7. Modelo de datos propuesto

### 7.1 Entidad existente `clientes`

Se mantiene como identidad bibliotecaria y propietaria del historial:

| Campo | Regla |
|---|---|
| `id` | Identificador técnico. |
| `identificacion` | Cédula única de 10 dígitos. Se usa como login, pero no es contraseña. |
| `nombre_completo` | Obligatorio y sin números. |
| `telefono` | Celular o fijo ecuatoriano, opcional si existe correo. |
| `correo` | Opcional si existe teléfono. |
| Fechas | Conservan creación y actualización. |

### 7.2 Nueva entidad `cuentas_clientes`

Debe mantenerse separada de `clientes` y `cuentas_personal`.

| Campo | Tipo orientativo | Regla |
|---|---|---|
| `id` | `bigint identity` | Clave primaria. |
| `cliente_id` | `bigint` | FK única hacia `clientes`; relación uno a uno. |
| `password_hash` | `text` | Obligatorio; nunca contiene contraseña en texto. |
| `estado` | `boolean` | Activa o inactiva. |
| `debe_cambiar_password` | `boolean` | Obliga a sustituir una contraseña temporal. |
| `intentos_fallidos` | `smallint` | Contador defensivo, nunca negativo. |
| `bloqueado_hasta` | `timestamptz` | Bloqueo temporal por intentos fallidos. |
| `version_sesion` | `integer` | Se incrementa para invalidar tokens anteriores. |
| `ultimo_acceso` | `timestamptz` | Último login válido. |
| `creado_en` | `timestamptz` | Auditoría. |
| `actualizado_en` | `timestamptz` | Auditoría. |

Restricciones mínimas:

- `cliente_id` único.
- `intentos_fallidos >= 0`.
- `version_sesion >= 1`.
- `ON DELETE RESTRICT` para no perder la relación con historial.

### 7.3 Relaciones resultantes

```text
clientes ── 0..1 cuentas_clientes
clientes ──< prestamos ──< prestamo_detalles >── libros
clientes ──< movimientos
cuentas_personal ──< acciones de bibliotecario/administrador
```

No es necesario agregar `cuenta_cliente_id` a `prestamos`: `cliente_id` ya representa correctamente al propietario del préstamo y preserva los registros anteriores a la creación de cuentas.

## 8. Autenticación y sesiones

### 8.1 Estrategia recomendada

La aplicación mantendrá el patrón actual de autenticación administrado por la API Express:

- PostgreSQL/Supabase almacena datos y hashes.
- Express valida credenciales, estado y autorización.
- El navegador nunca recibe claves secretas de Supabase.
- No se requiere incorporar Supabase Auth, correo SMTP ni servicios externos para este alcance.
- Funciona con Supabase local en Docker y con una futura base Supabase en producción.

### 8.2 Token de cliente

El token debe distinguirse inequívocamente del token del personal e incluir como mínimo:

```json
{
  "sub": "ID_CUENTA_CLIENTE",
  "role": "cliente",
  "type": "cliente",
  "ver": 1
}
```

Reglas:

- El middleware de clientes acepta exclusivamente `type = cliente` y `role = cliente`.
- La API vuelve a consultar la cuenta activa y su `version_sesion` en operaciones protegidas.
- Un token de cliente nunca autoriza rutas de personal.
- Un token de personal nunca sustituye automáticamente la identidad de un cliente.
- En el frontend se usan claves de sesión separadas, por ejemplo `biblioteca_cliente_token` y `biblioteca_cliente_user`.
- El tiempo de vida inicial puede conservar el valor actual de una hora.

## 9. Validaciones

### 9.1 Registro y perfil

- Cédula: exactamente 10 dígitos numéricos.
- Nombre: obligatorio, normalizado y sin números.
- Contacto: al menos teléfono o correo.
- Teléfono: celular ecuatoriano `09` de 10 dígitos o fijo nacional de 9 dígitos.
- Correo: formato válido y normalizado a minúsculas.
- Contraseña: mínimo 10 y máximo 120 caracteres.
- Confirmación: debe coincidir exactamente con la contraseña.
- La cédula es inmutable desde el perfil.

### 9.2 Contraseñas

- Hash con `bcrypt`, costo 12, conservando el estándar actual del proyecto.
- Nunca guardar, devolver, registrar o exportar contraseñas.
- No recortar ni convertir a minúsculas la contraseña.
- Los errores de login no deben confirmar si una cédula existe.
- El restablecimiento siempre invalida sesiones anteriores.

### 9.3 Protección contra abuso

- Login: limitación por IP y cédula normalizada.
- Registro: limitación por IP.
- Bloqueo temporal después de varios intentos fallidos consecutivos.
- Respuestas uniformes para evitar enumeración de cédulas.
- Validación Zod en frontend y API; la API mantiene la autoridad final.

## 10. Contrato de API propuesto

### 10.1 Autenticación del cliente

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `POST` | `/api/clientes/auth/registro` | Público limitado | Crear cliente y cuenta nuevos. |
| `POST` | `/api/clientes/auth/activar` | Público limitado | Activar cuenta de cliente con historial, comprobando datos y código previo. |
| `POST` | `/api/clientes/auth/login` | Público limitado | Iniciar sesión con cédula y contraseña. |
| `GET` | `/api/clientes/auth/me` | Cliente | Validar y recuperar sesión. |
| `POST` | `/api/clientes/auth/cambiar-password` | Cliente | Cambiar contraseña propia. |

### 10.2 Perfil y actividad

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/api/clientes/me` | Cliente | Consultar perfil. |
| `PATCH` | `/api/clientes/me` | Cliente | Actualizar teléfono y correo. |
| `GET` | `/api/clientes/me/prestamos` | Cliente | Consultar solicitudes e historial propio. |
| `GET` | `/api/clientes/me/prestamos/:id` | Cliente propietario | Consultar detalle propio. |
| `POST` | `/api/clientes/me/solicitudes` | Cliente | Crear solicitud física con la selección enviada. |

La ruta pública actual `POST /api/solicitudes` debe dejar de aceptar solicitudes anónimas. Puede redirigirse internamente al nuevo servicio protegido durante la transición, pero nunca debe confiar en una cédula enviada por el navegador para determinar el propietario.

### 10.3 Operaciones del personal

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/api/clientes` | Bibliotecario/Admin | Buscar clientes y estado de cuenta. |
| `POST` | `/api/clientes/:id/activar-cuenta` | Bibliotecario/Admin | Crear cuenta con contraseña temporal. |
| `POST` | `/api/clientes/:id/restablecer-password` | Bibliotecario/Admin | Restablecer contraseña e invalidar sesiones. |

## 11. Pantallas y navegación

### 11.1 Zona pública y cliente

| Ruta | Pantalla | Contenido |
|---|---|---|
| `/cuenta/registro` | Crear cuenta | Cédula, nombre, contacto, contraseña y confirmación. |
| `/cuenta/activar` | Activar cuenta previa | Cédula, contacto, código previo y nueva contraseña. |
| `/cuenta/login` | Inicio de sesión | Cédula y contraseña. |
| `/mi-cuenta` | Resumen | Solicitudes pendientes, préstamos activos/atrasados y accesos rápidos. |
| `/mi-cuenta/prestamos` | Actividad | Listado e historial propio. |
| `/mi-cuenta/prestamos/:id` | Detalle | Materiales, cantidades, fechas y estado. |
| `/mi-cuenta/perfil` | Perfil | Datos personales editables permitidos. |
| `/mi-cuenta/seguridad` | Seguridad | Cambio obligatorio o voluntario de contraseña. |

### 11.2 Ajustes de interfaces existentes

- La cabecera pública mostrará **Ingresar** cuando no exista sesión y **Mi cuenta / Salir** cuando exista.
- La selección de libros se conserva si el visitante es enviado a login o registro.
- `/solicitud` deja de pedir cédula, nombre y contacto; muestra un resumen del perfil autenticado.
- La confirmación conserva el código de solicitud y agrega acceso a **Mi cuenta**.
- El panel de personal incorpora estado de cuenta y acciones de activación/restablecimiento en la consulta del cliente.
- Todo mantiene la identidad municipal y el comportamiento responsive actual.

## 12. Cambios internos recomendados

### 12.1 Backend

Crear un módulo independiente, por ejemplo:

```text
server/src/modules/client-auth/
├── client-auth.repository.js
├── client-auth.service.js
├── client-auth.routes.js
└── client-auth.middleware.js
```

Responsabilidades:

- Registro y activación transaccional.
- Login, hash, bloqueo temporal y sesiones.
- Recuperación del cliente autenticado.
- Autorización por propietario.
- Cambio y restablecimiento de contraseña.

El servicio de préstamos debe recibir `cliente_id` confiable desde el middleware, sin duplicar reglas de disponibilidad ni concurrencia.

### 12.2 Frontend

Crear un contexto de cliente separado del contexto de personal:

```text
client/src/state/ClientAuthContext.jsx
client/src/pages/client/Register.jsx
client/src/pages/client/Activate.jsx
client/src/pages/client/Login.jsx
client/src/pages/client/AccountDashboard.jsx
client/src/pages/client/LoanHistory.jsx
client/src/pages/client/Profile.jsx
client/src/pages/client/Security.jsx
```

La separación evita que una sesión de cliente pueda interpretarse como sesión del panel interno.

### 12.3 Base de datos y Supabase

- Crear la migración con Supabase CLI cuando comience la implementación.
- Habilitar RLS en `cuentas_clientes`.
- Conservar el modelo actual: la API Express es el único acceso a tablas y se revocan privilegios de `anon` y `authenticated` en Data API.
- No ejecutar cambios directamente en la instancia remota hasta contar con credenciales institucionales y autorización de despliegue.
- Probar primero mediante Supabase local y Docker.
- No crear automáticamente cuentas para todos los clientes históricos.

## 13. Reglas de negocio adicionales

| ID provisional | Regla |
|---|---|
| RC-01 | Catálogo y lectura digital permanecen públicos. |
| RC-02 | Enviar una solicitud física requiere una cuenta de cliente activa. |
| RC-03 | Una cédula posee como máximo un cliente y una cuenta de cliente. |
| RC-04 | La API determina el cliente de la solicitud desde la sesión, nunca desde datos editables del formulario. |
| RC-05 | Un cliente solo consulta registros asociados a su propio `cliente_id`. |
| RC-06 | Los clientes históricos se vinculan con su registro existente; no se duplican para crear una cuenta. |
| RC-07 | Bibliotecario y Administrador pueden restablecer contraseñas de clientes. |
| RC-08 | Restablecer o cambiar contraseña invalida sesiones anteriores. |
| RC-09 | Una contraseña temporal debe cambiarse antes de usar funciones de préstamo. |
| RC-10 | Las reglas existentes de stock, concurrencia, bloqueo por préstamos abiertos y rechazo automático no cambian. |

## 14. Seguridad y privacidad

- No exponer `password_hash` en ninguna consulta o respuesta.
- No incluir cédulas completas en logs de errores; en auditoría visible se puede usar una versión enmascarada.
- No usar datos modificables del perfil como autorización.
- Todas las consultas de actividad deben filtrar por el `cliente_id` de la sesión en el servidor.
- Mantener mensajes genéricos en login, activación y registro cuando exista conflicto de identidad.
- La cuenta inactiva debe rechazarse en cada operación protegida, aunque el token todavía no haya expirado.
- El restablecimiento por personal debe registrar quién realizó la acción, sin guardar la contraseña.
- Los movimientos bibliotecarios existentes se conservan; no se agregan contraseñas ni secretos al historial.

## 15. Estrategia para datos existentes

1. Crear `cuentas_clientes` inicialmente vacía.
2. No modificar ni eliminar filas de `clientes`, `prestamos`, `prestamo_detalles` o `movimientos`.
3. Permitir que clientes sin historial se registren normalmente.
4. Para cédulas existentes, ejecutar el flujo de activación segura.
5. Permitir activación asistida por personal cuando la comprobación autónoma no sea posible.
6. Confirmar que el historial aparece después de vincular la cuenta al `cliente_id` existente.
7. Mantener la posibilidad de registrar préstamos directos para clientes sin cuenta; el personal puede activar la cuenta posteriormente.

## 16. Pruebas necesarias

### 16.1 Unitarias

- Validación de cédula, nombre, contacto y contraseña.
- Registro nuevo y rechazo de duplicados.
- Activación de cliente histórico sin duplicarlo.
- Login válido, contraseña incorrecta y cuenta inactiva.
- Bloqueo temporal por intentos fallidos.
- Cambio obligatorio y voluntario de contraseña.
- Incremento de versión de sesión.
- Restablecimiento permitido para ambos roles internos.
- Rechazo de acceso a préstamos ajenos.

### 16.2 Integración

- Registro transaccional de cliente y cuenta.
- Creación de solicitud con `cliente_id` procedente del token.
- Imposibilidad de enviar una solicitud anónima.
- Consulta exclusiva del historial propio.
- Bibliotecario y Administrador restablecen contraseña.
- Un cliente no accede a rutas de personal.
- Un token previo deja de funcionar después del restablecimiento.

### 16.3 E2E

- Registro → login → selección de libro → solicitud → consulta en Mi cuenta.
- Login → historial → detalle → logout.
- Conservación de la selección al pasar por login.
- Restablecimiento por bibliotecario y cambio obligatorio del cliente.
- Vista móvil de registro, login, solicitud y panel del cliente.
- Validaciones con mensajes visibles y sin desbordamiento horizontal.

## 17. Criterios de aceptación

1. Una persona sin cuenta puede consultar catálogo y leer material digital.
2. Una persona sin sesión no puede enviar una solicitud física.
3. Un cliente nuevo puede registrarse con cédula y contraseña válidas.
4. La cédula duplicada no crea otro cliente.
5. Un cliente histórico puede vincular su cuenta sin perder préstamos anteriores.
6. El login usa cédula y contraseña y muestra errores genéricos.
7. Una cuenta inactiva no puede operar aunque conserve un token.
8. La solicitud utiliza el cliente de la sesión y conserva las reglas actuales de disponibilidad.
9. El cliente solo ve sus propias solicitudes y préstamos.
10. El cliente puede actualizar teléfono/correo, pero no la cédula.
11. El cliente puede cambiar su contraseña.
12. Bibliotecario y Administrador pueden restablecer la contraseña de un cliente.
13. El restablecimiento invalida sesiones anteriores y obliga a cambiar la contraseña temporal.
14. Las contraseñas nunca aparecen en respuestas, movimientos, logs o reportes.
15. Las pruebas unitarias, de integración y E2E correspondientes quedan aprobadas.

## 18. Orden de implementación recomendado

1. Actualizar requerimientos y especificación técnica con RC-01 a RC-10.
2. Crear migración y repositorio de `cuentas_clientes` en Supabase local.
3. Implementar servicio, middleware y rutas de autenticación del cliente.
4. Proteger solicitudes físicas y adaptar el servicio para usar `cliente_id` autenticado.
5. Implementar perfil e historial con autorización por propietario.
6. Agregar activación y restablecimiento desde el panel de personal.
7. Implementar pantallas públicas y contexto de sesión de cliente.
8. Ejecutar pruebas, auditoría de seguridad, QA responsive y actualizar despliegue.

## 19. Fuera de alcance

- Recuperación automática por correo, SMS o WhatsApp.
- Confirmación de correo electrónico.
- Inicio de sesión social.
- Supabase Auth como proveedor directo de identidad.
- Cancelación de solicitudes por el cliente.
- Reservas o listas de espera.
- Notificaciones de aprobación, rechazo o vencimiento.
- Multas o sanciones.
- Restricción de la lectura digital a usuarios autenticados.
- Aplicación móvil nativa.

## 20. Resultado esperado

Al finalizar este plan, el sistema conservará su acceso público al catálogo y a la lectura digital, pero toda solicitud de préstamo físico tendrá un propietario autenticado. El cliente dispondrá de una vista personal de su actividad y el personal podrá resolver contraseñas olvidadas sin alterar las reglas bibliotecarias ya validadas.
