import { useEffect, useState } from 'react';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { formatDateTime } from '../../lib/format.js';
import ReportActions from '../../components/ReportActions.jsx';

const labels = { prestamo: 'Préstamo', devolucion: 'Devolución', ingreso_libro: 'Ingreso de libro', edicion_libro: 'Edición de libro', rechazo_solicitud: 'Rechazo de solicitud' };
export default function Movements() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ tipo: '', search: '' });
  const load = () => api.get('/movimientos', { params: filters }).then(({ data }) => setItems(data.items));
  useEffect(() => { load(); }, [filters.tipo]);
  return <><PageHeader icon="fa-clock-rotate-left" title="Movimientos" subtitle="Historial funcional de las acciones relevantes" actions={<ReportActions type="movimientos" filters={filters} />} />
    <div className="card mb-3"><form className="card-body d-flex flex-column flex-md-row gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}><input className="form-control" placeholder="Buscar actor, libro, código o detalle" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><select className="form-select w-auto" value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}><option value="">Todos los tipos</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className="btn btn-primary">Buscar</button></form></div>
    <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Actor</th><th>Referencia</th><th>Detalle</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{formatDateTime(item.fecha_hora)}</td><td><span className="badge bg-light text-dark">{labels[item.tipo]}</span></td><td><strong>{item.actor_nombre}</strong><small className="d-block text-muted text-capitalize">{item.tipo_actor}</small></td><td>{item.libro_titulo || item.prestamo_codigo || '—'}{item.id_libro_texto && <small className="d-block text-muted">{item.id_libro_texto}</small>}</td><td>{item.detalle || '—'}</td></tr>)}</tbody></table></div></div>
  </>;
}
