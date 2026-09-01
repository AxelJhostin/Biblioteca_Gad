import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api, { apiFileUrl } from '../../api.js';
import { useAuth } from '../../state/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ReportActions from '../../components/ReportActions.jsx';

const empty = { id_libro_texto: '', tipo_material: 'libro', tipo_material_otro: '', genero: 'narrativa', genero_otro: '', titulo: '', descripcion: '', anio_publicacion: '', cantidad_total: 1, autores_texto: '', activo: true };

export default function AdminCatalog() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [cover, setCover] = useState(null);
  const [digital, setDigital] = useState(null);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState('');
  const load = () => api.get('/catalogo', { params: { limit: 48 } }).then(({ data }) => setItems(data.items));
  useEffect(() => { load(); }, []);
  const edit = async (book) => {
    const { data } = await api.get(`/catalogo/${book.id}`);
    setSelected(book.id); setShowForm(true); setCover(null); setDigital(null);
    setForm({ ...empty, ...data.item, autores_texto: data.item.autores.map((author) => author.nombre_completo).join(', ') });
  };
  const create = () => { setSelected(null); setForm(empty); setCover(null); setDigital(null); setShowForm(true); };
  const view = async (book) => {
    const { data } = await api.get(`/catalogo/${book.id}`);
    setPreview(data.item);
  };
  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, autores: form.autores_texto.split(',').map((value) => value.trim()).filter(Boolean), cantidad_total: Number(form.cantidad_total), anio_publicacion: form.anio_publicacion || '' };
    delete payload.autores_texto; delete payload.id; delete payload.tiene_portada; delete payload.digital_disponible; delete payload.cantidad_disponible; delete payload.creado_en; delete payload.actualizado_en; delete payload.portada_path; delete payload.portada_mime;
    try {
      const { data } = selected ? await api.patch(`/admin/libros/${selected}`, payload) : await api.post('/admin/libros', payload);
      const id = data.item.id;
      if (cover) { const body = new FormData(); body.append('portada', cover); await api.post(`/admin/libros/${id}/portada`, body); }
      if (digital) { const body = new FormData(); body.append('archivo', digital); await api.post(`/admin/libros/${id}/digital`, body); }
      Swal.fire({ icon: 'success', title: selected ? 'Libro actualizado' : 'Libro registrado', confirmButtonColor: '#3FAE9A' });
      setShowForm(false); load();
    } catch (error) { Swal.fire({ icon: 'error', title: 'No se guardó', text: error.response?.data?.message || 'Revise los datos.', confirmButtonColor: '#F2705B' }); }
  };
  const visibleItems = items.filter((book) => {
    const term = search.trim().toLocaleLowerCase('es');
    return !term || [book.titulo, book.id_libro_texto, book.tipo_material, book.genero,
      ...book.autores.map((author) => author.nombre_completo)]
      .some((value) => String(value || '').toLocaleLowerCase('es').includes(term));
  });
  return <><PageHeader icon="fa-book" title="Catálogo" subtitle={user?.rol === 'administrador' ? 'Gestiona obras, existencias y archivos digitales' : 'Consulta portadas, identificadores y disponibilidad'} actions={<div className="d-flex flex-wrap align-items-center gap-2"><ReportActions type="inventario" filters={search ? { search } : {}} />{user?.rol === 'administrador' && <button className="btn btn-primary" onClick={create}><i className="fas fa-plus me-2" />Nuevo libro</button>}</div>} />
    {showForm && <form className="card mb-4" onSubmit={submit}><div className="card-header d-flex justify-content-between"><span>{selected ? 'Editar libro' : 'Registrar libro'}</span><button className="btn-close" type="button" onClick={() => setShowForm(false)} /></div><div className="card-body"><div className="row g-3">
      <div className="col-md-4"><label className="form-label">ID Libro</label><input className="form-control" required value={form.id_libro_texto} onChange={(e) => setForm({ ...form, id_libro_texto: e.target.value })} /></div><div className="col-md-8"><label className="form-label">Título</label><input className="form-control" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">Autores separados por coma</label><input className="form-control" required value={form.autores_texto} onChange={(e) => setForm({ ...form, autores_texto: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Tipo</label><select className="form-select" value={form.tipo_material} onChange={(e) => setForm({ ...form, tipo_material: e.target.value })}><option value="libro">Libro</option><option value="revista">Revista</option><option value="folleto">Folleto</option><option value="tesis">Tesis</option><option value="otro">Otro</option></select></div><div className="col-md-3"><label className="form-label">Género</label><select className="form-select" value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}><option value="narrativa">Narrativa</option><option value="lirico">Lírico</option><option value="poesia">Poesía</option><option value="ensayo">Ensayo</option><option value="otro">Otro</option></select></div>
      {form.tipo_material === 'otro' && <div className="col-md-6"><label className="form-label">Otro tipo</label><input className="form-control" required value={form.tipo_material_otro} onChange={(e) => setForm({ ...form, tipo_material_otro: e.target.value })} /></div>}{form.genero === 'otro' && <div className="col-md-6"><label className="form-label">Otro género</label><input className="form-control" required value={form.genero_otro} onChange={(e) => setForm({ ...form, genero_otro: e.target.value })} /></div>}
      <div className="col-md-3"><label className="form-label">Año</label><input className="form-control" type="number" value={form.anio_publicacion || ''} onChange={(e) => setForm({ ...form, anio_publicacion: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Cantidad total</label><input className="form-control" type="number" min="0" required value={form.cantidad_total} onChange={(e) => setForm({ ...form, cantidad_total: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Portada (opcional)</label><input className="form-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files[0])} /></div><div className="col-md-3"><label className="form-label">PDF digital (opcional)</label><input className="form-control" type="file" accept="application/pdf" onChange={(e) => setDigital(e.target.files[0])} /></div>
      <div className="col-12"><label className="form-label">Descripción</label><textarea className="form-control" rows="3" value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div><div className="col-12 d-flex justify-content-end gap-2"><button className="btn btn-light" type="button" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary">Guardar</button></div>
    </div></div></form>}
    {preview && <div className="card mb-4 staff-catalog-detail"><button className="btn-close" type="button" onClick={() => setPreview(null)} aria-label="Cerrar detalle" /><div className="staff-detail-cover">{preview.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${preview.id}/portada`)} alt={`Portada de ${preview.titulo}`} /> : <div className="cover-placeholder"><i className="fas fa-book" /><span>Biblioteca Municipal</span></div>}</div><div><span className="book-type">{preview.tipo_material_otro || preview.tipo_material}</span><h3>{preview.titulo}</h3><p className="book-author">{preview.autores.map((author) => author.nombre_completo).join(', ') || 'Autor no registrado'}</p><dl className="staff-book-facts"><div><dt>ID libro</dt><dd>{preview.id_libro_texto}</dd></div><div><dt>Género</dt><dd>{preview.genero_otro || preview.genero || 'No registrado'}</dd></div><div><dt>Año</dt><dd>{preview.anio_publicacion || 'No registrado'}</dd></div><div><dt>Disponibilidad</dt><dd>{preview.cantidad_disponible} de {preview.cantidad_total}</dd></div></dl><p className="text-muted">{preview.descripcion || 'Sin descripción registrada.'}</p><div className="d-flex flex-wrap gap-2">{preview.digital_disponible && <span className="badge bg-success"><i className="fas fa-tablet-screen-button me-1" />Lectura digital</span>}{user?.rol === 'administrador' && <button className="btn btn-sm btn-outline-primary" onClick={() => edit(preview)}>Editar registro</button>}</div></div></div>}
    <div className="card"><div className="card-body staff-catalog-toolbar"><div className="search-main"><i className="fas fa-magnifying-glass" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, autor, ID, género o tipo…" /></div><span>{visibleItems.length} material(es)</span></div></div>
    <div className="staff-catalog-grid mt-3">{visibleItems.map((book) => <article className="card staff-book-card" key={book.id}><button className="staff-book-cover" type="button" onClick={() => view(book)}>{book.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${book.id}/portada`)} alt={`Portada de ${book.titulo}`} /> : <div className="cover-placeholder"><i className="fas fa-book" /><span>Biblioteca Municipal</span></div>}{book.digital_disponible && <span className="digital-ribbon"><i className="fas fa-tablet-screen-button" /> Digital</span>}</button><div className="card-body"><span className="book-type">{book.tipo_material_otro || book.tipo_material}</span><h5>{book.titulo}</h5><p className="book-author">{book.autores.map((author) => author.nombre_completo).join(', ') || 'Autor no registrado'}</p><div className="staff-book-meta"><span><i className="fas fa-barcode" />{book.id_libro_texto}</span><span><i className="fas fa-layer-group" />{book.cantidad_disponible} / {book.cantidad_total} disponibles</span><span><i className="fas fa-tags" />{book.genero_otro || book.genero || 'Sin género'}</span></div><div className="d-flex gap-2 mt-3"><button className="btn btn-light flex-grow-1" onClick={() => view(book)}>Ver detalles</button>{user?.rol === 'administrador' && <button className="btn btn-outline-primary" onClick={() => edit(book)} aria-label={`Editar ${book.titulo}`}><i className="fas fa-pen" /></button>}</div></div></article>)}</div>
  </>;
}
