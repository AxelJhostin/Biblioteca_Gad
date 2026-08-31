import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useRequest } from '../../state/RequestContext.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function RequestLoan() {
  const { items, update, remove, clear } = useRequest();
  const [client, setClient] = useState({ identificacion: '', nombre_completo: '', telefono: '', correo: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/solicitudes', { cliente: client, items: items.map((item) => ({ libro_id: item.id, cantidad: item.cantidad })) });
      clear();
      navigate(`/solicitud/confirmacion/${data.solicitud.codigo}`, { state: { solicitud: data.solicitud, identificacion: client.identificacion } });
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.solicitud) {
        clear();
        navigate(`/solicitud/confirmacion/${response.solicitud.codigo}`, { state: { solicitud: response.solicitud, identificacion: client.identificacion, rejected: true } });
      } else setError(response?.message || 'No pudimos registrar la solicitud.');
    } finally { setLoading(false); }
  };

  return <div className="container py-5 request-page">
    <Link to="/" className="back-link"><i className="fas fa-arrow-left me-2" />Seguir explorando</Link>
    <div className="row g-4 mt-1">
      <div className="col-lg-7"><div className="card"><div className="card-body p-4"><h3 className="page-title">Tu solicitud</h3><p className="text-muted">Confirma las obras y cantidades que deseas retirar.</p>
        {items.length === 0 ? <EmptyState title="Tu solicitud está vacía" text="Añade al menos un libro desde el catálogo." /> : items.map((item) => <div className="request-item" key={item.id}><div><strong>{item.titulo}</strong><small>{item.id_libro_texto}</small></div><div className="d-flex align-items-center gap-2"><input className="form-control quantity-input" type="number" min="1" max={item.max} value={item.cantidad} onChange={(e) => update(item.id, Math.max(1, Math.min(item.max, Number(e.target.value))))} /><button className="btn btn-light text-danger" onClick={() => remove(item.id)}><i className="fas fa-trash" /></button></div></div>)}
      </div></div></div>
      <div className="col-lg-5"><form className="card" onSubmit={submit}><div className="card-body p-4"><h4>Datos del solicitante</h4><p className="text-muted small">No se creará una cuenta. Usaremos estos datos para gestionar el préstamo.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <label className="form-label">Identificación</label><input className="form-control mb-3" required value={client.identificacion} onChange={(e) => setClient({ ...client, identificacion: e.target.value })} />
        <label className="form-label">Nombre completo</label><input className="form-control mb-3" required value={client.nombre_completo} onChange={(e) => setClient({ ...client, nombre_completo: e.target.value })} />
        <label className="form-label">Teléfono</label><input className="form-control mb-3" value={client.telefono} onChange={(e) => setClient({ ...client, telefono: e.target.value })} />
        <label className="form-label">Correo (opcional)</label><input className="form-control mb-3" type="email" value={client.correo} onChange={(e) => setClient({ ...client, correo: e.target.value })} />
        <button className="btn btn-primary w-100 py-2" disabled={!items.length || loading}>{loading ? 'Registrando…' : 'Enviar solicitud'}</button>
      </div></form></div>
    </div>
  </div>;
}

