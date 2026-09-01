import { expect, test } from '@playwright/test';
import PDFDocument from 'pdfkit';

function digitalBookFixture(totalPages = 5) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 70 });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    for (let page = 1; page <= totalPages; page += 1) {
      if (page > 1) document.addPage();
      document.fontSize(28).text(`Libro digital · Página ${page}`, { align: 'center' });
      document.moveDown().fontSize(14).text('Biblioteca Municipal de Jipijapa', { align: 'center' });
    }
    document.end();
  });
}

test('lector permite zoom, pliegos, pantalla completa y adaptación móvil', async ({ page }) => {
  const pdf = await digitalBookFixture();
  await page.route('**/api/catalogo/999/visor', (route) => route.fulfill({
    status: 200,
    contentType: 'application/pdf',
    body: pdf,
  }));
  await page.route('**/api/catalogo/999', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, item: { id: 999, titulo: 'Libro digital de prueba' } }),
  }));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/libros/999/leer');
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver en pantalla completa' })).toBeVisible();
  const reader = page.locator('.reader-shell');
  await expect.poll(() => reader.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await reader.hover();
  await page.mouse.wheel(0, 420);
  await expect.poll(() => reader.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Ver dos páginas' }).click();
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page.getByText('2–3 / 5')).toBeVisible();
  await expect(page.locator('.reader-spread canvas')).toHaveCount(2);

  await page.getByRole('button', { name: 'Acercar' }).click();
  await expect(page.getByRole('button', { name: /actualmente 110 por ciento/ })).toHaveText('110%');
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page.locator('.reader-sheet').first()).toHaveCSS('animation-name', 'reader-page-next');
  await expect(page.getByText('4–5 / 5')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Ver dos páginas' })).toBeDisabled();
  await expect(page.locator('.reader-spread canvas')).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
