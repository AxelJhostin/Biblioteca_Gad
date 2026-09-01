import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';
import { cleanText, normalizeDocument } from '../../core/validation.js';

const identification = z.string().transform(normalizeDocument).pipe(
  z.string().regex(/^\d{10}$/, 'La cédula debe contener exactamente 10 dígitos numéricos.'),
);
const name = z.string().transform(cleanText).pipe(z.string()
  .min(3, 'Ingresa tu nombre completo.')
  .max(180, 'El nombre no puede superar 180 caracteres.')
  .regex(/^[\p{L}]+(?:[\s.'’-][\p{L}]+)*$/u, 'El nombre solo puede contener letras, espacios, apóstrofes, puntos o guiones.'));
const phone = z.string().optional().default('').transform(cleanText).pipe(z.string().refine(
  (value) => !value || /^09\d{8}$/.test(value) || /^0[2-7]\d{7}$/.test(value),
  'Ingresa un número ecuatoriano válido.',
));
const email = z.string().optional().default('').transform((value) => cleanText(value).toLowerCase()).pipe(
  z.union([z.literal(''), z.email('Ingresa un correo electrónico válido.')]),
);
const password = z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(120);

const contactFields = z.object({ telefono: phone, correo: email }).superRefine((value, ctx) => {
  if (!value.telefono && !value.correo) {
    ctx.addIssue({ code: 'custom', path: ['telefono'], message: 'Ingresa un teléfono o un correo.' });
  }
});

const registrationSchema = z.object({
  identificacion: identification,
  nombre_completo: name,
  telefono: phone,
  correo: email,
  password,
  confirmar_password: z.string(),
}).superRefine((value, ctx) => {
  if (!value.telefono && !value.correo) ctx.addIssue({ code: 'custom', path: ['telefono'], message: 'Ingresa un teléfono o un correo.' });
  if (value.password !== value.confirmar_password) ctx.addIssue({ code: 'custom', path: ['confirmar_password'], message: 'Las contraseñas no coinciden.' });
});

const activationSchema = z.object({
  identificacion: identification,
  contacto: z.string().transform(cleanText).pipe(z.string().min(3, 'Ingresa el teléfono o correo registrado.').max(180)),
  codigo: z.string().transform(cleanText).pipe(z.string().min(5, 'Ingresa el código de una solicitud anterior.').max(80)),
  password,
  confirmar_password: z.string(),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmar_password) ctx.addIssue({ code: 'custom', path: ['confirmar_password'], message: 'Las contraseñas no coinciden.' });
});

const loginSchema = z.object({ identificacion: identification, password: z.string().min(1) });
const passwordChangeSchema = z.object({
  password_actual: z.string().min(1, 'Ingresa tu contraseña actual.'),
  password_nuevo: password,
  confirmar_password: z.string(),
}).superRefine((value, ctx) => {
  if (value.password_nuevo !== value.confirmar_password) ctx.addIssue({ code: 'custom', path: ['confirmar_password'], message: 'Las contraseñas no coinciden.' });
  if (value.password_actual === value.password_nuevo) ctx.addIssue({ code: 'custom', path: ['password_nuevo'], message: 'La nueva contraseña debe ser diferente.' });
});

const staffPasswordSchema = z.object({ password }).passthrough();

const genericCredentials = () => new AppError('Credenciales incorrectas o cuenta inactiva.', 401, 'INVALID_CLIENT_CREDENTIALS');
const activationError = () => new AppError('No pudimos verificar los datos. Acércate a la biblioteca para activar tu cuenta.', 422, 'ACTIVATION_NOT_VERIFIED');

function clientUser(account) {
  return {
    id: account.id,
    cliente_id: account.cliente_id,
    identificacion: account.identificacion,
    nombre_completo: account.nombre_completo,
    telefono: account.telefono || '',
    correo: account.correo || '',
    rol: 'cliente',
    debe_cambiar_password: Boolean(account.debe_cambiar_password),
    version_sesion: Number(account.version_sesion),
  };
}

export function createClientAuthService({ repository, jwtSecret, jwtTtl }) {
  const dummyHash = bcrypt.hash('comparacion-invalida-segura', 12);
  const sign = (account) => jwt.sign({
    sub: String(account.id), role: 'cliente', type: 'cliente', ver: Number(account.version_sesion),
  }, jwtSecret, { expiresIn: jwtTtl });

  return {
    async register(payload) {
      const input = registrationSchema.parse(payload);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const account = await repository.transaction(async (tx) => {
        const existing = await repository.findClientForUpdate(tx, input.identificacion);
        if (existing) {
          throw new ConflictError('No fue posible crear la cuenta con esos datos. Si ya tienes historial, usa Activar cuenta.', 'CLIENT_REGISTRATION_CONFLICT');
        }
        const client = await repository.createClient(tx, input);
        const created = await repository.createAccount(tx, { clientId: client.id, passwordHash });
        return { ...client, ...created };
      });
      const user = clientUser(account);
      return { token: sign(account), user };
    },

    async activate(payload) {
      const input = activationSchema.parse(payload);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const account = await repository.transaction(async (tx) => {
        const client = await repository.findClientForUpdate(tx, input.identificacion);
        if (!client || client.cuenta_id) throw activationError();
        const contact = input.contacto.toLowerCase();
        const contactMatches = [client.telefono, client.correo?.toLowerCase()].filter(Boolean).includes(contact);
        const codeMatches = contactMatches && await repository.hasPreviousLoanCode(tx, client.id, input.codigo);
        if (!codeMatches) throw activationError();
        const created = await repository.createAccount(tx, { clientId: client.id, passwordHash });
        return { ...client, ...created };
      });
      const user = clientUser(account);
      return { token: sign(account), user };
    },

    async login(payload) {
      const input = loginSchema.parse(payload);
      const account = await repository.findAccountByIdentification(input.identificacion);
      const hash = account?.password_hash || await dummyHash;
      const matches = await bcrypt.compare(input.password, hash);
      const blocked = account?.bloqueado_hasta && new Date(account.bloqueado_hasta) > new Date();
      if (!account || !account.estado || blocked || !matches) {
        if (account && !blocked) await repository.recordFailedAttempt(account.id);
        throw genericCredentials();
      }
      await repository.markLogin(account.id);
      const fresh = { ...account, intentos_fallidos: 0, bloqueado_hasta: null };
      return { token: sign(fresh), user: clientUser(fresh) };
    },

    verify(token) {
      try { return jwt.verify(token, jwtSecret); } catch { return null; }
    },

    async getSessionAccount(payload) {
      if (!payload || payload.type !== 'cliente' || payload.role !== 'cliente') return null;
      const account = await repository.findActiveById(payload.sub);
      if (!account || Number(payload.ver) !== Number(account.version_sesion)) return null;
      return account;
    },

    async changePassword(account, payload) {
      const input = passwordChangeSchema.parse(payload);
      if (!(await bcrypt.compare(input.password_actual, account.password_hash))) {
        throw new AppError('La contraseña actual es incorrecta.', 401, 'CURRENT_PASSWORD_INVALID');
      }
      const updated = await repository.updatePassword(account.id, await bcrypt.hash(input.password_nuevo, 12));
      if (!updated) throw genericCredentials();
      const fresh = { ...account, ...updated };
      return { token: sign(fresh), user: clientUser(fresh) };
    },

    getProfile: (account) => clientUser(account),

    async updateProfile(account, payload) {
      const input = contactFields.parse(payload);
      const profile = await repository.updateProfile(account.cliente_id, input);
      if (!profile) throw new NotFoundError('Cliente no encontrado.');
      return { ...clientUser(account), ...profile, rol: 'cliente' };
    },

    listLoans: (account) => repository.listLoans(account.cliente_id),

    async getLoan(account, id) {
      const loan = await repository.findLoan(account.cliente_id, id);
      if (!loan) throw new NotFoundError('Préstamo no encontrado.');
      return loan;
    },

    async getLoanByCode(account, code) {
      const reference = await repository.findLoanByCode(account.cliente_id, cleanText(code));
      if (!reference) throw new NotFoundError('Solicitud no encontrada.');
      return this.getLoan(account, reference.id);
    },

    listClients: (filters) => repository.listClients(cleanText(filters?.search)),

    async staffActivate(clientId, payload, staff) {
      const { password: temporaryPassword } = staffPasswordSchema.parse(payload);
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      return repository.transaction(async (tx) => {
        const client = await repository.findClientByIdForUpdate(tx, clientId);
        if (!client) throw new NotFoundError('Cliente no encontrado.');
        if (client.cuenta_id) throw new ConflictError('El cliente ya tiene una cuenta.', 'CLIENT_ACCOUNT_EXISTS');
        const account = await repository.createAccount(tx, { clientId: client.id, passwordHash, mustChange: true });
        await repository.addMovement(tx, {
          tipo_actor: staff.rol, cliente_id: client.id, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, detalle: `Cuenta de cliente activada para cédula terminada en ${client.identificacion.slice(-4)}.`,
        });
        return { ...account, identificacion: client.identificacion, nombre_completo: client.nombre_completo };
      });
    },

    async staffReset(clientId, payload, staff) {
      const { password: temporaryPassword } = staffPasswordSchema.parse(payload);
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      return repository.transaction(async (tx) => {
        const client = await repository.findClientByIdForUpdate(tx, clientId);
        if (!client) throw new NotFoundError('Cliente no encontrado.');
        if (!client.cuenta_id) throw new ValidationError('El cliente todavía no tiene una cuenta activa.');
        const account = await repository.resetClientPassword(tx, client.cuenta_id, passwordHash);
        await repository.addMovement(tx, {
          tipo_actor: staff.rol, cliente_id: client.id, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, detalle: `Contraseña de cliente restablecida para cédula terminada en ${client.identificacion.slice(-4)}.`,
        });
        return { ...account, identificacion: client.identificacion, nombre_completo: client.nombre_completo };
      });
    },
  };
}
