import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClientAuth } from '../../state/ClientAuthContext.jsx';
import { numericInput, personNameInput, serverFieldErrors } from '../../lib/requestValidation.js';

export default function Register() {
  const { register } = useClientAuth();
  const [form, setForm] = useState({ identificacion: '', nombre_completo: '', telefono: '', correo: '', password: '', confirmar_password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const change = (field, value) => { setForm({ ...form, [field]: value }); setErrors({ ...errors, [field]: undefined }); setMessage(''); };
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setMessage('');
    try { await register(form); navigate('/mi-cuenta', { replace: true }); }
    catch (error) { setErrors(serverFieldErrors(error.response?.data)); setMessage(error.response?.data?.message || 'No pudimos crear la cuenta.'); }
    finally { setLoading(false); }
  };
  const field = (name) => `form-control${errors[name] ? ' is-invalid' : ''}`;
  const feedback = (name) => errors[name] && <div className="invalid-feedback">{errors[name]}</div>;
  return <section className="client-auth-page"><div className="client-auth-card wide"><Link to="/cuenta/login" className="back-link"><i className="fas fa-arrow-left me-2" />Ya tengo cuenta</Link><div className="client-auth-heading"><span className="client-auth-icon"><i className="fas fa-user-plus" /></span><span className="eyebrow">Registro gratuito</span><h1>Crea tu cuenta</h1><p>La necesitarás únicamente para solicitar materiales físicos.</p></div>{message && <div className="alert alert-danger" role="alert">{message}</div>}<form onSubmit={submit} noValidate><div className="row g-3"><div className="col-md-6"><label className="form-label" htmlFor="register-id">Cédula</label><input id="register-id" className={field('identificacion')} inputMode="numeric" maxLength="10" value={form.identificacion} onChange={(e) => change('identificacion', numericInput(e.target.value, 10))} />{feedback('identificacion')}</div><div className="col-md-6"><label className="form-label" htmlFor="register-name">Nombre completo</label><input id="register-name" className={field('nombre_completo')} maxLength="180" value={form.nombre_completo} onChange={(e) => change('nombre_completo', personNameInput(e.target.value))} />{feedback('nombre_completo')}</div><div className="col-md-6"><label className="form-label" htmlFor="register-phone">Teléfono ecuatoriano</label><input id="register-phone" className={field('telefono')} inputMode="numeric" maxLength="10" value={form.telefono} onChange={(e) => change('telefono', numericInput(e.target.value, 10))} />{feedback('telefono')}</div><div className="col-md-6"><label className="form-label" htmlFor="register-email">Correo</label><input id="register-email" type="email" className={field('correo')} value={form.correo} onChange={(e) => change('correo', e.target.value)} />{feedback('correo')}</div><div className="col-md-6"><label className="form-label" htmlFor="register-password">Contraseña</label><input id="register-password" type="password" className={field('password')} autoComplete="new-password" value={form.password} onChange={(e) => change('password', e.target.value)} /><div className="form-text">Mínimo 10 caracteres.</div>{feedback('password')}</div><div className="col-md-6"><label className="form-label" htmlFor="register-confirm">Confirmar contraseña</label><input id="register-confirm" type="password" className={field('confirmar_password')} autoComplete="new-password" value={form.confirmar_password} onChange={(e) => change('confirmar_password', e.target.value)} />{feedback('confirmar_password')}</div></div><button className="btn btn-primary w-100 py-3 mt-4" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear mi cuenta'}</button></form><p className="small text-muted mt-3 mb-0">Debes ingresar al menos un teléfono o correo. Si tu cédula ya tiene historial, usa <Link to="/cuenta/activar">Activar cuenta</Link>.</p></div></section>;
}
