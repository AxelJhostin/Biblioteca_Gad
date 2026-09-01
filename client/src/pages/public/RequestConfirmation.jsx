import { Link, useLocation, useParams } from 'react-router-dom';

export default function RequestConfirmation() {
  const { codigo } = useParams();
  const { state } = useLocation();
  const rejected = state?.rejected || state?.solicitud?.estado === 'rechazado';
  const partiallyRejected = !rejected && Number(state?.solicitud?.materiales_rechazados) > 0;
  return <div className="container py-5"><div className="confirmation-card">
    <div className={`confirmation-icon ${rejected ? 'rejected' : ''}`}><i className={`fas ${rejected ? 'fa-circle-xmark' : 'fa-circle-check'}`} /></div>
    <span className="eyebrow">Solicitud {rejected ? 'no disponible' : 'registrada'}</span>
    <h1>{rejected ? 'Los materiales ya no están disponibles' : partiallyRejected ? 'Solicitud registrada parcialmente' : '¡Todo listo!'}</h1>
    <p>{rejected ? 'Todos los materiales quedaron rechazados por falta de disponibilidad. No se creó una lista de espera.' : partiallyRejected ? `${state.solicitud.materiales_pendientes} material(es) quedaron pendientes de revisión y ${state.solicitud.materiales_rechazados} fueron rechazados automáticamente por falta de disponibilidad. Revisa el detalle en Mi cuenta.` : 'El personal revisará cada material y podrá aprobarlo total o parcialmente. Consulta la decisión en Mi cuenta.'}</p>
    <div className="request-code">{codigo}</div>
    <div className="d-flex flex-column flex-sm-row justify-content-center gap-2"><Link className="btn btn-primary" to="/mi-cuenta/prestamos">Ver en Mi cuenta</Link><Link className="btn btn-light" to="/">Volver al catálogo</Link></div>
  </div></div>;
}
