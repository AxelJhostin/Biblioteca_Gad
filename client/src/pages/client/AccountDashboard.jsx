import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientApi } from '../../api.js';
import { useClientAuth } from '../../state/ClientAuthContext.jsx';
import { formatDate, stateClass } from '../../lib/format.js';

export default function AccountDashboard() {
  const { user } = useClientAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { clientApi.get('/clientes/me/prestamos').then(({ data }) => setLoans(data.items)).finally(() => setLoading(false)); }, []);
  const active = loans.filter((item) => ['pendiente', 'activo', 'atrasado'].includes(item.estado));
  return <div className="container py-4 py-md-5 client-account-page"><section className="account-welcome"><div><span className="eyebrow">Mi cuenta</span><h1>Hola, {user.nombre_completo.split(' ')[0]}</h1><p>Revisa tus materiales y mantén tus datos actualizados.</p></div><span className="account-avatar">{user.nombre_completo.charAt(0)}</span></section><div className="account-shortcuts"><Link to="/mi-cuenta/prestamos" className="account-shortcut"><i className="fas fa-clock-rotate-left" /><span><strong>Mi actividad</strong><small>{loans.length} registro(s)</small></span></Link><Link to="/solicitud" className="account-shortcut"><i className="fas fa-book-open-reader" /><span><strong>Nueva solicitud</strong><small>Revisar selección</small></span></Link><Link to="/mi-cuenta/perfil" className="account-shortcut"><i className="fas fa-address-card" /><span><strong>Mi perfil</strong><small>Contacto y seguridad</small></span></Link></div><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Requieren tu atención</h2><Link to="/mi-cuenta/prestamos">Ver historial</Link></div>{loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : !active.length ? <div className="card"><div className="card-body p-4 text-center text-muted">No tienes solicitudes ni préstamos abiertos.</div></div> : <div className="account-loan-grid">{active.map((loan) => <Link to={`/mi-cuenta/prestamos/${loan.id}`} className="card account-loan-card" key={loan.id}><div className="card-body"><div className="d-flex justify-content-between"><strong>{loan.codigo}</strong><span className={`badge bg-${stateClass(loan.estado)}`}>{loan.estado}</span></div><h3>{loan.detalles.map((item) => item.titulo).join(', ')}</h3><small>{loan.fecha_limite ? `Fecha límite: ${formatDate(loan.fecha_limite)}` : 'En revisión por la biblioteca'}</small></div></Link>)}</div>}</div>;
}
