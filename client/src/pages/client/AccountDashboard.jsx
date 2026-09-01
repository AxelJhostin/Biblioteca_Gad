import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientApi } from '../../api.js';
import { useClientAuth } from '../../state/ClientAuthContext.jsx';
import { formatDate, stateClass, stateLabel } from '../../lib/format.js';

const stateHelp = {
  pendiente: 'La biblioteca todavía debe revisar esta solicitud.',
  listo_retiro: 'Tu solicitud fue aprobada. Acércate a la Biblioteca Municipal para retirar el material.',
  activo: 'El material fue entregado y está pendiente de devolución.',
  atrasado: 'La fecha límite pasó y debes acercarte a la biblioteca.',
};

export default function AccountDashboard() {
  const { user } = useClientAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { clientApi.get('/clientes/me/prestamos').then(({ data }) => setLoans(data.items)).finally(() => setLoading(false)); }, []);
  const current = loans.filter((item) => ['pendiente', 'listo_retiro', 'activo', 'atrasado'].includes(item.estado));
  const readyForPickup = loans.filter((item) => item.estado === 'listo_retiro');

  return <div className="container py-4 py-md-5 client-account-page">
    <section className="account-welcome"><div><span className="eyebrow">Tu cuenta de biblioteca</span><h1>Hola, {user.nombre_completo.split(' ')[0]}</h1><p>Desde aquí puedes revisar tus préstamos y actualizar tus datos.</p><small className="account-identification">Cédula: {user.identificacion}</small></div><span className="account-avatar">{user.nombre_completo.charAt(0)}</span></section>

    {!loading && readyForPickup.length > 0 && <section className="pickup-notification" role="status" aria-live="polite"><span className="pickup-notification-icon"><i className="fas fa-bell" /></span><div><span className="eyebrow">Aviso de la biblioteca</span><h2>¡Tu préstamo está listo para retirar!</h2><p>Acércate a la Biblioteca Municipal para recibir {readyForPickup.length === 1 ? 'el material aprobado' : 'los materiales aprobados'}.</p><div className="pickup-notification-items">{readyForPickup.map((loan) => <Link key={loan.id} to={`/mi-cuenta/prestamos/${loan.id}`}><strong>{loan.codigo}</strong><span>{loan.detalles.map((item) => item.titulo).join(', ')}</span><i className="fas fa-chevron-right" /></Link>)}</div></div></section>}

    <h2 className="h4 mb-3">¿Qué deseas hacer?</h2>
    <div className="account-main-actions">
      <Link to="/" className="account-main-action"><span className="account-action-icon coral"><i className="fas fa-magnifying-glass" /></span><span><strong>Buscar y seleccionar libros</strong><small>Regresa al catálogo para preparar una solicitud.</small></span><i className="fas fa-chevron-right" /></Link>
      <Link to="/mi-cuenta/prestamos" className="account-main-action"><span className="account-action-icon green"><i className="fas fa-book-open-reader" /></span><span><strong>Ver mis solicitudes y préstamos</strong><small>Consulta estados, fechas y materiales. Tienes {loans.length} registro(s).</small></span><i className="fas fa-chevron-right" /></Link>
      <Link to="/mi-cuenta/perfil" className="account-main-action"><span className="account-action-icon amber"><i className="fas fa-user-pen" /></span><span><strong>Actualizar mis datos o contraseña</strong><small>Cambia tu teléfono, correo o clave de acceso.</small></span><i className="fas fa-chevron-right" /></Link>
    </div>

    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mt-4 mb-3"><div><h2 className="h4 mb-1">Solicitudes actuales</h2><p className="text-muted small mb-0">Aquí aparecen únicamente las que todavía no han finalizado.</p></div><Link to="/mi-cuenta/prestamos" className="fw-bold">Ver historial completo</Link></div>
    {loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : !current.length ? <div className="card"><div className="card-body p-4 account-empty-current"><i className="fas fa-circle-check" /><div><strong>Todo está al día</strong><span>No tienes solicitudes pendientes ni libros por devolver.</span></div></div></div> : <div className="account-loan-grid">{current.map((loan) => <Link to={`/mi-cuenta/prestamos/${loan.id}`} className="card account-loan-card" key={loan.id}><div className="card-body"><div className="d-flex justify-content-between align-items-start gap-2"><strong>{loan.codigo}</strong><span className={`badge bg-${stateClass(loan.estado)}`}>{stateLabel(loan.estado)}</span></div><h3>{loan.detalles.map((item) => item.titulo).join(', ')}</h3><p>{stateHelp[loan.estado]}</p><small>{loan.fecha_limite ? `Fecha límite: ${formatDate(loan.fecha_limite)}` : loan.estado === 'listo_retiro' ? 'La fecha límite se define al retirar' : 'Sin fecha límite todavía'}</small></div></Link>)}</div>}
  </div>;
}
