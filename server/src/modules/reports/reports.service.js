import { AppError } from '../../core/errors.js';
import { prepareReport, reportTypes } from './report-definitions.js';
import { generatePdf, generateXlsx } from './report-generator.js';
import { REPORT_MAX_ROWS } from './reports.repository.js';

const formats = ['pdf', 'xlsx'];

function safeDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(value);
}

export function createReportsService(repository) {
  return {
    async generate({ type, format, filters, actor, generatedAt = new Date() }) {
      if (!reportTypes.includes(type) || !formats.includes(format)) {
        throw new AppError('El reporte o formato solicitado no existe.', 404, 'REPORT_NOT_FOUND');
      }
      if (type === 'movimientos' && actor?.rol !== 'administrador') {
        throw new AppError('Solo el administrador puede exportar movimientos.', 403, 'FORBIDDEN');
      }
      const items = await repository[type](filters);
      if (items.length > REPORT_MAX_ROWS) {
        throw new AppError(
          `El reporte supera ${REPORT_MAX_ROWS.toLocaleString('es-EC')} registros. Aplique un filtro antes de exportar.`,
          413,
          'REPORT_TOO_LARGE',
        );
      }
      const report = prepareReport(type, items, filters);
      const buffer = format === 'pdf'
        ? await generatePdf(report, { actor, generatedAt })
        : await generateXlsx(report, { actor, generatedAt });
      const stamp = safeDate(generatedAt);
      return {
        buffer,
        contentType: format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `biblioteca-jipijapa-${type}-${stamp}.${format}`,
        count: items.length,
      };
    },
  };
}
