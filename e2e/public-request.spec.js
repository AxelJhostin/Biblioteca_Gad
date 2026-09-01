import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('catálogo y validación de solicitud funcionan en un móvil', async ({ page }) => {
  await page.goto('/solicitud');
  await expect(page.getByRole('heading', { name: 'Primero selecciona un libro' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecciona un libro primero' })).toBeDisabled();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Catálogo municipal' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir a solicitud' }).first().click();
  await page.getByRole('link', { name: /Solicitud/ }).click();

  await page.getByLabel('Cédula').fill('12abc');
  await expect(page.getByLabel('Cédula')).toHaveValue('12');
  await page.getByLabel('Nombre completo').fill('Ana 123 Mendoza');
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Ana  Mendoza');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByRole('alert')).toContainText('Revisa los campos señalados');
  await expect(page.getByText('La cédula debe contener exactamente 10 dígitos numéricos.')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
