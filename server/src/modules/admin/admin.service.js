import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { z } from 'zod';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';
import { cleanText } from '../../core/validation.js';

const bookSchema = z.object({
  id_libro_texto: z.string().min(1).max(120),
  tipo_material: z.enum(['libro', 'revista', 'folleto', 'tesis', 'otro']),
  tipo_material_otro: z.string().max(100).nullish().transform((value) => value ?? ''),
  genero: z.enum(['lirico', 'poesia', 'narrativa', 'ensayo', 'otro']),
  genero_otro: z.string().max(100).nullish().transform((value) => value ?? ''),
  titulo: z.string().min(1).max(260),
  descripcion: z.string().max(5000).nullish().transform((value) => value ?? ''),
  anio_publicacion: z.union([z.literal(''), z.null(), z.coerce.number().int().min(1000).max(2200)]).optional(),
  cantidad_total: z.coerce.number().int().min(0),
  autores: z.array(z.string().transform(cleanText).pipe(z.string()
    .min(2, 'Cada autor debe tener al menos 2 caracteres.')
    .max(180, 'Cada autor puede tener hasta 180 caracteres.'))).min(1, 'Ingresa al menos un autor.').max(20),
  activo: z.boolean().optional().default(true),
}).superRefine((value, ctx) => {
  if (value.tipo_material === 'otro' && !cleanText(value.tipo_material_otro)) {
    ctx.addIssue({ code: 'custom', path: ['tipo_material_otro'], message: 'Describa el tipo de material.' });
  }
  if (value.genero === 'otro' && !cleanText(value.genero_otro)) {
    ctx.addIssue({ code: 'custom', path: ['genero_otro'], message: 'Describa el género.' });
  }
});

const staffSchema = z.object({
  nombre_completo: z.string().min(3).max(180),
  usuario: z.string().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
  rol: z.enum(['bibliotecario', 'administrador']),
  estado: z.boolean().optional().default(true),
});

function normalizeBook(payload) {
  const input = bookSchema.parse(payload);
  return {
    ...input,
    id_libro_texto: cleanText(input.id_libro_texto),
    titulo: cleanText(input.titulo),
    descripcion: cleanText(input.descripcion),
    tipo_material_otro: cleanText(input.tipo_material_otro),
    genero_otro: cleanText(input.genero_otro),
    autores: [...new Set(input.autores.map(cleanText).filter(Boolean))],
    anio_publicacion: input.anio_publicacion || null,
  };
}

export function createAdminService({ repository, storage, coversBucket, digitalBucket }) {
  return {
    async createBook(payload, staff) {
      const input = normalizeBook(payload);
      return repository.transaction(async (tx) => {
        const book = await repository.createBook(tx, input);
        await repository.syncAuthors(tx, book.id, input.autores);
        await repository.addMovement(tx, {
          tipo: 'ingreso_libro', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, libro_id: book.id,
          detalle: `Ingreso de “${book.titulo}” con ${book.cantidad_total} ejemplar(es).`,
        });
        return book;
      });
    },
    async updateBook(id, payload, staff) {
      const input = normalizeBook(payload);
      return repository.transaction(async (tx) => {
        const current = await repository.lockBook(tx, id);
        if (!current) throw new NotFoundError('Libro no encontrado.');
        const committed = await repository.committedQuantity(tx, id);
        const unavailable = Number(current.cantidad_no_disponible || 0);
        if (input.cantidad_total < committed + unavailable) {
          throw new ConflictError(`La cantidad total no puede ser menor a ${committed + unavailable}: ${committed} están comprometidos y ${unavailable} fuera de circulación.`, 'QUANTITY_BELOW_COMMITTED');
        }
        if (!input.activo && committed > 0) {
          throw new ConflictError('No puede desactivar un material con solicitudes o préstamos abiertos.', 'BOOK_HAS_OPEN_LOANS');
        }
        const book = await repository.updateBook(tx, id, input);
        await repository.syncAuthors(tx, id, input.autores);
        await repository.addMovement(tx, {
          tipo: 'edicion_libro', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, libro_id: book.id,
          detalle: `Edición de “${book.titulo}”.`,
        });
        return book;
      });
    },
    async uploadCover(id, file, staff) {
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        throw new ValidationError('Seleccione una portada JPG, PNG o WebP.');
      }
      const current = await repository.lockBook(null, id);
      if (!current) throw new NotFoundError('Libro no encontrado.');
      let optimizedCover;
      try {
        optimizedCover = await sharp(file.buffer)
          .rotate()
          .resize({ width: 800, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
      } catch {
        throw new ValidationError('No pudimos procesar la imagen de portada. Seleccione una imagen válida.');
      }
      const storagePath = await storage.upload({
        bucket: coversBucket, objectPath: `${id}/${Date.now()}-${crypto.randomUUID()}.webp`,
        buffer: optimizedCover, contentType: 'image/webp',
      });
      await repository.updateCover(id, storagePath, 'image/webp');
      await repository.addMovement(null, {
        tipo: 'edicion_libro', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
        actor_nombre: staff.nombre_completo, libro_id: id, detalle: 'Actualización de portada.',
      });
      return { storagePath };
    },
    async uploadDigital(id, file, staff) {
      if (!file || file.mimetype !== 'application/pdf') throw new ValidationError('Seleccione un archivo PDF.');
      if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new ValidationError('El archivo no contiene una estructura PDF válida.');
      }
      const current = await repository.lockBook(null, id);
      if (!current) throw new NotFoundError('Libro no encontrado.');
      const storagePath = await storage.upload({
        bucket: digitalBucket, objectPath: `${id}/${Date.now()}-${crypto.randomUUID()}.pdf`,
        buffer: file.buffer, contentType: file.mimetype,
      });
      await repository.transaction(async (tx) => {
        await repository.replaceDigital(tx, id, {
          originalName: file.originalname, storagePath, mimeType: file.mimetype, size: file.size,
        });
        await repository.addMovement(tx, {
          tipo: 'edicion_libro', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, libro_id: id, detalle: 'Actualización de archivo digital.',
        });
      });
      return { storagePath };
    },
    listStaff: () => repository.listStaff(),
    async createStaff(payload) {
      const input = staffSchema.extend({ password: z.string().min(10).max(120) }).parse(payload);
      return repository.createStaff({
        ...input,
        nombre_completo: cleanText(input.nombre_completo),
        usuario: cleanText(input.usuario),
        password_hash: await bcrypt.hash(input.password, 12),
      });
    },
    async updateStaff(id, payload) {
      const input = staffSchema.parse(payload);
      const item = await repository.updateStaff(id, {
        ...input, nombre_completo: cleanText(input.nombre_completo), usuario: cleanText(input.usuario),
      });
      if (!item) throw new NotFoundError('Cuenta no encontrada.');
      return item;
    },
    async resetPassword(id, password) {
      if (String(password || '').length < 10) throw new ValidationError('La nueva contraseña debe tener al menos 10 caracteres.');
      const item = await repository.resetPassword(id, await bcrypt.hash(password, 12));
      if (!item) throw new NotFoundError('Bibliotecario no encontrado.');
      return item;
    },
  };
}
