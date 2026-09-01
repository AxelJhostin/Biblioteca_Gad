import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const COLORS = {
  teal: '#2F8C7C',
  tealDark: '#246B63',
  tealSoft: '#DCF2EC',
  coral: '#F2705B',
  amberSoft: '#FCEBD6',
  ink: '#41382F',
  muted: '#786E65',
  line: '#E8DDD2',
  white: '#FFFFFF',
};

const DEFAULT_LOGO_PATH = fileURLToPath(new URL('../../../../client/public/assets/logo.jpg', import.meta.url));
const PAGE = { width: 841.89, height: 595.28, margin: 34 };

async function logoBuffer(path = DEFAULT_LOGO_PATH) {
  try { return await fs.readFile(path); } catch { return null; }
}

function actorLabel(actor) {
  const role = String(actor?.rol || '').replace(/^./, (value) => value.toLocaleUpperCase('es'));
  return `${actor?.nombre_completo || 'Personal autorizado'}${role ? ` · ${role}` : ''}`;
}

function emittedLabel(value) {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Guayaquil',
  }).format(value);
}

function pdfHeader(doc, report, meta, logo) {
  doc.rect(0, 0, PAGE.width, 78).fill(COLORS.tealDark);
  doc.rect(0, 76, PAGE.width, 4).fill(COLORS.coral);
  if (logo) doc.image(logo, PAGE.margin, 16, { fit: [48, 48], align: 'center', valign: 'center' });
  const textX = logo ? PAGE.margin + 61 : PAGE.margin;
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(12)
    .text('GOBIERNO AUTÓNOMO DESCENTRALIZADO MUNICIPAL', textX, 17, { characterSpacing: 0.25 });
  doc.fontSize(10).font('Helvetica').text('DEL CANTÓN JIPIJAPA · BIBLIOTECA MUNICIPAL', textX, 36);
  doc.fontSize(15).font('Helvetica-Bold').text(report.shortTitle.toLocaleUpperCase('es'), textX, 53);

  doc.fillColor(COLORS.ink).fontSize(9).font('Helvetica-Bold')
    .text(report.title, PAGE.margin, 92);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
    .text(`Emitido: ${emittedLabel(meta.generatedAt)}   |   Responsable: ${actorLabel(meta.actor)}`, PAGE.margin, 108);
  doc.text(`Criterio: ${report.filterSummary}`, PAGE.margin, 120, { width: PAGE.width - (PAGE.margin * 2), ellipsis: true });
}

function pdfTableHeader(doc, report, y) {
  let x = PAGE.margin;
  doc.rect(PAGE.margin, y, PAGE.width - (PAGE.margin * 2), 24).fill(COLORS.amberSoft);
  for (const column of report.columns) {
    doc.fillColor('#80531F').font('Helvetica-Bold').fontSize(6.5)
      .text(column.label.toLocaleUpperCase('es'), x + 4, y + 8, {
        width: column.width - 8,
        align: column.align || 'left',
        ellipsis: true,
      });
    x += column.width;
  }
  return y + 24;
}

function pdfRowHeight(doc, report, row) {
  const heights = report.columns.map((column) => doc.font('Helvetica').fontSize(6.7)
    .heightOfString(String(row[column.key] ?? '—'), { width: column.width - 8, lineGap: 1 }));
  return Math.max(24, Math.min(48, Math.max(...heights) + 10));
}

function drawPdfRow(doc, report, row, y, index) {
  const height = pdfRowHeight(doc, report, row);
  if (index % 2 === 1) doc.rect(PAGE.margin, y, PAGE.width - (PAGE.margin * 2), height).fill('#FBF7F2');
  let x = PAGE.margin;
  for (const column of report.columns) {
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(6.7)
      .text(String(row[column.key] ?? '—'), x + 4, y + 5, {
        width: column.width - 8,
        height: height - 9,
        align: column.align || 'left',
        lineGap: 1,
        ellipsis: true,
      });
    x += column.width;
  }
  doc.moveTo(PAGE.margin, y + height).lineTo(PAGE.width - PAGE.margin, y + height)
    .lineWidth(0.45).strokeColor(COLORS.line).stroke();
  return height;
}

export async function generatePdf(report, meta = {}) {
  const generatedAt = meta.generatedAt || new Date();
  const logo = await logoBuffer(meta.logoPath);
  const doc = new PDFDocument({
    size: 'A4', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true,
    info: {
      Title: report.title,
      Author: 'Biblioteca Municipal de Jipijapa',
      Subject: report.subtitle,
      Creator: 'Sistema de Biblioteca Municipal de Jipijapa',
    },
  });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const pageMeta = { ...meta, generatedAt };
  pdfHeader(doc, report, pageMeta, logo);
  let y = pdfTableHeader(doc, report, 140);
  if (!report.rows.length) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(10)
      .text('No existen registros para el criterio seleccionado.', PAGE.margin, y + 28, {
        width: PAGE.width - (PAGE.margin * 2), align: 'center',
      });
  }

  report.rows.forEach((row, index) => {
    const height = pdfRowHeight(doc, report, row);
    if (y + height > PAGE.height - 35) {
      doc.addPage();
      pdfHeader(doc, report, pageMeta, logo);
      y = pdfTableHeader(doc, report, 140);
    }
    y += drawPdfRow(doc, report, row, y, index);
  });

  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      .text(`Biblioteca Municipal de Jipijapa · ${report.rows.length} registro(s)`, PAGE.margin, PAGE.height - 23, {
        width: 420,
      })
      .text(`Página ${pageIndex + 1} de ${range.count}`, PAGE.width - PAGE.margin - 120, PAGE.height - 23, {
        width: 120, align: 'right',
      });
  }
  doc.end();
  return completed;
}

function excelColor(hex) {
  return { argb: hex.replace('#', '').toUpperCase() };
}

export async function generateXlsx(report, meta = {}) {
  const generatedAt = meta.generatedAt || new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Biblioteca Municipal de Jipijapa';
  workbook.lastModifiedBy = actorLabel(meta.actor);
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.subject = report.subtitle;
  workbook.title = report.title;
  workbook.company = 'Gobierno Autónomo Descentralizado Municipal del Cantón Jipijapa';

  const sheet = workbook.addWorksheet(report.shortTitle, {
    properties: { tabColor: excelColor(COLORS.teal) },
    pageSetup: {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '1:9',
    },
    views: [{ state: 'frozen', ySplit: 9, showGridLines: false }],
  });
  const lastColumn = report.columns.length;
  sheet.columns = report.columns.map((column) => ({
    key: column.key,
    width: Math.max(10, Math.round(column.width / 6.2)),
    style: { font: { name: 'Aptos', size: 10 }, alignment: { vertical: 'top', wrapText: true } },
  }));

  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value = 'GOBIERNO AUTÓNOMO DESCENTRALIZADO MUNICIPAL DEL CANTÓN JIPIJAPA';
  sheet.mergeCells(2, 1, 2, lastColumn);
  sheet.getCell(2, 1).value = 'BIBLIOTECA MUNICIPAL';
  sheet.mergeCells(3, 1, 3, lastColumn);
  sheet.getCell(3, 1).value = report.title;
  sheet.mergeCells(4, 1, 4, lastColumn);
  sheet.getCell(4, 1).value = report.subtitle;
  sheet.mergeCells(6, 1, 6, lastColumn);
  sheet.getCell(6, 1).value = `Emitido: ${emittedLabel(generatedAt)}  |  Responsable: ${actorLabel(meta.actor)}`;
  sheet.mergeCells(7, 1, 7, lastColumn);
  sheet.getCell(7, 1).value = `Criterio: ${report.filterSummary}`;
  sheet.mergeCells(8, 1, 8, lastColumn);
  sheet.getCell(8, 1).value = `Total de registros: ${report.rows.length}`;

  for (const rowNumber of [1, 2]) {
    const row = sheet.getRow(rowNumber);
    row.height = rowNumber === 1 ? 28 : 22;
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: excelColor(COLORS.tealDark) };
      cell.font = { name: 'Aptos Display', bold: true, color: excelColor(COLORS.white), size: rowNumber === 1 ? 13 : 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }
  sheet.getRow(3).height = 27;
  sheet.getCell(3, 1).font = { name: 'Aptos Display', bold: true, color: excelColor(COLORS.coral), size: 16 };
  sheet.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell(4, 1).font = { name: 'Aptos', italic: true, color: excelColor(COLORS.muted), size: 10 };
  sheet.getCell(4, 1).alignment = { horizontal: 'center' };
  [6, 7, 8].forEach((rowNumber) => {
    sheet.getRow(rowNumber).height = 20;
    sheet.getCell(rowNumber, 1).font = { name: 'Aptos', color: excelColor(COLORS.ink), size: 9, bold: rowNumber === 8 };
    sheet.getCell(rowNumber, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: excelColor(rowNumber === 8 ? COLORS.tealSoft : '#FBF7F2') };
    sheet.getCell(rowNumber, 1).alignment = { vertical: 'middle', wrapText: true };
  });

  const headerRow = sheet.getRow(9);
  headerRow.values = report.columns.map((column) => column.label);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Aptos', bold: true, color: excelColor('#80531F'), size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: excelColor(COLORS.amberSoft) };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: excelColor(COLORS.coral) } };
  });

  report.rows.forEach((item, index) => {
    const row = sheet.addRow(report.columns.map((column) => item[column.key] ?? '—'));
    row.height = report.shortTitle === 'Movimientos' ? 36 : 42;
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: 'Aptos', size: 9, color: excelColor(COLORS.ink) };
      cell.alignment = {
        horizontal: report.columns[columnNumber - 1].align || 'left', vertical: 'top', wrapText: true,
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: excelColor(index % 2 ? '#FBF7F2' : COLORS.white) };
      cell.border = { bottom: { style: 'hair', color: excelColor(COLORS.line) } };
    });
  });

  const finalRow = Math.max(9, 9 + report.rows.length);
  sheet.autoFilter = { from: { row: 9, column: 1 }, to: { row: finalRow, column: lastColumn } };
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(lastColumn).letter}${finalRow}`;
  sheet.headerFooter.oddFooter = '&L Biblioteca Municipal de Jipijapa&C Documento institucional&R Página &P de &N';

  const logo = await logoBuffer(meta.logoPath);
  if (logo) {
    const imageId = workbook.addImage({ buffer: logo, extension: 'jpeg' });
    sheet.addImage(imageId, { tl: { col: 0.08, row: 0.05 }, ext: { width: 54, height: 54 } });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
