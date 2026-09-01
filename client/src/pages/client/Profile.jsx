import { useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { clientApi } from '../../api.js';
import { useClientAuth } from '../../state/ClientAuthContext.jsx';
import { numericInput, serverFieldErrors } from '../../lib/requestValidation.js';

export default function Profile() {
  const { user, updateUser } = useClientAuth();
  const [form, setForm] = useState({ telefono: user.telefono || '', correo: user.correo || '' });
  const [errors, setErrors] = useState({}); const [loading, setLoading] = useState(false);
  const submit = async (event) => { event.preventDefault(); setLoading(true); try { const { data } = await clientApi.patch('/clientes/me', form); updateUser({ ...user, ...data.item }); Swal.fire({ icon: 'success', title: 'Perfil actualizado', confirmButtonColor: '#3FAE9A' }); } catch (error) { setErrors(serverFieldErrors(error.response?.data)); } finally { setLoading(false); } };
  return <div className="container py-4 py-md-5 client-account-page"><Link to="/mi-cuenta" className="back-link"><i className="fas fa-arrow-left me-2" />Mi cuenta</Link><div className="card account-form-card mt-3"><div className="card-body p-4 p-md-5"><span className="eyebrow">Datos personales</span><h1>Mi perfil</h1><p className="text-muted">Tu cédula y nombre están protegidos. El personal puede ayudarte si requieren corrección.</p><div className="profile-locked"><div><small>Cédula</small><strong>{user.identificacion}</strong></div><div><small>Nombre completo</small><strong>{user.nombre_completo}</strong></div></div><form onSubmit={submit}><label className="form-label mt-4" htmlFor="profile-phone">Teléfono ecuatoriano</label><input id="profile-phone" className={`form-control${errors.telefono ? ' is-invalid' : ''}`} inputMode="numeric" maxLength="10" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: numericInput(e.target.value, 10) })} />{errors.telefono && <div className="invalid-feedback">{errors.telefono}</div>}<label className="form-label mt-3" htmlFor="profile-email">Correo</label><input id="profile-email" className={`form-control${errors.correo ? ' is-invalid' : ''}`} type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />{errors.correo && <div className="invalid-feedback">{errors.correo}</div>}<button className="btn btn-primary mt-4" disabled={loading}>{loading ? 'Guardando…' : 'Guardar cambios'}</button><Link to="/mi-cuenta/seguridad" className="btn btn-light mt-4 ms-2">Cambiar contraseña</Link></form></div></div></div>;
}
