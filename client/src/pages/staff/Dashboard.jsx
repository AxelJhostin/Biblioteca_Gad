import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { formatDateTime, stateClass } from '../../lib/format.js';

const cards = [
  ['solicitudes_pendientes', 'Solicitudes pendientes', 'fa-inbox', 'linear-gradient(135deg,#F2705B,#F4A259)'],
  ['prestamos_activos', 'Préstamos activos', 'fa-book-open-reader', 'linear-gradient(135deg,#3FAE9A,#2F8C7C)'],
  ['prestamos_atrasados', 'Préstamos atrasados', 'fa-clock', 'linear-gradient(135deg,#E05A5A,#B73E55)'],
  ['libros_catalogados', 'Materiales catalogados', 'fa-book', 'linear-gradient(135deg,#8C7AE6,#6554C0)'],
];
export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/dashboard').then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="page-loader"><span className="spinner-border text-success" /></div>;
  return <><PageHeader icon="fa-gauge-high" title="Inicio" subtitle="Resumen operativo de la Biblioteca Municipal" />
    <div className="row g-3 mb-4">{cards.map(([key, label, icon, gradient]) => <div className="col-sm-6 col-xl-3" key={key}><div className="stat-card" style={{ background: gradient }}><div><small>{label}</small><strong>{data.metrics[key]}</strong></div><i className={`fas ${icon}`} /></div></div>)}</div>
    <div className="card"><div className="card-header d-flex justify-content-between"><span>Requieren atención</span><Link to="/panel/solicitudes">Ver solicitudes</Link></div><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Código</th><th>Cliente</th><th>Materiales</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{data.attention.map((item) => <tr key={item.id}><td className="fw-bold">{item.codigo}</td><td>{item.nombre_completo}</td><td>{item.titulos.join(', ')}</td><td>{formatDateTime(item.fecha_solicitud)}</td><td><span className={`badge bg-${stateClass(item.estado)}`}>{item.estado}</span></td></tr>)}{!data.attention.length && <tr><td colSpan="5" className="text-center text-muted py-4">No hay operaciones pendientes.</td></tr>}</tbody></table></div></div>
  </>;
}

