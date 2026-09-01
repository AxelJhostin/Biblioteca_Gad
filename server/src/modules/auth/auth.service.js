import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../core/errors.js';
import { cleanText } from '../../core/validation.js';

export function createAuthService({ repository, jwtSecret, jwtTtl }) {
  return {
    async login(input) {
      const login = cleanText(input?.usuario);
      const password = String(input?.password || '');
      if (!login || !password) throw new AppError('Usuario y contraseña son obligatorios.', 422, 'LOGIN_REQUIRED');

      const account = await repository.findByLogin(login);
      if (!account || !account.estado || !(await bcrypt.compare(password, account.password_hash))) {
        throw new AppError('Credenciales incorrectas o cuenta inactiva.', 401, 'INVALID_CREDENTIALS');
      }
      await repository.markLogin(account.id);
      const user = {
        id: account.id,
        nombre_completo: account.nombre_completo,
        usuario: account.usuario,
        rol: account.rol,
      };
      const token = jwt.sign({ sub: String(account.id), role: account.rol, type: 'personal' }, jwtSecret, { expiresIn: jwtTtl });
      return { token, user };
    },
    verify(token) {
      try {
        return jwt.verify(token, jwtSecret);
      } catch {
        return null;
      }
    },
    getUser(id) {
      return repository.findActiveById(id);
    },
  };
}
