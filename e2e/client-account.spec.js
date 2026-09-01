import { test, expect } from '@playwright/test';

test('cliente inicia sesión, consulta su actividad y cierra sesión', async ({ page }) => {
  await page.goto('/cuenta/login');
  await page.getByLabel('Cédula').fill('1301000004');
  await page.getByLabel('Contraseña').fill('Lector#Demo2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Catálogo municipal' })).toBeVisible();
  await page.getByRole('link', { name: /Mi cuenta/ }).click();
  await expect(page).toHaveURL(/\/mi-cuenta$/);
  await expect(page.getByRole('heading', { name: /Hola, Ana/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Personal', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Acceso del personal' })).toHaveCount(0);

  await page.getByRole('link', { name: /Ver mis solicitudes y préstamos/ }).click();
  await expect(page.getByRole('heading', { name: 'Solicitudes y préstamos' })).toBeVisible();
  await expect(page.getByText('SOL-DEMO-PEND')).toBeVisible();
  await page.getByText('SOL-DEMO-PEND').click();
  await expect(page.getByRole('heading', { name: 'SOL-DEMO-PEND' })).toBeVisible();

  await page.getByRole('link', { name: 'Mi cuenta' }).first().click();
  await page.locator('.public-account-actions').getByTitle('Cerrar sesión').click();
  await expect(page.getByRole('link', { name: /Ingresar/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Acceso del personal' })).toBeVisible();
});
