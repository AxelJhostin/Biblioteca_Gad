import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clientApi } from '../../api.js';
import { formatDate, formatDateTime, stateClass } from '../../lib/format.js';

export default function LoanDetail() {
  const { id } = useParams(); const [item, setItem] = useState(null); const [error, setError] = useState('');
  useEffect(() => { clientApi.get(`/clientes/me/prestamos/${id}`).then(({ data }) => setItem(data.item)).catch((requestError) => setError(requestError.response?.data?.message || 'No pudimos cargar el registro.')); }, [id]);
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div><Link to="/mi-cuenta/prestamos" className="back-link">Volver</Link></div>;
  if (!item) return <div className="page-loader"><span className="spinner-border text-success" /></div>;
  return <div className="container py-4 py-md-5 client-account-page"><Link to="/mi-cuenta/prestamos" className="back-link"><i className="fas fa-arrow-left me-2" />Mi actividad</Link><div className="card account-detail-card mt-3"><div className="card-body p-4 p-md-5"><div className="d-flex flex-wrap justify-content-between gap-3"><div><span className="eyebrow">Registro bibliotecario</span><h1>{item.codigo}</h1></div><span className={`badge bg-${stateClass(item.estado)} account-state`}>{item.estado}</span></div><dl className="account-detail-dates"><div><dt>Solicitud</dt><dd>{formatDateTime(item.fecha_solicitud)}</dd></div><div><dt>Entrega</dt><dd>{formatDateTime(item.fecha_entrega)}</dd></div><div><dt>Fecha límite</dt><dd>{formatDate(item.fecha_limite)}</dd></div><div><dt>Devolución</dt><dd>{formatDateTime(item.fecha_devolucion)}</dd></div></dl><h2 className="h5 mt-4">Materiales</h2><div className="account-detail-books">{item.detalles.map((detail) => <article key={detail.id}><i className="fas fa-book" /><div><strong>{detail.titulo}</strong><small>ID: {detail.id_libro_texto}</small></div><span>{detail.cantidad_devuelta}/{detail.cantidad_solicitada} devueltos</span></article>)}</div></div></div></div>;
}
