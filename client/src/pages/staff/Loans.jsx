import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import DirectLoanForm from '../../components/DirectLoanForm.jsx';
import ReportActions from '../../components/ReportActions.jsx';
import { formatDate, stateClass, stateLabel } from '../../lib/format.js';

export default function Loans() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [showDirect, setShowDirect] = useState(false);
  const load = () => api.get('/prestamos', { params: filter ? { estado: filter } : {} }).then(({ data }) => setItems(data.items));
  useEffect(() => { load(); }, [filter]);
  const deliver = async (loan) => {
    const result = await Swal.fire({ title: `Registrar entrega ${loan.codigo}`, html: `<p class="text-start mb-2">Confirma que <strong>${loan.nombre_completo}</strong> retiró el material.</p><label class="d-block text-start small fw-bold">Fecha límite de devolución</label>`, input: 'date', inputAttributes: { min: new Date().toISOString().slice(0, 10) }, showCancelButton: true, confirmButtonText: 'Registrar entrega', cancelButtonText: 'Cancelar', confirmButtonColor: '#3FAE9A', preConfirm: (value) => value || Swal.showValidationMessage('Seleccione la fecha límite.') });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${loan.id}/entregar`, { fecha_limite: result.value });
    await Swal.fire({ icon: 'success', title: 'Entrega registrada', confirmButtonColor: '#3FAE9A' });
    load();
  };
  const returnItems = async (loan) => {
    const pending = loan.detalles.filter((detail) => Number(detail.cantidad_aprobada) > Number(detail.cantidad_devuelta));
    const html = pending.map((detail) => `<label class="return-row"><span>${detail.titulo}<small>Pendiente: ${detail.cantidad_aprobada - detail.cantidad_devuelta}</small></span><input id="return-${detail.id}" type="number" min="0" max="${detail.cantidad_aprobada - detail.cantidad_devuelta}" value="${detail.cantidad_aprobada - detail.cantidad_devuelta}"></label>`).join('');
    const result = await Swal.fire({ title: `Devolución ${loan.codigo}`, html, showCancelButton: true, confirmButtonText: 'Registrar devolución', confirmButtonColor: '#3FAE9A', preConfirm: () => {
      const selected = pending.map((detail) => ({ detalle_id: detail.id, cantidad: Number(document.getElementById(`return-${detail.id}`).value) })).filter((item) => item.cantidad > 0);
      if (!selected.length) return Swal.showValidationMessage('Ingrese al menos una cantidad.'); return selected;
    } });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${loan.id}/devoluciones`, { items: result.value }); load();
  };
  const created = () => { setShowDirect(false); setFilter('activo'); load(); };
  return <><PageHeader icon="fa-right-left" title="Préstamos" subtitle="Historial completo compartido: retiros, préstamos directos y devoluciones" actions={<div className="d-flex flex-wrap align-items-center gap-2"><select aria-label="Filtrar préstamos por estado" className="form-select loan-filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Todos</option><option value="listo_retiro">Listos para retirar</option><option value="activo">Activos</option><option value="atrasado">Atrasados</option><option value="devuelto">Devueltos</option><option value="rechazado">Rechazados</option></select><ReportActions type="prestamos" filters={filter ? { estado: filter } : {}} /><button className="btn btn-primary" onClick={() => setShowDirect(true)}><i className="fas fa-plus me-2" />Nuevo préstamo</button></div>} />
    {showDirect && <DirectLoanForm onCancel={() => setShowDirect(false)} onCreated={created} />}
    <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Código / cliente</th><th>Materiales</th><th>Fecha límite</th><th>Estado</th><th></th></tr></thead><tbody>{items.map((loan) => <tr key={loan.id}><td><strong>{loan.codigo}</strong><small className="d-block text-muted">{loan.nombre_completo} · {loan.identificacion}</small></td><td>{loan.detalles.map((detail) => <div className={`small loan-material-line ${detail.estado_revision}`} key={detail.id}><strong>{detail.titulo}</strong>{detail.estado_revision === 'rechazado' ? <span>Rechazado{detail.motivo_rechazo ? ` · ${detail.motivo_rechazo}` : ''}</span> : detail.estado_revision === 'pendiente' ? <span>Solicitado: {detail.cantidad_solicitada} · Pendiente de revisión</span> : <span>Aprobado: {detail.cantidad_aprobada}/{detail.cantidad_solicitada} · Devuelto: {detail.cantidad_devuelta}</span>}</div>)}</td><td>{loan.estado === 'listo_retiro' ? 'Se define al entregar' : formatDate(loan.fecha_limite)}</td><td><span className={`badge bg-${stateClass(loan.estado)}`}>{stateLabel(loan.estado)}</span></td><td>{loan.estado === 'listo_retiro' && <button className="btn btn-sm btn-primary" onClick={() => deliver(loan)}><i className="fas fa-hand-holding me-1" />Registrar entrega</button>}{['activo','atrasado'].includes(loan.estado) && <button className="btn btn-sm btn-success" onClick={() => returnItems(loan)}>Devolver</button>}</td></tr>)}</tbody></table></div></div>
  </>;
}
