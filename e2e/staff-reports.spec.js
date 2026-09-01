import { test, expect } from '@playwright/test';

async function loginAsAdmin(page) {
  await page.goto('/personal/login');
  await page.getByLabel('Usuario').fill(process.env.E2E_ADMIN_USER || 'admin');
  await page.getByLabel('Contraseña').fill(process.env.E2E_ADMIN_PASSWORD || 'Admin#Cambiar2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
}

test('administrador descarga reportes PDF y Excel desde el panel', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/panel/prestamos');
  const pdfDownload = page.waitForEvent('download');
  await page.getByTestId('export-prestamos-pdf').click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^biblioteca-jipijapa-prestamos-\d{4}-\d{2}-\d{2}\.pdf$/);

  await page.goto('/panel/catalogo');
  const excelDownload = page.waitForEvent('download');
  await page.getByTestId('export-inventario-xlsx').click();
  const excel = await excelDownload;
  expect(excel.suggestedFilename()).toMatch(/^biblioteca-jipijapa-inventario-\d{4}-\d{2}-\d{2}\.xlsx$/);

  await page.goto('/panel/movimientos');
  await expect(page.getByTestId('export-movimientos-pdf')).toBeVisible();
  await expect(page.getByTestId('export-movimientos-xlsx')).toBeVisible();
});
