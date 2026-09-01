import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api, { apiFileUrl } from '../../api.js';
import { useRequest } from '../../state/RequestContext.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const initialFilters = { search: '', tipo: '', genero: '', digital: false, disponible: false };

export default function Catalog() {
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState(initialFilters);
  const [data, setData] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { add } = useRequest();

  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => Object.keys(filters).every((key) => current[key] === filters[key]) ? current : { ...filters }), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== false));
    api.get('/catalogo', { params }).then(({ data: response }) => { if (active) setData(response); })
      .catch(() => { if (active) { setData({ items: [], pagination: {} }); setLoadError('No pudimos actualizar el catálogo. Inténtalo nuevamente.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  const submit = (event) => { event.preventDefault(); setQuery(filters); };
  const addBook = (book) => {
    add(book);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Añadido a la solicitud', showConfirmButton: false, timer: 1600 });
  };

  return (
    <>
      <section className="catalog-hero">
        <div className="container py-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="eyebrow"><i className="fas fa-landmark me-2" />Municipio de Jipijapa</span>
              <h1>Historias, conocimiento<br />y memoria para todos.</h1>
              <p>Explora el catálogo de la Biblioteca Municipal, consulta ejemplares disponibles y lee obras digitales desde cualquier lugar.</p>
            </div>
            <div className="col-lg-5 d-none d-lg-block text-center"><div className="hero-book"><i className="fas fa-book-open" /></div></div>
          </div>
        </div>
      </section>
      <section className="catalog-content">
        <div className="container py-4 py-md-5">
          <form className="search-panel" onSubmit={submit}>
            <div className="search-main"><i className="fas fa-magnifying-glass" /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar por título, autor, género o tipo…" /></div>
            <select aria-label="Filtrar por tipo de material" value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}><option value="">Todos los materiales</option><option value="libro">Libros</option><option value="revista">Revistas</option><option value="folleto">Folletos</option><option value="tesis">Tesis</option></select>
            <select aria-label="Filtrar por género" value={filters.genero} onChange={(e) => setFilters({ ...filters, genero: e.target.value })}><option value="">Todos los géneros</option><option value="lirico">Lírico</option><option value="poesia">Poesía</option><option value="narrativa">Narrativa</option><option value="ensayo">Ensayo</option></select>
            <button className="btn btn-primary" type="submit">Buscar</button>
            <div className="search-toggles">
              <label><input type="checkbox" checked={filters.disponible} onChange={(e) => setFilters({ ...filters, disponible: e.target.checked })} /> Disponibles</label>
              <label><input type="checkbox" checked={filters.digital} onChange={(e) => setFilters({ ...filters, digital: e.target.checked })} /> Lectura digital</label>
            </div>
          </form>

          <div className="d-flex justify-content-between align-items-center my-4"><div><h4 className="mb-0">Catálogo municipal</h4><small className="text-muted">{data.pagination.total || 0} materiales encontrados</small></div></div>
          {loadError && <div className="alert alert-danger"><i className="fas fa-circle-exclamation me-2" />{loadError}</div>}
          {loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : data.items.length === 0 ? <EmptyState title="No encontramos materiales" text="Prueba con otros términos o limpia los filtros." action={<button className="btn btn-light" onClick={() => setFilters(initialFilters)}>Limpiar filtros</button>} /> : (
            <div className="row g-4">
              {data.items.map((book) => <div className="col-sm-6 col-lg-4 col-xl-3" key={book.id}>
                <article className="book-card">
                  <Link to={`/libros/${book.id}`} className="book-cover">
                    {book.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${book.id}/portada`)} alt={`Portada de ${book.titulo}`} /> : <div className="cover-placeholder"><i className="fas fa-book" /><span>Biblioteca<br />Municipal</span></div>}
                    {book.digital_disponible && <span className="digital-ribbon"><i className="fas fa-tablet-screen-button" /> Digital</span>}
                  </Link>
                  <div className="book-card-body">
                    <span className="book-type">{book.tipo_material_otro || book.tipo_material}</span>
                    <h5><Link to={`/libros/${book.id}`}>{book.titulo}</Link></h5>
                    <p className="book-author">{book.autores.map((author) => author.nombre_completo).join(', ') || 'Autor no registrado'}</p>
                    <div className="book-stock"><span className={Number(book.cantidad_disponible) > 0 ? 'available' : 'unavailable'}><i className={`fas ${Number(book.cantidad_disponible) > 0 ? 'fa-circle-check' : 'fa-circle-xmark'}`} /> {book.cantidad_disponible} disponible(s)</span></div>
                    <div className="d-flex gap-2 mt-3"><Link to={`/libros/${book.id}`} className="btn btn-light flex-grow-1">Ver detalle</Link><button className="btn btn-primary" disabled={Number(book.cantidad_disponible) === 0} onClick={() => addBook(book)} aria-label="Añadir a solicitud"><i className="fas fa-plus" /></button></div>
                  </div>
                </article>
              </div>)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
