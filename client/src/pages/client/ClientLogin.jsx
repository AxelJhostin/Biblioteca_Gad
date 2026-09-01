import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useClientAuth } from '../../state/ClientAuthContext.jsx';
import { numericInput } from '../../lib/requestValidation.js';

export default function ClientLogin() {
  const { user, login } = useClientAuth();
  const [form, setForm] = useState({ identificacion: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  if (user) return <Navigate to={user.debe_cambiar_password ? '/mi-cuenta/seguridad' : location.state?.from?.pathname || '/'} replace />;

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const nextUser = await login(form.identificacion, form.password);
      const destination = nextUser.debe_cambiar_password ? '/mi-cuenta/seguridad' : location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No pudimos iniciar sesión.');
    } finally { setLoading(false); }
  };

  return <section className="client-auth-page"><div className="client-auth-card"><Link to="/" className="back-link"><i className="fas fa-arrow-left me-2" />Volver al catálogo</Link><div className="client-auth-heading"><span className="client-auth-icon"><i className="fas fa-user" /></span><span className="eyebrow">Cliente / usuario</span><h1>Ingresa a tu biblioteca</h1><p>Usa tu cédula para solicitar libros físicos y revisar tus préstamos.</p></div>{error && <div className="alert alert-danger" role="alert">{error}</div>}<form onSubmit={submit}><label className="form-label" htmlFor="client-login-id">Cédula</label><input id="client-login-id" className="form-control" inputMode="numeric" maxLength="10" autoComplete="username" value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: numericInput(e.target.value, 10) })} required /><label className="form-label mt-3" htmlFor="client-login-password">Contraseña</label><input id="client-login-password" type="password" className="form-control" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><button className="btn btn-primary w-100 py-3 mt-4" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button></form><div className="client-auth-links"><span>¿Primera vez? <Link to="/cuenta/registro">Crear cuenta</Link></span><span>¿Ya tienes historial? <Link to="/cuenta/activar">Activar cuenta</Link></span></div><div className="staff-access-note"><i className="fas fa-id-badge" /><div><strong>¿Trabajas en la biblioteca?</strong><Link to="/personal/login">Ingresar como personal</Link></div></div></div></section>;
}
