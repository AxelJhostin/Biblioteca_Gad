import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (user) navigate('/panel', { replace: true }); }, [user]);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await login(form.usuario, form.password); navigate('/panel'); }
    catch (requestError) { setError(requestError.response?.data?.message || 'No fue posible iniciar sesión.'); }
    finally { setLoading(false); }
  };
  return <div className="bg-auth"><div className="auth-shell">
    <div className="auth-hero"><span className="badge rounded-pill"><i className="fas fa-book me-2" />Biblioteca Municipal</span><h2>Administramos conocimiento,<br />preservamos historias.</h2><p>Panel interno para solicitudes, préstamos, catálogo y movimientos.</p><div className="feature"><i className="fas fa-shield-halved" />Acceso seguro por rol</div><div className="feature"><i className="fas fa-right-left" />Circulación controlada</div><div className="feature"><i className="fas fa-clock-rotate-left" />Historial de movimientos</div></div>
    <div className="auth-form"><div className="text-center mb-4"><div className="auth-logo"><img src="/assets/logo.jpg" alt="Logo municipal" /></div><h4 className="mt-3 mb-1">Acceso del personal</h4><p className="text-muted">Biblioteca Municipal de Jipijapa</p></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}><label className="form-label">Usuario</label><div className="input-group mb-3"><span className="input-group-text"><i className="fas fa-user" /></span><input className="form-control" required autoFocus value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></div><label className="form-label">Contraseña</label><div className="input-group mb-4"><span className="input-group-text"><i className="fas fa-lock" /></span><input className="form-control" required type={show ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button className="btn btn-outline-success" type="button" onClick={() => setShow(!show)}><i className="fas fa-eye" /></button></div><button className="btn btn-primary w-100 py-2" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button></form>
      <p className="small text-muted text-center mt-3">Las contraseñas de bibliotecarios solo pueden ser restablecidas por un administrador.</p><Link to="/" className="back-link d-block text-center">Volver al catálogo público</Link>
    </div>
  </div></div>;
}

