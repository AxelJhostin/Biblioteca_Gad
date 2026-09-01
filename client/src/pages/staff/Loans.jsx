import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import DirectLoanForm from '../../components/DirectLoanForm.jsx';
import ReportActions from '../../components/ReportActions.jsx';
import { formatDate, formatDateTime, stateClass, stateLabel } from '../../lib/format.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

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
    const html = pending.map((detail) => `<label class="return-row"><span>${escapeHtml(detail.titulo)}<small>Pendiente: ${detail.cantidad_aprobada - detail.cantidad_devuelta}</small></span><input id="return-${detail.id}" type="number" min="0" max="${detail.cantidad_aprobada - detail.cantidad_devuelta}" value="${detail.cantidad_aprobada - detail.cantidad_devuelta}"></label>`).join('');
    const result = await Swal.fire({ title: `Devolución ${loan.codigo}`, html, showCancelButton: true, confirmButtonText: 'Registrar devolución', confirmButtonColor: '#3FAE9A', preConfirm: () => {
      const selected = pending.map((detail) => ({ detalle_id: detail.id, cantidad: Number(document.getElementById(`return-${detail.id}`).value) })).filter((item) => item.cantidad > 0);
      if (!selected.length) return Swal.showValidationMessage('Ingrese al menos una cantidad.'); return selected;
    } });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${loan.id}/devoluciones`, { items: result.value }); load();
  };
  const correctReview = async (loan) => {
    const lines = loan.detalles.map((detail) => `<div class="text-start border rounded p-2 mb-2"><strong>${escapeHtml(detail.titulo)}</strong><small class="d-block text-muted mb-2">Solicitado: ${detail.cantidad_solicitada}. Use 0 para rechazar.</small><div class="row g-2"><div class="col-4"><label class="small fw-bold" for="correct-${detail.id}">Aprobar</label><input class="form-control" id="correct-${detail.id}" type="number" min="0" max="${detail.cantidad_solicitada}" value="${detail.cantidad_aprobada ?? 0}"></div><div class="col-8"><label class="small fw-bold" for="correct-reason-${detail.id}">Observación de línea</label><input class="form-control" id="correct-reason-${detail.id}" maxlength="500" value="${escapeHtml(detail.motivo_rechazo || '')}"></div></div></div>`).join('');
    const result = await Swal.fire({
      title: `Corregir ${loan.codigo}`,
      html: `${lines}<label class="d-block text-start fw-bold mt-3" for="correction-reason">Motivo obligatorio de la corrección</label><textarea id="correction-reason" class="form-control" maxlength="500" placeholder="Explique por qué se cambia la decisión"></textarea>`,
      width: 720,
      showCancelButton: true,
      confirmButtonText: 'Guardar corrección',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3FAE9A',
      preConfirm: () => {
        const motivo_correccion = document.getElementById('correction-reason').value.trim();
        if (motivo_correccion.length < 5) return Swal.showValidationMessage('Explique el motivo de la corrección.');
        const decisions = loan.detalles.map((detail) => ({
          detalle_id: detail.id,
          cantidad_aprobada: Number(document.getElementById(`correct-${detail.id}`).value),
          motivo_rechazo: document.getElementById(`correct-reason-${detail.id}`).value.trim(),
        }));
        if (decisions.some((decision, index) => !Number.isInteger(decision.cantidad_aprobada) || decision.cantidad_aprobada < 0 || decision.cantidad_aprobada > Number(loan.detalles[index].cantidad_solicitada))) {
          return Swal.showValidationMessage('Revise las cantidades: deben ser enteras entre 0 y lo solicitado.');
        }
        return { items: decisions, motivo_correccion };
      },
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/prestamos/${loan.id}/corregir-revision`, result.value);
      await Swal.fire({ icon: 'success', title: 'Revisión corregida', text: 'El cambio quedó registrado en Movimientos.', confirmButtonColor: '#3FAE9A' });
      load();
    } catch (error) { Swal.fire('No se pudo corregir', error.response?.data?.message || 'Inténtalo nuevamente.', 'error'); }
  };
  const registerIncident = async (loan) => {
    const eligible = loan.detalles.filter((detail) => Number(detail.cantidad_aprobada) > Number(detail.cantidad_devuelta));
    const result = await Swal.fire({
      title: `Registrar incidencia · ${loan.codigo}`,
      html: `<label class="d-block text-start fw-bold" for="incident-detail">Material</label><select id="incident-detail" class="form-select mb-3">${eligible.map((detail) => `<option value="${detail.id}" data-max="${detail.cantidad_aprobada - detail.cantidad_devuelta}">${escapeHtml(detail.titulo)} · pendiente ${detail.cantidad_aprobada - detail.cantidad_devuelta}</option>`).join('')}</select><label class="d-block text-start fw-bold" for="incident-type">Situación</label><select id="incident-type" class="form-select mb-3"><option value="danado">Devuelto dañado</option><option value="reparacion">Devuelto y enviado a reparación</option><option value="extraviado">Reportado como extraviado</option></select><label class="d-block text-start fw-bold" for="incident-quantity">Cantidad</label><input id="incident-quantity" class="form-control mb-3" type="number" min="1" value="1"><label class="d-block text-start fw-bold" for="incident-comment">Descripción</label><textarea id="incident-comment" class="form-control" maxlength="500" placeholder="Describa qué ocurrió"></textarea>`,
      showCancelButton: true,
      confirmButtonText: 'Registrar incidencia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F2705B',
      preConfirm: () => {
        const detailSelect = document.getElementById('incident-detail');
        const cantidad = Number(document.getElementById('incident-quantity').value);
        const max = Number(detailSelect.selectedOptions[0]?.dataset.max || 0);
        const comentario = document.getElementById('incident-comment').value.trim();
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > max) return Swal.showValidationMessage(`La cantidad debe estar entre 1 y ${max}.`);
        if (comentario.length < 5) return Swal.showValidationMessage('Describa la incidencia en al menos 5 caracteres.');
        return { detalle_id: Number(detailSelect.value), tipo: document.getElementById('incident-type').value, cantidad, comentario };
      },
    });
    if (!result.isConfirmed) return;
    try { await api.post(`/prestamos/${loan.id}/incidencias`, result.value); await Swal.fire({ icon: 'success', title: 'Incidencia registrada', confirmButtonColor: '#3FAE9A' }); load(); }
    catch (error) { Swal.fire('No se registró', error.response?.data?.message || 'Inténtalo nuevamente.', 'error'); }
  };
  const resolveIncident = async (incident) => {
    const lost = incident.tipo === 'extraviado';
    const result = await Swal.fire({
      title: 'Resolver incidencia',
      html: `<label class="d-block text-start fw-bold" for="incident-resolution">Resultado</label><select id="incident-resolution" class="form-select mb-3">${lost ? '<option value="recuperado">Ejemplar recuperado</option>' : '<option value="reintegrado">Reintegrado a circulación</option>'}<option value="baja">Baja definitiva del inventario</option></select><label class="d-block text-start fw-bold" for="resolution-comment">Comentario opcional</label><textarea id="resolution-comment" class="form-control" maxlength="500"></textarea>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar resolución',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3FAE9A',
      preConfirm: () => ({ resolucion: document.getElementById('incident-resolution').value, comentario: document.getElementById('resolution-comment').value.trim() }),
    });
    if (!result.isConfirmed) return;
    try { await api.post(`/prestamos/incidencias/${incident.id}/resolver`, result.value); await Swal.fire({ icon: 'success', title: 'Incidencia resuelta', confirmButtonColor: '#3FAE9A' }); load(); }
    catch (error) { Swal.fire('No se resolvió', error.response?.data?.message || 'Inténtalo nuevamente.', 'error'); }
  };
  const created = () => { setShowDirect(false); setFilter('activo'); load(); };
  return <><PageHeader icon="fa-right-left" title="Préstamos" subtitle="Historial completo compartido: retiros, préstamos directos y devoluciones" actions={<div className="d-flex flex-wrap align-items-center gap-2"><select aria-label="Filtrar préstamos por estado" className="form-select loan-filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Todos</option><option value="listo_retiro">Listos para retirar</option><option value="activo">Activos</option><option value="atrasado">Atrasados</option><option value="devuelto">Devueltos</option><option value="rechazado">Rechazados</option><option value="expirado">Retiros vencidos</option></select><ReportActions type="prestamos" filters={filter ? { estado: filter } : {}} /><button className="btn btn-primary" onClick={() => setShowDirect(true)}><i className="fas fa-plus me-2" />Nuevo préstamo</button></div>} />
    {showDirect && <DirectLoanForm onCancel={() => setShowDirect(false)} onCreated={created} />}
    <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Código / cliente</th><th>Materiales</th><th>Fecha límite</th><th>Estado</th><th></th></tr></thead><tbody>{items.map((loan) => <tr key={loan.id}><td><strong>{loan.codigo}</strong><small className="d-block text-muted">{loan.nombre_completo} · {loan.identificacion}</small></td><td>{loan.detalles.map((detail) => <div className={`small loan-material-line ${detail.estado_revision}`} key={detail.id}><strong>{detail.titulo}</strong>{detail.estado_revision === 'rechazado' ? <span>Rechazado{detail.motivo_rechazo ? ` · ${detail.motivo_rechazo}` : ''}</span> : detail.estado_revision === 'pendiente' ? <span>Solicitado: {detail.cantidad_solicitada} · Pendiente de revisión</span> : <span>Aprobado: {detail.cantidad_aprobada}/{detail.cantidad_solicitada} · Devuelto: {detail.cantidad_devuelta}</span>}{detail.incidencias?.map((incident) => <span className={`loan-incident ${incident.estado}`} key={incident.id}><i className="fas fa-triangle-exclamation" />{incident.tipo.replace('_', ' ')} · {incident.cantidad} · {incident.estado}{incident.estado === 'abierta' && <button className="btn btn-link btn-sm p-0" onClick={() => resolveIncident(incident)}>Resolver</button>}</span>)}</div>)}</td><td>{loan.estado === 'listo_retiro' ? <>Retirar hasta<small className="d-block">{formatDateTime(loan.fecha_expiracion_retiro)}</small></> : formatDate(loan.fecha_limite)}</td><td><span className={`badge bg-${stateClass(loan.estado)}`}>{stateLabel(loan.estado)}</span></td><td><div className="d-flex flex-wrap gap-2 justify-content-end">{loan.estado === 'listo_retiro' && <button className="btn btn-sm btn-primary" onClick={() => deliver(loan)}><i className="fas fa-hand-holding me-1" />Registrar entrega</button>}{['listo_retiro','rechazado'].includes(loan.estado) && <button className="btn btn-sm btn-outline-primary" onClick={() => correctReview(loan)}><i className="fas fa-pen-to-square me-1" />Corregir</button>}{['activo','atrasado'].includes(loan.estado) && <button className="btn btn-sm btn-success" onClick={() => returnItems(loan)}>Devolver</button>}{['activo','atrasado'].includes(loan.estado) && loan.detalles.some((detail) => Number(detail.cantidad_aprobada) > Number(detail.cantidad_devuelta)) && <button className="btn btn-sm btn-outline-danger" onClick={() => registerIncident(loan)}>Incidencia</button>}</div></td></tr>)}</tbody></table></div></div>
  </>;
}
