import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api, { apiFileUrl } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDateTime } from '../../lib/format.js';

function initialDecisions(items) {
  return Object.fromEntries(items.flatMap((loan) => loan.detalles
    .filter((detail) => detail.cantidad_aprobada === null)
    .map((detail) => [detail.id, {
      cantidad_aprobada: Number(detail.cantidad_solicitada),
      motivo_rechazo: '',
    }])));
}

export default function Requests() {
  const [items, setItems] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  const load = () => api.get('/prestamos', { params: { estado: 'pendiente' } })
    .then(({ data }) => {
      setItems(data.items);
      setDecisions(initialDecisions(data.items));
    })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const changeDecision = (detailId, changes) => {
    setDecisions((current) => ({
      ...current,
      [detailId]: { ...current[detailId], ...changes },
    }));
  };

  const setAll = (item, approve) => {
    setDecisions((current) => ({
      ...current,
      ...Object.fromEntries(item.detalles
        .filter((detail) => detail.cantidad_aprobada === null)
        .map((detail) => [detail.id, {
          cantidad_aprobada: approve ? Number(detail.cantidad_solicitada) : 0,
          motivo_rechazo: current[detail.id]?.motivo_rechazo || '',
        }])),
    }));
  };

  const review = async (item) => {
    const pending = item.detalles.filter((detail) => detail.cantidad_aprobada === null);
    const payload = pending.map((detail) => ({ detalle_id: detail.id, ...decisions[detail.id] }));
    const approved = payload.filter((decision) => decision.cantidad_aprobada > 0);
    const rejected = payload.filter((decision) => decision.cantidad_aprobada === 0);
    const reduced = payload.filter((decision) => {
      const detail = pending.find((candidate) => candidate.id === decision.detalle_id);
      return decision.cantidad_aprobada > 0 && decision.cantidad_aprobada < Number(detail.cantidad_solicitada);
    });
    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirmar revisión',
      html: `<p><strong>${approved.length}</strong> material(es) aprobado(s) y <strong>${rejected.length}</strong> rechazado(s).</p>${reduced.length ? `<p class="small text-muted">${reduced.length} material(es) se aprobarán con una cantidad menor.</p>` : ''}<p class="small text-muted mb-0">Esta decisión se mostrará al cliente y liberará inmediatamente las unidades rechazadas.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar decisión',
      cancelButtonText: 'Seguir revisando',
      confirmButtonColor: '#3FAE9A',
    });
    if (!result.isConfirmed) return;
    setSubmitting(item.id);
    try {
      const { data } = await api.post(`/prestamos/${item.id}/revisar`, { items: payload });
      await Swal.fire({
        icon: data.item.estado === 'listo_retiro' ? 'success' : 'info',
        title: data.item.estado === 'listo_retiro' ? 'Material listo para retirar' : 'Solicitud rechazada',
        text: data.message,
        confirmButtonColor: '#3FAE9A',
      });
      load();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se guardó la revisión',
        text: error.response?.data?.message || 'Inténtalo nuevamente.',
        confirmButtonColor: '#F2705B',
      });
    } finally { setSubmitting(null); }
  };

  return <>
    <PageHeader icon="fa-inbox" title="Solicitudes" subtitle="Aprueba o rechaza cada material y cantidad por separado" />
    {loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : !items.length
      ? <EmptyState icon="fa-circle-check" title="Bandeja al día" text="No hay solicitudes pendientes." />
      : <div className="row g-3">{items.map((item) => {
        const pending = item.detalles.filter((detail) => detail.cantidad_aprobada === null);
        const approvedCount = pending.filter((detail) => decisions[detail.id]?.cantidad_aprobada > 0).length;
        const rejectedCount = pending.length - approvedCount;
        return <div className="col-12" key={item.id}><div className="card request-review-card"><div className="card-body">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-2"><div><span className="badge bg-warning text-dark mb-2">{item.codigo}</span><h5 className="mb-1">{item.nombre_completo}</h5><p className="small text-muted mb-0"><strong>Cédula:</strong> {item.identificacion} · <strong>Contacto:</strong> {item.telefono || item.correo}</p></div><small className="text-muted text-lg-end"><strong>Solicitado</strong><br />{formatDateTime(item.fecha_solicitud)}</small></div>
          <div className="requested-materials mt-3">{item.detalles.map((detail) => {
            const automaticRejected = detail.cantidad_aprobada === 0;
            const decision = decisions[detail.id];
            const isRejected = decision?.cantidad_aprobada === 0;
            const reduced = decision?.cantidad_aprobada > 0 && decision.cantidad_aprobada < Number(detail.cantidad_solicitada);
            return <article className={`requested-material${automaticRejected ? ' review-auto-rejected' : ''}`} key={detail.id}>
              <div className="requested-cover">{detail.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${detail.libro_id}/portada`)} alt={`Portada de ${detail.titulo}`} /> : <i className="fas fa-book" />}</div>
              <div className="requested-copy"><div className="d-flex flex-wrap align-items-start justify-content-between gap-2"><div><span className="book-type">{detail.tipo_material_otro || detail.tipo_material}</span><h6>{detail.titulo}</h6></div><span className="badge bg-secondary">Solicitados: {detail.cantidad_solicitada}</span></div><p>{detail.autores?.map((author) => author.nombre_completo).join(', ') || 'Autor no registrado'}</p><dl><div><dt>ID libro</dt><dd>{detail.id_libro_texto}</dd></div><div><dt>Género</dt><dd>{detail.genero_otro || detail.genero || 'No registrado'}</dd></div><div><dt>Año</dt><dd>{detail.anio_publicacion || 'No registrado'}</dd></div><div><dt>Existencias</dt><dd>{detail.cantidad_total}</dd></div></dl>{detail.descripcion && <small className="requested-description">{detail.descripcion}</small>}
                {automaticRejected ? <div className="alert alert-danger py-2 mt-3 mb-0"><i className="fas fa-circle-xmark me-2" />Rechazado automáticamente: {detail.motivo_rechazo}</div>
                  : <div className="material-review-controls mt-3"><div><label className="form-label" htmlFor={`decision-${detail.id}`}>Decisión</label><select id={`decision-${detail.id}`} className="form-select" value={isRejected ? 'rechazar' : 'aprobar'} onChange={(event) => changeDecision(detail.id, { cantidad_aprobada: event.target.value === 'aprobar' ? Number(detail.cantidad_solicitada) : 0 })}><option value="aprobar">Aprobar</option><option value="rechazar">Rechazar</option></select></div>{!isRejected && <div><label className="form-label" htmlFor={`approved-${detail.id}`}>Cantidad aprobada</label><input id={`approved-${detail.id}`} className="form-control" type="number" min="1" max={detail.cantidad_solicitada} value={decision?.cantidad_aprobada || 1} onChange={(event) => changeDecision(detail.id, { cantidad_aprobada: Math.max(1, Math.min(Number(detail.cantidad_solicitada), Number(event.target.value) || 1)) })} /></div>}{(isRejected || reduced) && <div className="material-review-reason"><label className="form-label" htmlFor={`reason-${detail.id}`}>{isRejected ? 'Motivo del rechazo' : 'Motivo de la reducción'}</label><input id={`reason-${detail.id}`} className="form-control" maxLength="500" placeholder="Explique brevemente la decisión…" value={decision?.motivo_rechazo || ''} onChange={(event) => changeDecision(detail.id, { motivo_rechazo: event.target.value })} /></div>}</div>}
              </div>
            </article>;
          })}</div>
          <div className="request-review-footer mt-3"><div className="review-summary"><strong>{approvedCount} aprobado(s)</strong><span>{rejectedCount + item.detalles.filter((detail) => detail.cantidad_aprobada === 0).length} rechazado(s)</span></div><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-success" type="button" onClick={() => setAll(item, true)}>Aprobar pendientes</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => setAll(item, false)}>Rechazar pendientes</button><button className="btn btn-primary" type="button" disabled={submitting === item.id} onClick={() => review(item)}><i className="fas fa-clipboard-check me-2" />{submitting === item.id ? 'Guardando…' : 'Guardar revisión'}</button></div></div>
        </div></div></div>;
      })}</div>}
  </>;
}
