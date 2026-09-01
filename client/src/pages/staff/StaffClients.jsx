import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDateTime } from '../../lib/format.js';

export default function StaffClients() {
  const [items, setItems] = useState([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true);
  const load = () => api.get('/clientes', { params: search ? { search } : {} }).then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const passwordAction = async (item) => {
    const activation = !item.cuenta_id;
    const result = await Swal.fire({ title: activation ? 'Activar cuenta' : 'Restablecer contraseña', text: item.nombre_completo, input: 'password', inputLabel: 'Contraseña temporal', inputPlaceholder: 'Mínimo 10 caracteres', showCancelButton: true, confirmButtonText: activation ? 'Activar' : 'Restablecer', confirmButtonColor: '#3FAE9A', inputValidator: (value) => value.length < 10 ? 'Debe tener al menos 10 caracteres.' : undefined });
    if (!result.isConfirmed) return;
    try { await api.post(`/clientes/${item.id}/${activation ? 'activar-cuenta' : 'restablecer-password'}`, { password: result.value }); await Swal.fire({ icon: 'success', title: activation ? 'Cuenta activada' : 'Contraseña restablecida', text: 'El cliente deberá cambiar la contraseña temporal al ingresar.', confirmButtonColor: '#3FAE9A' }); load(); } catch (error) { Swal.fire('No se completó', error.response?.data?.message || 'Inténtalo nuevamente.', 'error'); }
  };
  const statusAction = async (item) => {
    const activate = !item.cuenta_activa;
    const result = await Swal.fire({
      title: activate ? 'Reactivar cuenta' : 'Inactivar cuenta',
      text: activate ? `¿Permitir nuevamente el acceso de ${item.nombre_completo}?` : 'El cliente perderá sus sesiones abiertas, pero se conservará todo su historial.',
      input: activate ? undefined : 'textarea',
      inputLabel: activate ? undefined : 'Motivo obligatorio',
      inputPlaceholder: activate ? undefined : 'Ej.: solicitudes reiteradas sin retiro…',
      showCancelButton: true,
      confirmButtonText: activate ? 'Reactivar' : 'Inactivar',
      confirmButtonColor: activate ? '#3FAE9A' : '#F2705B',
      inputValidator: activate ? undefined : (value) => String(value || '').trim().length < 5 ? 'Explique el motivo en al menos 5 caracteres.' : undefined,
    });
    if (!result.isConfirmed) return;
    try {
      await api.patch(`/clientes/${item.id}/estado-cuenta`, { estado: activate, motivo: result.value || '' });
      await Swal.fire({ icon: 'success', title: activate ? 'Cuenta reactivada' : 'Cuenta inactivada', confirmButtonColor: '#3FAE9A' });
      load();
    } catch (error) { Swal.fire('No se completó', error.response?.data?.message || 'Inténtalo nuevamente.', 'error'); }
  };
  return <><PageHeader icon="fa-address-card" title="Clientes" subtitle="Consulta cuentas y resuelve activaciones, bloqueos o contraseñas" /><div className="card mb-3"><form className="card-body d-flex flex-column flex-md-row gap-2" onSubmit={(e) => { e.preventDefault(); setLoading(true); load(); }}><input className="form-control" placeholder="Buscar por nombre o cédula" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="btn btn-primary"><i className="fas fa-search me-2" />Buscar</button></form></div>{loading ? <div className="page-loader"><span className="spinner-border text-success" /></div> : !items.length ? <EmptyState title="Sin clientes" text="No existen registros que coincidan con la búsqueda." /> : <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Cliente</th><th>Contacto</th><th>Cuenta</th><th>Último acceso</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.nombre_completo}</strong><small className="d-block text-muted">{item.identificacion}</small></td><td>{item.telefono || item.correo}</td><td><span className={`badge bg-${item.cuenta_activa ? 'success' : 'secondary'}`}>{item.cuenta_id ? item.cuenta_activa ? 'Activa' : 'Inactiva' : 'Sin cuenta'}</span>{item.debe_cambiar_password && <small className="d-block text-warning fw-bold">Cambio pendiente</small>}{item.motivo_inactivacion && <small className="d-block text-danger">{item.motivo_inactivacion}</small>}</td><td>{formatDateTime(item.ultimo_acceso)}</td><td className="text-end"><div className="d-flex flex-wrap gap-2 justify-content-end"><button className="btn btn-sm btn-outline-primary" onClick={() => passwordAction(item)}>{item.cuenta_id ? 'Restablecer' : 'Activar cuenta'}</button>{item.cuenta_id && <button className={`btn btn-sm ${item.cuenta_activa ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => statusAction(item)}>{item.cuenta_activa ? 'Inactivar' : 'Reactivar'}</button>}</div></td></tr>)}</tbody></table></div></div>}</>;
}
