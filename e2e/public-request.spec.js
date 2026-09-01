import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('la selección se conserva al iniciar sesión y permite solicitar desde un móvil', async ({ page }) => {
  await page.goto('/solicitud');
  await expect(page.getByRole('heading', { name: 'Primero selecciona un libro' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecciona un libro primero' })).toBeDisabled();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Catálogo municipal' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir a solicitud' }).first().click();
  await page.getByRole('link', { name: /Solicitud/ }).click();

  await expect(page.getByRole('heading', { name: 'Identifícate para continuar' })).toBeVisible();
  await page.locator('.request-login-callout').getByRole('link', { name: 'Ingresar' }).click();
  await page.getByLabel('Cédula').fill('1301000004');
  await page.getByLabel('Contraseña').fill('Lector#Demo2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/solicitud$/);
  await expect(page.getByText('Ana Mendoza')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('el registro valida cédula, nombre, contacto y contraseña con mensajes visibles', async ({ page }) => {
  await page.goto('/cuenta/registro');
  await page.getByLabel('Cédula').fill('12abc');
  await expect(page.getByLabel('Cédula')).toHaveValue('12');
  await page.getByLabel('Nombre completo').fill('Ana 123 Mendoza');
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Ana  Mendoza');
  await page.getByLabel('Contraseña', { exact: true }).fill('corta');
  await page.getByLabel('Confirmar contraseña').fill('distinta');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByText('La cédula debe contener exactamente 10 dígitos numéricos.')).toBeVisible();
  await expect(page.getByText('Ingresa un teléfono o un correo.')).toBeVisible();
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
