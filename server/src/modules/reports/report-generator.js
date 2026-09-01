import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import writeExcelFile from 'write-excel-file/node';

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

function mergedRow(value, columnCount, style = {}) {
  return [
    { value, columnSpan: columnCount, ...style },
    ...Array.from({ length: Math.max(0, columnCount - 1) }, () => null),
  ];
}

function excelColumnLabel(columnNumber) {
  let value = columnNumber;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

const autoFilterFeature = {
  files: {
    transform: {
      'xl/worksheets/sheet{id}.xml': {
        transform(xml, sheetOptions) {
          if (!sheetOptions.autoFilterRange) return xml;
          return xml.replace(
            '<mergeCells',
            `<autoFilter ref="${sheetOptions.autoFilterRange}"/><mergeCells`,
          );
        },
      },
    },
  },
};

export async function generateXlsx(report, meta = {}) {
  const generatedAt = meta.generatedAt || new Date();
  const columnCount = report.columns.length;
  const titleStyle = {
    align: 'center', alignVertical: 'center', wrap: true,
    backgroundColor: COLORS.tealDark, textColor: COLORS.white, fontWeight: 'bold',
  };
  const sheetData = [
    mergedRow('GOBIERNO AUTÓNOMO DESCENTRALIZADO MUNICIPAL DEL CANTÓN JIPIJAPA', columnCount, {
      ...titleStyle, height: 28, fontSize: 13,
    }),
    mergedRow('BIBLIOTECA MUNICIPAL', columnCount, { ...titleStyle, height: 22, fontSize: 11 }),
    mergedRow(report.title, columnCount, {
      height: 27, align: 'center', alignVertical: 'center', wrap: true,
      fontWeight: 'bold', fontSize: 16, textColor: COLORS.coral,
    }),
    mergedRow(report.subtitle, columnCount, {
      height: 22, align: 'center', alignVertical: 'center', wrap: true,
      fontStyle: 'italic', fontSize: 10, textColor: COLORS.muted,
    }),
    Array.from({ length: columnCount }, () => null),
    mergedRow(`Emitido: ${emittedLabel(generatedAt)}  |  Responsable: ${actorLabel(meta.actor)}`, columnCount, {
      height: 20, alignVertical: 'center', wrap: true, fontSize: 9,
      textColor: COLORS.ink, backgroundColor: '#FBF7F2',
    }),
    mergedRow(`Criterio: ${report.filterSummary}`, columnCount, {
      height: 20, alignVertical: 'center', wrap: true, fontSize: 9,
      textColor: COLORS.ink, backgroundColor: '#FBF7F2',
    }),
    mergedRow(`Total de registros: ${report.rows.length}`, columnCount, {
      height: 20, alignVertical: 'center', wrap: true, fontSize: 9, fontWeight: 'bold',
      textColor: COLORS.ink, backgroundColor: COLORS.tealSoft,
    }),
    report.columns.map((column) => ({
      value: column.label,
      height: 28,
      align: 'center',
      alignVertical: 'center',
      wrap: true,
      fontWeight: 'bold',
      fontSize: 9,
      textColor: '#80531F',
      backgroundColor: COLORS.amberSoft,
      bottomBorderColor: COLORS.coral,
      bottomBorderStyle: 'medium',
    })),
    ...report.rows.map((item, rowIndex) => report.columns.map((column) => {
      const value = item[column.key] ?? '—';
      return {
        value,
        ...(typeof value === 'string' ? { type: String, format: '@' } : {}),
        height: report.shortTitle === 'Movimientos' ? 36 : 42,
        align: column.align || 'left',
        alignVertical: 'top',
        wrap: true,
        fontSize: 9,
        textColor: COLORS.ink,
        backgroundColor: rowIndex % 2 ? '#FBF7F2' : COLORS.white,
        bottomBorderColor: COLORS.line,
        bottomBorderStyle: 'hair',
      };
    })),
  ];
  const logo = await logoBuffer(meta.logoPath);
  const images = logo ? [{
    content: logo,
    contentType: 'image/jpeg',
    width: 50,
    height: 50,
    dpi: 96,
    anchor: { row: 1, column: 1 },
    offsetX: 6,
    offsetY: 2,
    title: 'Escudo municipal de Jipijapa',
    description: 'Identidad institucional del Gobierno Municipal del Cantón Jipijapa',
  }] : undefined;
  const output = await writeExcelFile(sheetData, {
    sheet: report.shortTitle,
    columns: report.columns.map((column) => ({ width: Math.max(10, Math.round(column.width / 6.2)) })),
    orientation: 'landscape',
    stickyRowsCount: 9,
    showGridLines: false,
    zoomScale: 0.9,
    images,
    autoFilterRange: `A9:${excelColumnLabel(columnCount)}${Math.max(9, 9 + report.rows.length)}`,
  }, {
    fontFamily: 'Aptos',
    fontSize: 10,
    features: [autoFilterFeature],
  }).toBuffer();
  return Buffer.from(output);
}
