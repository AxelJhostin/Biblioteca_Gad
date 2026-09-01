import { Link, useLocation, useParams } from 'react-router-dom';

export default function RequestConfirmation() {
  const { codigo } = useParams();
  const { state } = useLocation();
  const rejected = state?.rejected || state?.solicitud?.estado === 'rechazado';
  return <div className="container py-5"><div className="confirmation-card">
    <div className={`confirmation-icon ${rejected ? 'rejected' : ''}`}><i className={`fas ${rejected ? 'fa-circle-xmark' : 'fa-circle-check'}`} /></div>
    <span className="eyebrow">Solicitud {rejected ? 'no disponible' : 'registrada'}</span>
    <h1>{rejected ? 'El último ejemplar ya fue solicitado' : '¡Todo listo!'}</h1>
    <p>{rejected ? 'La solicitud quedó registrada como rechazada por falta de disponibilidad. No se creó una lista de espera.' : 'Presenta este código en la Biblioteca Municipal para que el personal revise y entregue el material.'}</p>
    <div className="request-code">{codigo}</div>
    <div className="d-flex flex-column flex-sm-row justify-content-center gap-2"><Link className="btn btn-primary" to="/mi-cuenta/prestamos">Ver en Mi cuenta</Link><Link className="btn btn-light" to="/">Volver al catálogo</Link></div>
  </div></div>;
}
