import { test, expect } from '@playwright/test';

test('al aprobar una solicitud el cliente recibe el aviso interno de retiro', async ({ page }) => {
  await page.goto('/personal/login');
  await page.getByLabel('Usuario').fill(process.env.E2E_LIBRARIAN_USER || 'bibliotecaria');
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.E2E_LIBRARIAN_PASSWORD || 'Biblioteca#2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto('/panel/solicitudes');
  await expect(page.getByText('SOL-DEMO-PEND')).toBeVisible();
  await page.getByRole('button', { name: 'Aprobar solicitud' }).click();
  await page.getByRole('button', { name: 'Sí, aprobar' }).click();
  await expect(page.getByRole('heading', { name: 'Listo para retirar' })).toBeVisible();

  await page.goto('/cuenta/login');
  await page.getByLabel('Cédula').fill('1301000001');
  await page.getByLabel('Contraseña', { exact: true }).fill('Lector#Demo2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: /Mi cuenta/ }).click();

  await expect(page.getByRole('heading', { name: '¡Tu préstamo está listo para retirar!' })).toBeVisible();
  await expect(page.locator('.pickup-notification').getByText('SOL-DEMO-PEND')).toBeVisible();
  await expect(page.getByText(/Acércate a la Biblioteca Municipal/).first()).toBeVisible();
});
