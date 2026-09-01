import { test, expect } from '@playwright/test';

test('una revisión mixta notifica al cliente solo los materiales aprobados', async ({ page }) => {
  await page.goto('/personal/login');
  await page.getByLabel('Usuario').fill(process.env.E2E_LIBRARIAN_USER || 'bibliotecaria');
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.E2E_LIBRARIAN_PASSWORD || 'Biblioteca#2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto('/panel/solicitudes');
  await expect(page.getByText('SOL-DEMO-PEND')).toBeVisible();
  const decisions = page.getByLabel('Decisión');
  await expect(decisions).toHaveCount(2);
  await decisions.nth(1).selectOption('rechazar');
  await page.getByLabel('Motivo del rechazo').fill('Ejemplo de revisión parcial.');
  await page.getByRole('button', { name: 'Guardar revisión' }).click();
  await page.getByRole('button', { name: 'Guardar decisión' }).click();
  await expect(page.getByRole('heading', { name: 'Material listo para retirar' })).toBeVisible();

  await page.goto('/cuenta/login');
  await page.getByLabel('Cédula').fill('1301000001');
  await page.getByLabel('Contraseña', { exact: true }).fill('Lector#Demo2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: /Mi cuenta/ }).click();

  await expect(page.getByRole('heading', { name: '¡Tienes materiales listos para retirar!' })).toBeVisible();
  await expect(page.locator('.pickup-notification').getByText('SOL-DEMO-PEND')).toBeVisible();
  await expect(page.locator('.pickup-notification').getByText(/Los Sangurimas/)).toBeVisible();
  await expect(page.locator('.pickup-notification').getByText(/Memorias de Jipijapa/)).toHaveCount(0);
});
