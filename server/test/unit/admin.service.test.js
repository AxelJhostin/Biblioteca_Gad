import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createAdminService } from '../../src/modules/admin/admin.service.js';

test('optimiza una portada al formato WebP antes de almacenarla', async () => {
  const original = await sharp({
    create: { width: 1600, height: 2200, channels: 3, background: '#f2705b' },
  }).jpeg({ quality: 95 }).toBuffer();
  let uploaded;
  let updated;
  const repository = {
    lockBook: async () => ({ id: 7 }),
    updateCover: async (...args) => { updated = args; },
    addMovement: async () => {},
  };
  const storage = {
    upload: async (input) => { uploaded = input; return input.objectPath; },
  };
  const service = createAdminService({ repository, storage, coversBucket: 'covers', digitalBucket: 'digital' });

  await service.uploadCover(7, { buffer: original, mimetype: 'image/jpeg' }, {
    id: 1, rol: 'administrador', nombre_completo: 'Admin',
  });

  const metadata = await sharp(uploaded.buffer).metadata();
  assert.equal(uploaded.contentType, 'image/webp');
  assert.match(uploaded.objectPath, /^7\/.+\.webp$/);
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 800);
  assert.equal(metadata.height, 1100);
  assert.deepEqual(updated.slice(1), [uploaded.objectPath, 'image/webp']);
});

test('permite editar libros que tienen campos opcionales vacíos en la base', async () => {
  let saved;
  const repository = {
    transaction: async (callback) => callback({}),
    lockBook: async () => ({ id: 7 }),
    committedQuantity: async () => 0,
    updateBook: async (_tx, _id, input) => { saved = input; return { id: 7, ...input }; },
    syncAuthors: async () => {},
    addMovement: async () => {},
  };
  const service = createAdminService({ repository });

  await service.updateBook(7, {
    id_libro_texto: 'BJM-007', tipo_material: 'libro', tipo_material_otro: null,
    genero: 'narrativa', genero_otro: null, titulo: 'Cumandá', descripcion: null,
    anio_publicacion: null, cantidad_total: 2, autores: ['Juan León Mera'], activo: true,
  }, { id: 1, rol: 'administrador', nombre_completo: 'Admin' });

  assert.equal(saved.tipo_material_otro, '');
  assert.equal(saved.genero_otro, '');
  assert.equal(saved.descripcion, '');
  assert.equal(saved.anio_publicacion, null);
});
