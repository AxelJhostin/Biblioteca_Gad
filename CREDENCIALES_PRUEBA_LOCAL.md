# Credenciales de prueba local

Estas cuentas existen únicamente para probar el Sistema de Biblioteca Municipal con Supabase local y Docker. No deben utilizarse en producción ni copiarse a Render, Vercel o un proyecto remoto de Supabase.

## Direcciones locales

- Aplicación web: `http://localhost:5173`
- Acceso de Cliente: `http://localhost:5173/cuenta/login`
- Acceso de Personal: `http://localhost:5173/personal/login`
- API: `http://localhost:4000/api`

## Cuentas disponibles

| Rol | Usuario o cédula | Contraseña | Acceso |
|---|---|---|---|
| Cliente | `1301000001` | `Lector#Demo2026` | Catálogo, solicitudes físicas y **Mi cuenta** |
| Bibliotecaria | `bibliotecaria` | `Biblioteca#2026` | Solicitudes, préstamos, entregas, devoluciones, catálogo y clientes |
| Administrador | `admin` | `Admin#Cambiar2026` | Todos los módulos, personal, movimientos y reportes |

## Preparar o restaurar las cuentas

Con Docker Desktop activo, desde la raíz del proyecto:

```bash
npm run local:reset
```

Este comando reconstruye exclusivamente la base de datos local, aplica las migraciones, carga los datos de demostración y vuelve a preparar las tres cuentas.

Para iniciar la aplicación:

```bash
npm run dev
```

## Flujo sugerido de prueba

1. Iniciar sesión como Cliente y seleccionar materiales físicos desde el catálogo.
2. Enviar la solicitud y revisar su estado en **Mi cuenta**.
3. Iniciar sesión como Bibliotecaria y aprobar la solicitud.
4. Volver a la cuenta del Cliente y comprobar el aviso **Tu préstamo está listo para retirar**.
5. Como Bibliotecaria, abrir **Préstamos**, filtrar por **Listos para retirar** y registrar la entrega con su fecha límite.
6. Registrar posteriormente una devolución parcial o completa.
7. Como Administrador, revisar Movimientos y las exportaciones PDF/Excel.

## Importante

- Las contraseñas están visibles porque son datos sintéticos de desarrollo.
- Antes de desplegar, deben configurarse contraseñas nuevas y secretos seguros mediante variables de entorno.
- El archivo `server/.env` no debe subirse al repositorio.
- `npm run local:reset` elimina cualquier dato ingresado manualmente en la base local.

