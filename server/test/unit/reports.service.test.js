import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createReportsService } from '../../src/modules/reports/reports.service.js';

const actor = { id: 1, nombre_completo: 'Administrador Biblioteca', rol: 'administrador' };
const generatedAt = new Date('2026-08-31T15:30:00.000Z');

function repository() {
  return {
    inventario: async () => [{
      id_libro_texto: 'BJM-001', titulo: 'Los Sangurimas', autores: 'José de la Cuadra',
      tipo_material: 'libro', genero: 'narrativa', anio_publicacion: 1934,
      cantidad_total: 4, cantidad_disponible: 3, cantidad_comprometida: 1, digital_disponible: false,
    }],
    prestamos: async () => [{
      codigo: 'SOL-001', estado: 'activo', nombre_completo: 'Ana Mendoza', identificacion: '1301000001',
      materiales: 'BJM-001 - Los Sangurimas (1)', fecha_solicitud: generatedAt, fecha_limite: '2026-09-14',
      unidades_pendientes: 1, bibliotecario_nombre: 'Bibliotecaria de Pruebas',
    }],
    movimientos: async () => [{
      fecha_hora: generatedAt, tipo: 'prestamo', tipo_actor: 'administrador', actor_nombre: actor.nombre_completo,
      prestamo_codigo: 'SOL-001', id_libro_texto: 'BJM-001', libro_titulo: 'Los Sangurimas', detalle: 'Préstamo entregado.',
    }],
  };
}

test('genera un PDF institucional válido', async () => {
  const service = createReportsService(repository());
  const report = await service.generate({ type: 'prestamos', format: 'pdf', filters: { estado: 'activo' }, actor, generatedAt });
  assert.equal(report.contentType, 'application/pdf');
  assert.match(report.filename, /prestamos-2026-08-31\.pdf$/);
  assert.equal(report.buffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(report.buffer.length > 2000);
});

test('genera un Excel estructurado con encabezado, filtros y datos', async () => {
  const service = createReportsService(repository());
  const report = await service.generate({ type: 'inventario', format: 'xlsx', filters: {}, actor, generatedAt });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(report.buffer);
  const sheet = workbook.getWorksheet('Inventario');
  assert.equal(sheet.getCell('A3').value, 'Reporte de inventario bibliográfico');
  assert.equal(sheet.getCell('A9').value, 'ID libro');
  assert.equal(sheet.getCell('A10').value, 'BJM-001');
  assert.equal(sheet.getCell('H10').value, 3);
  assert.ok(sheet.autoFilter);
});

test('impide que un bibliotecario exporte el historial de movimientos', async () => {
  const service = createReportsService(repository());
  await assert.rejects(
    service.generate({ type: 'movimientos', format: 'pdf', filters: {}, actor: { ...actor, rol: 'bibliotecario' }, generatedAt }),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  );
});
