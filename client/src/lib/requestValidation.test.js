import { describe, expect, it } from 'vitest';
import { normalizeRequestClient, numericInput, personNameInput, serverFieldErrors, validateLoanRequest } from './requestValidation.js';

describe('validación de solicitudes', () => {
  it('explica que teléfono o correo es obligatorio', () => {
    const result = validateLoanRequest({
      identificacion: '1300000001', nombre_completo: 'Cliente de prueba', telefono: '', correo: '',
    }, [{ id: 1 }]);

    expect(result.errors.telefono).toContain('teléfono o un correo');
  });

  it('normaliza los datos y acepta un teléfono válido', () => {
    const result = validateLoanRequest({
      identificacion: ' 1300000001 ', nombre_completo: ' Ana   Lectora ', telefono: '0991234567', correo: '',
    }, [{ id: 1 }]);

    expect(result.errors).toEqual({});
    expect(result.value).toEqual({ identificacion: '1300000001', nombre_completo: 'Ana Lectora', telefono: '0991234567', correo: '' });
  });

  it('convierte los errores de la API en mensajes por campo', () => {
    expect(serverFieldErrors({ errors: [{ field: 'cliente.correo', message: 'Correo inválido.' }] })).toEqual({ correo: 'Correo inválido.' });
  });

  it('normaliza correo e identificación antes de enviar', () => {
    expect(normalizeRequestClient({ identificacion: ' 1300000001 ', nombre_completo: ' Ana ', telefono: '', correo: ' A@B.COM ' }))
      .toMatchObject({ identificacion: '1300000001', nombre_completo: 'Ana', correo: 'a@b.com' });
  });

  it('elimina letras de cédula y teléfono al escribir o pegar', () => {
    expect(numericInput('13A00-000001XYZ', 10)).toBe('1300000001');
    expect(numericInput('09AB9123-4567', 10)).toBe('0991234567');
  });

  it('elimina números del nombre y conserva caracteres personales válidos', () => {
    expect(personNameInput("María2 José O'Connor-Álava3")).toBe("María José O'Connor-Álava");
  });

  it('acepta celular y fijo ecuatorianos y rechaza otros formatos', () => {
    const base = { identificacion: '1300000001', nombre_completo: 'Ana Lectora', correo: '' };
    expect(validateLoanRequest({ ...base, telefono: '0991234567' }, [{ id: 1 }]).errors.telefono).toBeUndefined();
    expect(validateLoanRequest({ ...base, telefono: '052123456' }, [{ id: 1 }]).errors.telefono).toBeUndefined();
    expect(validateLoanRequest({ ...base, telefono: '0812345678' }, [{ id: 1 }]).errors.telefono).toContain('ecuatoriano');
  });
});
