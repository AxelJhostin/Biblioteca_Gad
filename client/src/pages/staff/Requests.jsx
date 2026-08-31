import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDateTime } from '../../lib/format.js';

export default function Requests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => api.get('/prestamos', { params: { estado: 'pendiente' } }).then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const approve = async (item) => {
    const result = await Swal.fire({ title: 'Aprobar y entregar', html: `<p class="text-start mb-2">${item.nombre_completo}</p><label class="d-block text-start small fw-bold">Fecha límite</label>`, input: 'date', inputAttributes: { min: new Date().toISOString().slice(0, 10) }, showCancelButton: true, confirmButtonText: 'Aprobar y entregar', confirmButtonColor: '#3FAE9A', preConfirm: (value) => value || Swal.showValidationMessage('Seleccione la fecha límite.') });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${item.id}/aprobar-entregar`, { fecha_limite: result.value });
    Swal.fire({ icon: 'success', title: 'Préstamo entregado', confirmButtonColor: '#3FAE9A' }); load();
  };
  const reject = async (item) => {
    const result = await Swal.fire({ title: 'Rechazar solicitud', input: 'textarea', inputLabel: 'Comentario opcional', showCancelButton: true, confirmButtonText: 'Rechazar', confirmButtonColor: '#F2705B' });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${item.id}/rechazar`, { motivo: result.value }); load();
  };
  return <><PageHeader icon="fa-inbox" title="Solicitudes" subtitle="Se atienden por orden de fecha y hora de registro" />
    {loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : !items.length ? <EmptyState icon="fa-circle-check" title="Bandeja al día" text="No hay solicitudes pendientes." /> : <div className="row g-3">{items.map((item) => <div className="col-xl-6" key={item.id}><div className="card h-100"><div className="card-body"><div className="d-flex justify-content-between gap-3"><div><span className="badge bg-warning text-dark mb-2">{item.codigo}</span><h5>{item.nombre_completo}</h5><p className="small text-muted">{item.identificacion} · {item.telefono || item.correo}</p></div><small className="text-muted">{formatDateTime(item.fecha_solicitud)}</small></div><div className="loan-lines">{item.detalles.map((detail) => <div key={detail.id}><i className="fas fa-book text-success" /><span>{detail.titulo}</span><strong>x{detail.cantidad_solicitada}</strong></div>)}</div><div className="d-flex gap-2 mt-3"><button className="btn btn-success flex-grow-1" onClick={() => approve(item)}><i className="fas fa-check me-2" />Aprobar y entregar</button><button className="btn btn-outline-danger" onClick={() => reject(item)}>Rechazar</button></div></div></div></div>)}</div>}
  </>;
}

