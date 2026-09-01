import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import DirectLoanForm from '../../components/DirectLoanForm.jsx';
import { formatDate, stateClass } from '../../lib/format.js';

export default function Loans() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [showDirect, setShowDirect] = useState(false);
  const load = () => api.get('/prestamos', { params: filter ? { estado: filter } : {} }).then(({ data }) => setItems(data.items));
  useEffect(() => { load(); }, [filter]);
  const returnItems = async (loan) => {
    const pending = loan.detalles.filter((detail) => detail.cantidad_solicitada > detail.cantidad_devuelta);
    const html = pending.map((detail) => `<label class="return-row"><span>${detail.titulo}<small>Pendiente: ${detail.cantidad_solicitada - detail.cantidad_devuelta}</small></span><input id="return-${detail.id}" type="number" min="0" max="${detail.cantidad_solicitada - detail.cantidad_devuelta}" value="${detail.cantidad_solicitada - detail.cantidad_devuelta}"></label>`).join('');
    const result = await Swal.fire({ title: `Devolución ${loan.codigo}`, html, showCancelButton: true, confirmButtonText: 'Registrar devolución', confirmButtonColor: '#3FAE9A', preConfirm: () => {
      const selected = pending.map((detail) => ({ detalle_id: detail.id, cantidad: Number(document.getElementById(`return-${detail.id}`).value) })).filter((item) => item.cantidad > 0);
      if (!selected.length) return Swal.showValidationMessage('Ingrese al menos una cantidad.'); return selected;
    } });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${loan.id}/devoluciones`, { items: result.value }); load();
  };
  const created = () => { setShowDirect(false); setFilter('activo'); load(); };
  return <><PageHeader icon="fa-right-left" title="Préstamos" subtitle="Registra entregas directas y devoluciones parciales o completas" actions={<div className="d-flex flex-wrap gap-2"><select className="form-select loan-filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Todos</option><option value="activo">Activos</option><option value="atrasado">Atrasados</option><option value="devuelto">Devueltos</option><option value="rechazado">Rechazados</option></select><button className="btn btn-primary" onClick={() => setShowDirect(true)}><i className="fas fa-plus me-2" />Nuevo préstamo</button></div>} />
    {showDirect && <DirectLoanForm onCancel={() => setShowDirect(false)} onCreated={created} />}
    <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Código / cliente</th><th>Materiales</th><th>Fecha límite</th><th>Estado</th><th></th></tr></thead><tbody>{items.map((loan) => <tr key={loan.id}><td><strong>{loan.codigo}</strong><small className="d-block text-muted">{loan.nombre_completo} · {loan.identificacion}</small></td><td>{loan.detalles.map((detail) => <div className="small" key={detail.id}>{detail.titulo} · {detail.cantidad_devuelta}/{detail.cantidad_solicitada} devueltos</div>)}</td><td>{formatDate(loan.fecha_limite)}</td><td><span className={`badge bg-${stateClass(loan.estado)}`}>{loan.estado}</span></td><td>{['activo','atrasado'].includes(loan.estado) && <button className="btn btn-sm btn-success" onClick={() => returnItems(loan)}>Devolver</button>}</td></tr>)}</tbody></table></div></div>
  </>;
}
