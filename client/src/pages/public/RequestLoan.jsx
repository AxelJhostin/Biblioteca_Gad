import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clientApi } from '../../api.js';
import { useRequest } from '../../state/RequestContext.jsx';
import { useClientAuth } from '../../state/ClientAuthContext.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function RequestLoan() {
  const { items, update, remove, clear } = useRequest();
  const { user, checking } = useClientAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const showError = (message) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!items.length) return showError('Añade al menos un libro antes de enviar la solicitud.');
    if (!user) return navigate('/cuenta/login', { state: { from: location } });
    setError(''); setLoading(true);
    try {
      const { data } = await clientApi.post('/clientes/me/solicitudes', {
        items: items.map((item) => ({ libro_id: item.id, cantidad: item.cantidad })),
      });
      clear();
      navigate(`/solicitud/confirmacion/${data.solicitud.codigo}`, { state: { solicitud: data.solicitud } });
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.solicitud) {
        clear();
        navigate(`/solicitud/confirmacion/${response.solicitud.codigo}`, { state: { solicitud: response.solicitud, rejected: true } });
      } else if (response?.code === 'PASSWORD_CHANGE_REQUIRED') {
        navigate('/mi-cuenta/seguridad');
      } else {
        showError(response?.errors?.[0]?.message || response?.message || 'No pudimos registrar la solicitud. Inténtalo nuevamente.');
      }
    } finally { setLoading(false); }
  };

  return <div className="container py-5 request-page">
    <Link to="/" className="back-link"><i className="fas fa-arrow-left me-2" />Seguir explorando</Link>
    <div className="row g-4 mt-1 request-layout">
      <div className="col-lg-7"><div className="card request-items-card"><div className="card-body p-4"><h3 className="page-title">Tu solicitud</h3><p className="text-muted">Confirma las obras y cantidades que deseas retirar.</p>
        {items.length === 0 ? <EmptyState title="Primero selecciona un libro" text="Aún no puedes enviar una solicitud. Regresa al catálogo y añade al menos un material disponible." action={<Link to="/" className="btn btn-primary"><i className="fas fa-book-open me-2" />Explorar catálogo</Link>} /> : items.map((item) => <div className="request-item" key={item.id}><div className="request-item-copy"><strong>{item.titulo}</strong><small>ID: {item.id_libro_texto}</small></div><div className="request-item-actions"><label className="visually-hidden" htmlFor={`request-quantity-${item.id}`}>Cantidad de {item.titulo}</label><input id={`request-quantity-${item.id}`} aria-label={`Cantidad de ${item.titulo}`} className="form-control quantity-input" type="number" inputMode="numeric" min="1" max={item.max} value={item.cantidad} onChange={(e) => update(item.id, Math.max(1, Math.min(item.max, Number(e.target.value) || 1)))} /><button type="button" className="btn btn-light text-danger remove-request-item" onClick={() => remove(item.id)} aria-label={`Quitar ${item.titulo} de la solicitud`}><i className="fas fa-trash" /></button></div></div>)}
      </div></div></div>
      <div className="col-lg-5"><form className="card request-form-card" onSubmit={submit}><div className="card-body p-4"><h4>Cuenta del solicitante</h4><p className="text-muted small">Las solicitudes físicas requieren una cuenta para proteger tu historial.</p>
        {error && <div ref={errorRef} className="alert alert-danger" role="alert" aria-live="assertive">{error}</div>}
        {checking ? <div className="text-center py-4"><span className="spinner-border text-success" /></div> : user ? <div className="request-profile"><span className="request-profile-icon"><i className="fas fa-user-check" /></span><div><strong>{user.nombre_completo}</strong><small>Cédula: {user.identificacion}</small><small>{user.telefono || user.correo}</small></div><Link to="/mi-cuenta/perfil">Editar</Link></div> : <div className="request-login-callout"><i className="fas fa-shield-halved" /><h5>Identifícate para continuar</h5><p>Conservaremos los libros seleccionados mientras ingresas o creas tu cuenta.</p><Link to="/cuenta/login" state={{ from: location }} className="btn btn-primary w-100">Ingresar</Link><Link to="/cuenta/registro" className="btn btn-outline-success w-100 mt-2">Crear cuenta</Link></div>}
        {!items.length && <div className="alert alert-warning request-empty-warning mt-3" role="status"><i className="fas fa-circle-info me-2" />Selecciona un material en el catálogo.</div>}
        <button type="submit" className="btn btn-primary w-100 py-3 mt-4 request-submit" disabled={!items.length || !user || loading}>{loading ? <><span className="spinner-border spinner-border-sm me-2" />Registrando…</> : !items.length ? 'Selecciona un libro primero' : user ? 'Enviar solicitud' : 'Ingresa para continuar'}</button>
      </div></form></div>
    </div>
  </div>;
}
