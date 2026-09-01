import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api, { apiFileUrl } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDateTime } from '../../lib/format.js';

export default function Requests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => api.get('/prestamos', { params: { estado: 'pendiente' } }).then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const approve = async (item) => {
    const result = await Swal.fire({ icon: 'question', title: 'Aprobar solicitud', html: `<p>El material quedará reservado para <strong>${item.nombre_completo}</strong>.</p><p class="small text-muted mb-0">El cliente verá en Mi cuenta que ya puede acercarse a retirarlo.</p>`, showCancelButton: true, confirmButtonText: 'Sí, aprobar', cancelButtonText: 'Cancelar', confirmButtonColor: '#3FAE9A' });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${item.id}/aprobar`);
    Swal.fire({ icon: 'success', title: 'Listo para retirar', text: 'La cuenta del cliente ya muestra el aviso interno.', confirmButtonColor: '#3FAE9A' }); load();
  };
  const reject = async (item) => {
    const result = await Swal.fire({ title: 'Rechazar solicitud', input: 'textarea', inputLabel: 'Comentario opcional', showCancelButton: true, confirmButtonText: 'Rechazar', confirmButtonColor: '#F2705B' });
    if (!result.isConfirmed) return;
    await api.post(`/prestamos/${item.id}/rechazar`, { motivo: result.value }); load();
  };
  return <><PageHeader icon="fa-inbox" title="Solicitudes" subtitle="Se atienden por orden de fecha y hora de registro" />
    {loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : !items.length ? <EmptyState icon="fa-circle-check" title="Bandeja al día" text="No hay solicitudes pendientes." /> : <div className="row g-3">{items.map((item) => <div className="col-12" key={item.id}><div className="card request-review-card"><div className="card-body"><div className="d-flex flex-column flex-lg-row justify-content-between gap-2"><div><span className="badge bg-warning text-dark mb-2">{item.codigo}</span><h5 className="mb-1">{item.nombre_completo}</h5><p className="small text-muted mb-0"><strong>Cédula:</strong> {item.identificacion} · <strong>Contacto:</strong> {item.telefono || item.correo}</p></div><small className="text-muted text-lg-end"><strong>Solicitado</strong><br />{formatDateTime(item.fecha_solicitud)}</small></div><div className="requested-materials mt-3">{item.detalles.map((detail) => <article className="requested-material" key={detail.id}><div className="requested-cover">{detail.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${detail.libro_id}/portada`)} alt={`Portada de ${detail.titulo}`} /> : <i className="fas fa-book" />}</div><div className="requested-copy"><div className="d-flex flex-wrap align-items-start justify-content-between gap-2"><div><span className="book-type">{detail.tipo_material_otro || detail.tipo_material}</span><h6>{detail.titulo}</h6></div><span className="badge bg-success">{detail.cantidad_solicitada} ejemplar(es)</span></div><p>{detail.autores?.map((author) => author.nombre_completo).join(', ') || 'Autor no registrado'}</p><dl><div><dt>ID libro</dt><dd>{detail.id_libro_texto}</dd></div><div><dt>Género</dt><dd>{detail.genero_otro || detail.genero || 'No registrado'}</dd></div><div><dt>Año</dt><dd>{detail.anio_publicacion || 'No registrado'}</dd></div><div><dt>Existencias</dt><dd>{detail.cantidad_total}</dd></div></dl>{detail.descripcion && <small className="requested-description">{detail.descripcion}</small>}</div></article>)}</div><div className="d-flex flex-column flex-sm-row gap-2 mt-3"><button className="btn btn-success flex-grow-1" onClick={() => approve(item)}><i className="fas fa-check me-2" />Aprobar solicitud</button><button className="btn btn-outline-danger" onClick={() => reject(item)}>Rechazar</button></div></div></div></div>)}</div>}
  </>;
}
