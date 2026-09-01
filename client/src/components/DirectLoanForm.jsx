import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import api, { apiFileUrl } from '../api.js';
import { numericInput, personNameInput, serverFieldErrors, validateLoanRequest } from '../lib/requestValidation.js';

const initialClient = { identificacion: '', nombre_completo: '', telefono: '', correo: '' };
const localDate = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(date);
};

export default function DirectLoanForm({ onCancel, onCreated }) {
  const [client, setClient] = useState(initialClient);
  const [books, setBooks] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState(localDate(14));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/catalogo', { params: { disponible: true, limit: 48 } })
      .then(({ data }) => setBooks(data.items))
      .catch(() => setMessage('No pudimos cargar el catálogo disponible.'));
  }, []);

  const visibleBooks = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return books;
    return books.filter((book) => [book.titulo, book.id_libro_texto, book.tipo_material, book.genero,
      ...book.autores.map((author) => author.nombre_completo)]
      .some((value) => String(value || '').toLocaleLowerCase('es').includes(term)));
  }, [books, search]);

  const changeClient = (field, value) => {
    setClient((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const addBook = (book) => {
    setSelected((current) => current.some((item) => item.id === book.id)
      ? current
      : [...current, { ...book, cantidad: 1, max: Number(book.cantidad_disponible) }]);
    setErrors((current) => ({ ...current, items: undefined }));
  };
  const removeBook = (id) => setSelected((current) => current.filter((item) => item.id !== id));
  const changeQuantity = (id, amount) => setSelected((current) => current.map((item) => item.id === id
    ? { ...item, cantidad: Math.max(1, Math.min(item.max, Number(amount) || 1)) }
    : item));

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateLoanRequest(client, selected);
    const nextErrors = { ...validation.errors };
    if (!dueDate || dueDate < localDate()) nextErrors.fecha_limite = 'Selecciona una fecha igual o posterior a hoy.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors); setMessage('Revisa los campos señalados antes de registrar el préstamo.'); return;
    }
    setLoading(true); setMessage(''); setErrors({});
    try {
      const { data } = await api.post('/prestamos/directo', {
        cliente: validation.value,
        fecha_limite: dueDate,
        items: selected.map((item) => ({ libro_id: item.id, cantidad: item.cantidad })),
      });
      await Swal.fire({ icon: 'success', title: 'Préstamo registrado', text: `Código ${data.item.codigo}`, confirmButtonColor: '#3FAE9A' });
      onCreated();
    } catch (error) {
      const fields = serverFieldErrors(error.response?.data);
      setErrors(fields);
      setMessage(Object.values(fields)[0] || error.response?.data?.message || 'No se pudo registrar el préstamo.');
    } finally { setLoading(false); }
  };

  const fieldClass = (field) => `form-control${errors[field] ? ' is-invalid' : ''}`;
  return <form className="card mb-4 direct-loan-form" onSubmit={submit} noValidate>
    <div className="card-header d-flex align-items-center justify-content-between gap-3"><span><i className="fas fa-hand-holding-hand me-2 text-success" />Registrar préstamo directo</span><button className="btn-close" type="button" onClick={onCancel} aria-label="Cerrar" /></div>
    <div className="card-body p-3 p-md-4">
      {message && <div className="alert alert-danger" role="alert"><i className="fas fa-circle-exclamation me-2" />{message}</div>}
      <div className="row g-3">
        <div className="col-md-3"><label className="form-label">Cédula *</label><input className={fieldClass('identificacion')} inputMode="numeric" maxLength="10" placeholder="10 dígitos" value={client.identificacion} onChange={(e) => changeClient('identificacion', numericInput(e.target.value, 10))} />{errors.identificacion && <div className="invalid-feedback">{errors.identificacion}</div>}</div>
        <div className="col-md-5"><label className="form-label">Nombre completo *</label><input className={fieldClass('nombre_completo')} autoComplete="name" value={client.nombre_completo} onChange={(e) => changeClient('nombre_completo', personNameInput(e.target.value))} />{errors.nombre_completo && <div className="invalid-feedback">{errors.nombre_completo}</div>}</div>
        <div className="col-md-4"><label className="form-label">Fecha límite *</label><input className={fieldClass('fecha_limite')} type="date" min={localDate()} value={dueDate} onChange={(e) => { setDueDate(e.target.value); setErrors((current) => ({ ...current, fecha_limite: undefined })); }} />{errors.fecha_limite && <div className="invalid-feedback">{errors.fecha_limite}</div>}</div>
        <div className="col-md-4"><label className="form-label">Teléfono ecuatoriano</label><input className={fieldClass('telefono')} type="tel" inputMode="numeric" maxLength="10" placeholder="0991234567" value={client.telefono} onChange={(e) => changeClient('telefono', numericInput(e.target.value, 10))} />{errors.telefono && <div className="invalid-feedback">{errors.telefono}</div>}</div>
        <div className="col-md-8"><label className="form-label">Correo electrónico</label><input className={fieldClass('correo')} type="email" inputMode="email" placeholder="nombre@correo.com" value={client.correo} onChange={(e) => changeClient('correo', e.target.value)} />{errors.correo && <div className="invalid-feedback">{errors.correo}</div>}</div>
      </div>
      <p className="form-text mt-2">Debe ingresar al menos un teléfono o un correo.</p>

      <div className="direct-materials mt-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"><div><h5 className="mb-0">Materiales a entregar</h5><small className="text-muted">Solo se muestran ejemplares disponibles.</small></div><div className="search-main direct-search"><i className="fas fa-magnifying-glass" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, autor o ID…" /></div></div>
        {errors.items && <div className="alert alert-danger py-2">{errors.items}</div>}
        {selected.length > 0 && <div className="selected-materials mb-3">{selected.map((book) => <div className="selected-material" key={book.id}><span><strong>{book.titulo}</strong><small>ID {book.id_libro_texto}</small></span><input className="form-control" type="number" min="1" max={book.max} value={book.cantidad} onChange={(e) => changeQuantity(book.id, e.target.value)} aria-label={`Cantidad de ${book.titulo}`} /><button type="button" className="btn btn-light text-danger" onClick={() => removeBook(book.id)} aria-label={`Quitar ${book.titulo}`}><i className="fas fa-trash" /></button></div>)}</div>}
        <div className="direct-book-picker">{visibleBooks.map((book) => {
          const chosen = selected.some((item) => item.id === book.id);
          return <article className={`direct-book-option${chosen ? ' selected' : ''}`} key={book.id}>
            <div className="direct-book-thumb">{book.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${book.id}/portada`)} alt="" /> : <i className="fas fa-book" />}</div>
            <div><strong>{book.titulo}</strong><small>{book.id_libro_texto} · {book.autores.map((author) => author.nombre_completo).join(', ') || 'Sin autor'}</small><span>{book.cantidad_disponible} disponible(s)</span></div>
            <button className={`btn btn-sm ${chosen ? 'btn-success' : 'btn-outline-primary'}`} type="button" disabled={chosen} onClick={() => addBook(book)}>{chosen ? 'Añadido' : 'Añadir'}</button>
          </article>;
        })}</div>
      </div>
      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4"><button className="btn btn-light" type="button" onClick={onCancel}>Cancelar</button><button className="btn btn-primary" disabled={loading}>{loading ? 'Registrando…' : 'Registrar y entregar préstamo'}</button></div>
    </div>
  </form>;
}
