import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import { useAuth } from '../../state/AuthContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';

const empty = { id_libro_texto: '', tipo_material: 'libro', tipo_material_otro: '', genero: 'narrativa', genero_otro: '', titulo: '', descripcion: '', anio_publicacion: '', cantidad_total: 1, autores_texto: '', activo: true };

export default function AdminCatalog() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [cover, setCover] = useState(null);
  const [digital, setDigital] = useState(null);
  const load = () => api.get('/catalogo', { params: { limit: 48 } }).then(({ data }) => setItems(data.items));
  useEffect(() => { load(); }, []);
  const edit = async (book) => {
    const { data } = await api.get(`/catalogo/${book.id}`);
    setSelected(book.id); setShowForm(true); setCover(null); setDigital(null);
    setForm({ ...empty, ...data.item, autores_texto: data.item.autores.map((author) => author.nombre_completo).join(', ') });
  };
  const create = () => { setSelected(null); setForm(empty); setCover(null); setDigital(null); setShowForm(true); };
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
  return <><PageHeader icon="fa-book" title="Catálogo" subtitle={user?.rol === 'administrador' ? 'Gestiona obras, existencias y archivos digitales' : 'Consulta las existencias de la biblioteca'} actions={user?.rol === 'administrador' && <button className="btn btn-primary" onClick={create}><i className="fas fa-plus me-2" />Nuevo libro</button>} />
    {showForm && <form className="card mb-4" onSubmit={submit}><div className="card-header d-flex justify-content-between"><span>{selected ? 'Editar libro' : 'Registrar libro'}</span><button className="btn-close" type="button" onClick={() => setShowForm(false)} /></div><div className="card-body"><div className="row g-3">
      <div className="col-md-4"><label className="form-label">ID Libro</label><input className="form-control" required value={form.id_libro_texto} onChange={(e) => setForm({ ...form, id_libro_texto: e.target.value })} /></div><div className="col-md-8"><label className="form-label">Título</label><input className="form-control" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      <div className="col-md-6"><label className="form-label">Autores separados por coma</label><input className="form-control" required value={form.autores_texto} onChange={(e) => setForm({ ...form, autores_texto: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Tipo</label><select className="form-select" value={form.tipo_material} onChange={(e) => setForm({ ...form, tipo_material: e.target.value })}><option value="libro">Libro</option><option value="revista">Revista</option><option value="folleto">Folleto</option><option value="tesis">Tesis</option><option value="otro">Otro</option></select></div><div className="col-md-3"><label className="form-label">Género</label><select className="form-select" value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}><option value="narrativa">Narrativa</option><option value="lirico">Lírico</option><option value="poesia">Poesía</option><option value="ensayo">Ensayo</option><option value="otro">Otro</option></select></div>
      {form.tipo_material === 'otro' && <div className="col-md-6"><label className="form-label">Otro tipo</label><input className="form-control" required value={form.tipo_material_otro} onChange={(e) => setForm({ ...form, tipo_material_otro: e.target.value })} /></div>}{form.genero === 'otro' && <div className="col-md-6"><label className="form-label">Otro género</label><input className="form-control" required value={form.genero_otro} onChange={(e) => setForm({ ...form, genero_otro: e.target.value })} /></div>}
      <div className="col-md-3"><label className="form-label">Año</label><input className="form-control" type="number" value={form.anio_publicacion || ''} onChange={(e) => setForm({ ...form, anio_publicacion: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Cantidad total</label><input className="form-control" type="number" min="0" required value={form.cantidad_total} onChange={(e) => setForm({ ...form, cantidad_total: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Portada (opcional)</label><input className="form-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.target.files[0])} /></div><div className="col-md-3"><label className="form-label">PDF digital (opcional)</label><input className="form-control" type="file" accept="application/pdf" onChange={(e) => setDigital(e.target.files[0])} /></div>
      <div className="col-12"><label className="form-label">Descripción</label><textarea className="form-control" rows="3" value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div><div className="col-12 d-flex justify-content-end gap-2"><button className="btn btn-light" type="button" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary">Guardar</button></div>
    </div></div></form>}
    <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>ID Libro</th><th>Título / autores</th><th>Material</th><th>Existencias</th><th>Digital</th><th></th></tr></thead><tbody>{items.map((book) => <tr key={book.id}><td className="fw-bold">{book.id_libro_texto}</td><td><strong>{book.titulo}</strong><small className="d-block text-muted">{book.autores.map((author) => author.nombre_completo).join(', ')}</small></td><td className="text-capitalize">{book.tipo_material}</td><td>{book.cantidad_disponible} / {book.cantidad_total}</td><td>{book.digital_disponible ? <span className="badge bg-success">Sí</span> : <span className="badge bg-light text-dark">No</span>}</td><td>{user?.rol === 'administrador' && <button className="btn btn-sm btn-outline-primary" onClick={() => edit(book)}>Editar</button>}</td></tr>)}</tbody></table></div></div>
  </>;
}

