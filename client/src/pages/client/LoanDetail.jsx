import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clientApi } from '../../api.js';
import { formatDate, formatDateTime, stateClass, stateLabel } from '../../lib/format.js';

export default function LoanDetail() {
  const { id } = useParams(); const [item, setItem] = useState(null); const [error, setError] = useState('');
  useEffect(() => { clientApi.get(`/clientes/me/prestamos/${id}`).then(({ data }) => setItem(data.item)).catch((requestError) => setError(requestError.response?.data?.message || 'No pudimos cargar el registro.')); }, [id]);
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div><Link to="/mi-cuenta/prestamos" className="back-link">Volver</Link></div>;
  if (!item) return <div className="page-loader"><span className="spinner-border text-success" /></div>;
  return <div className="container py-4 py-md-5 client-account-page">
    <Link to="/mi-cuenta/prestamos" className="back-link"><i className="fas fa-arrow-left me-2" />Mi actividad</Link>
    <div className="card account-detail-card mt-3"><div className="card-body p-4 p-md-5">
      <div className="d-flex flex-wrap justify-content-between gap-3"><div><span className="eyebrow">Registro bibliotecario</span><h1>{item.codigo}</h1></div><span className={`badge bg-${stateClass(item.estado)} account-state`}>{stateLabel(item.estado)}</span></div>
      {item.estado === 'listo_retiro' && <div className="alert alert-info mt-4 mb-0"><i className="fas fa-bell me-2" /><strong>Ya puedes retirar los materiales aprobados hasta {formatDateTime(item.fecha_expiracion_retiro)}.</strong> Revisa cada línea antes de acercarte.</div>}
      {item.estado === 'expirado' && <div className="alert alert-secondary mt-4 mb-0"><i className="fas fa-clock me-2" />El plazo de retiro terminó y los ejemplares fueron liberados.</div>}
      <dl className="account-detail-dates"><div><dt>Solicitud</dt><dd>{formatDateTime(item.fecha_solicitud)}</dd></div><div><dt>Entrega</dt><dd>{formatDateTime(item.fecha_entrega)}</dd></div><div><dt>Fecha límite</dt><dd>{formatDate(item.fecha_limite)}</dd></div><div><dt>Devolución</dt><dd>{formatDateTime(item.fecha_devolucion)}</dd></div></dl>
      <h2 className="h5 mt-4">Decisión por material</h2>
      <div className="account-detail-books">{item.detalles.map((detail) => <article className={`detail-review-${detail.estado_revision}`} key={detail.id}>
        <i className={`fas ${detail.estado_revision === 'rechazado' ? 'fa-circle-xmark' : detail.estado_revision === 'aprobado' ? 'fa-circle-check' : 'fa-clock'}`} />
        <div><strong>{detail.titulo}</strong><small>ID: {detail.id_libro_texto}</small>{detail.motivo_rechazo && <small className="detail-review-reason">{detail.motivo_rechazo}</small>}{detail.incidencias?.map((incident) => <small className="detail-review-reason" key={incident.id}>Incidencia: {incident.tipo.replace('_', ' ')} ({incident.cantidad}) · {incident.estado}{incident.resolucion ? ` como ${incident.resolucion}` : ''}</small>)}</div>
        <span>{detail.estado_revision === 'pendiente' ? `${detail.cantidad_solicitada} pendiente(s)` : detail.estado_revision === 'rechazado' ? `0 de ${detail.cantidad_solicitada} aprobados` : `${detail.cantidad_aprobada} de ${detail.cantidad_solicitada} aprobados · ${detail.cantidad_devuelta} devueltos`}</span>
      </article>)}</div>
    </div></div>
  </div>;
}
