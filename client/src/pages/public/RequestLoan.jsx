import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useRequest } from '../../state/RequestContext.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { numericInput, personNameInput, serverFieldErrors, validateLoanRequest } from '../../lib/requestValidation.js';

export default function RequestLoan() {
  const { items, update, remove, clear } = useRequest();
  const [client, setClient] = useState({ identificacion: '', nombre_completo: '', telefono: '', correo: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const navigate = useNavigate();

  const showError = (message, fields = {}) => {
    setError(message);
    setFieldErrors(fields);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const changeClient = (field, value) => {
    setClient((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (error) setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateLoanRequest(client, items);
    if (Object.keys(validation.errors).length) {
      showError('Revisa los campos señalados para enviar la solicitud.', validation.errors);
      const firstField = Object.keys(validation.errors).find((field) => field !== 'items');
      requestAnimationFrame(() => document.getElementById(`request-${firstField}`)?.focus({ preventScroll: true }));
      return;
    }

    setClient(validation.value); setError(''); setFieldErrors({}); setLoading(true);
    try {
      const { data } = await api.post('/solicitudes', { cliente: validation.value, items: items.map((item) => ({ libro_id: item.id, cantidad: item.cantidad })) });
      clear();
      navigate(`/solicitud/confirmacion/${data.solicitud.codigo}`, { state: { solicitud: data.solicitud, identificacion: validation.value.identificacion } });
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.solicitud) {
        clear();
        navigate(`/solicitud/confirmacion/${response.solicitud.codigo}`, { state: { solicitud: response.solicitud, identificacion: validation.value.identificacion, rejected: true } });
      } else {
        const fields = serverFieldErrors(response);
        const detail = Object.values(fields)[0];
        showError(detail || response?.message || (requestError.code === 'ECONNABORTED'
          ? 'La solicitud tardó demasiado. Comprueba tu conexión e inténtalo nuevamente.'
          : 'No pudimos conectar con la biblioteca. Inténtalo nuevamente.'), fields);
      }
    } finally { setLoading(false); }
  };

  const fieldClass = (field) => `form-control${fieldErrors[field] ? ' is-invalid' : ''}`;
  const fieldHelp = (field) => fieldErrors[field] && <div id={`request-${field}-error`} className="invalid-feedback">{fieldErrors[field]}</div>;

  return <div className="container py-5 request-page">
    <Link to="/" className="back-link"><i className="fas fa-arrow-left me-2" />Seguir explorando</Link>
    <div className="row g-4 mt-1 request-layout">
      <div className="col-lg-7"><div className="card request-items-card"><div className="card-body p-4"><h3 className="page-title">Tu solicitud</h3><p className="text-muted">Confirma las obras y cantidades que deseas retirar.</p>
        {items.length === 0 ? <EmptyState title="Primero selecciona un libro" text="Aún no puedes enviar una solicitud. Regresa al catálogo y añade al menos un material disponible." action={<Link to="/" className="btn btn-primary"><i className="fas fa-book-open me-2" />Explorar catálogo</Link>} /> : items.map((item) => <div className="request-item" key={item.id}><div className="request-item-copy"><strong>{item.titulo}</strong><small>ID: {item.id_libro_texto}</small></div><div className="request-item-actions"><label className="visually-hidden" htmlFor={`request-quantity-${item.id}`}>Cantidad de {item.titulo}</label><input id={`request-quantity-${item.id}`} aria-label={`Cantidad de ${item.titulo}`} className="form-control quantity-input" type="number" inputMode="numeric" min="1" max={item.max} value={item.cantidad} onChange={(e) => update(item.id, Math.max(1, Math.min(item.max, Number(e.target.value) || 1)))} /><button type="button" className="btn btn-light text-danger remove-request-item" onClick={() => remove(item.id)} aria-label={`Quitar ${item.titulo} de la solicitud`}><i className="fas fa-trash" /></button></div></div>)}
      </div></div></div>
      <div className="col-lg-5"><form className="card request-form-card" onSubmit={submit} noValidate><div className="card-body p-4"><h4>Datos del solicitante</h4><p className="text-muted small">No se creará una cuenta. Usaremos estos datos únicamente para gestionar el préstamo.</p>
        {!items.length && <div className="alert alert-warning request-empty-warning" role="status"><i className="fas fa-circle-info me-2" />Selecciona un material en el catálogo para habilitar este formulario.</div>}
        {error && <div ref={errorRef} className="alert alert-danger form-error-summary" role="alert" aria-live="assertive" tabIndex="-1"><i className="fas fa-circle-exclamation me-2" />{error}</div>}
        <label className="form-label" htmlFor="request-identificacion">Cédula <span aria-hidden="true">*</span></label><input id="request-identificacion" className={fieldClass('identificacion')} required type="text" inputMode="numeric" pattern="[0-9]{10}" autoComplete="off" maxLength="10" placeholder="10 dígitos" aria-invalid={Boolean(fieldErrors.identificacion)} aria-describedby={fieldErrors.identificacion ? 'request-identificacion-error' : 'request-identificacion-help'} value={client.identificacion} onChange={(e) => changeClient('identificacion', numericInput(e.target.value, 10))} /><div id="request-identificacion-help" className="form-text">Solo números, sin espacios ni guiones.</div>{fieldHelp('identificacion')}
        <label className="form-label mt-3" htmlFor="request-nombre_completo">Nombre completo <span aria-hidden="true">*</span></label><input id="request-nombre_completo" className={fieldClass('nombre_completo')} required autoComplete="name" maxLength="180" placeholder="Nombres y apellidos" aria-invalid={Boolean(fieldErrors.nombre_completo)} aria-describedby={fieldErrors.nombre_completo ? 'request-nombre_completo-error' : 'request-nombre-help'} value={client.nombre_completo} onChange={(e) => changeClient('nombre_completo', personNameInput(e.target.value))} /><div id="request-nombre-help" className="form-text">Solo letras; se permiten espacios, apóstrofes y guiones.</div>{fieldHelp('nombre_completo')}
        <div id="request-contact-help" className="contact-hint"><i className="fas fa-circle-info" /><span>Ingresa al menos un teléfono o un correo.</span></div>
        <label className="form-label" htmlFor="request-telefono">Teléfono ecuatoriano</label><input id="request-telefono" className={fieldClass('telefono')} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength="10" pattern="[0-9]*" placeholder="Ej. 0991234567" aria-invalid={Boolean(fieldErrors.telefono)} aria-describedby={fieldErrors.telefono ? 'request-telefono-error' : 'request-telefono-help'} value={client.telefono} onChange={(e) => changeClient('telefono', numericInput(e.target.value, 10))} /><div id="request-telefono-help" className="form-text">Celular: 10 dígitos desde 09. Fijo: 9 dígitos con código de provincia.</div>{fieldHelp('telefono')}
        <label className="form-label mt-3" htmlFor="request-correo">Correo electrónico</label><input id="request-correo" className={fieldClass('correo')} type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com" aria-invalid={Boolean(fieldErrors.correo)} aria-describedby={fieldErrors.correo ? 'request-correo-error' : 'request-contact-help'} value={client.correo} onChange={(e) => changeClient('correo', e.target.value)} />{fieldHelp('correo')}
        {fieldErrors.items && <div className="text-danger small fw-bold mt-3">{fieldErrors.items}</div>}
        <button type="submit" className="btn btn-primary w-100 py-3 mt-4 request-submit" disabled={!items.length || loading}>{loading ? <><span className="spinner-border spinner-border-sm me-2" />Registrando…</> : items.length ? 'Enviar solicitud' : 'Selecciona un libro primero'}</button>
        <p className="request-required-note"><span aria-hidden="true">*</span> Campos obligatorios</p>
      </div></form></div>
    </div>
  </div>;
}
