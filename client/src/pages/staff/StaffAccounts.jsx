import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { formatDateTime } from '../../lib/format.js';

export default function StaffAccounts() {
  const [items, setItems] = useState([]);
  const load = () => api.get('/admin/personal').then(({ data }) => setItems(data.items));
  useEffect(() => { load(); }, []);
  const create = async () => {
    const result = await Swal.fire({ title: 'Nueva cuenta', html: '<input id="staff-name" class="swal2-input" placeholder="Nombre completo"><input id="staff-user" class="swal2-input" placeholder="Usuario"><input id="staff-pass" type="password" class="swal2-input" placeholder="Contraseña temporal (10+) "><select id="staff-role" class="swal2-select"><option value="bibliotecario">Bibliotecario</option><option value="administrador">Administrador</option></select>', showCancelButton: true, confirmButtonText: 'Crear', confirmButtonColor: '#3FAE9A', preConfirm: () => ({ nombre_completo: document.getElementById('staff-name').value, usuario: document.getElementById('staff-user').value, password: document.getElementById('staff-pass').value, rol: document.getElementById('staff-role').value }) });
    if (!result.isConfirmed) return;
    try { await api.post('/admin/personal', result.value); load(); } catch (error) { Swal.fire('No se creó', error.response?.data?.message, 'error'); }
  };
  const reset = async (item) => {
    const result = await Swal.fire({ title: `Restablecer contraseña`, text: item.nombre_completo, input: 'password', inputPlaceholder: 'Nueva contraseña (10+)', showCancelButton: true, confirmButtonColor: '#F2705B' });
    if (!result.isConfirmed) return;
    try { await api.post(`/admin/personal/${item.id}/restablecer-password`, { password: result.value }); Swal.fire('Actualizada', 'La nueva contraseña ya está activa.', 'success'); } catch (error) { Swal.fire('No se actualizó', error.response?.data?.message, 'error'); }
  };
  const toggle = async (item) => { await api.patch(`/admin/personal/${item.id}`, { nombre_completo: item.nombre_completo, usuario: item.usuario, rol: item.rol, estado: !item.estado }); load(); };
  return <><PageHeader icon="fa-users-gear" title="Personal" subtitle="Cuentas de bibliotecarios y administradores" actions={<button className="btn btn-primary" onClick={create}><i className="fas fa-user-plus me-2" />Nueva cuenta</button>} />
    <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="fw-bold">{item.nombre_completo}</td><td>{item.usuario}</td><td className="text-capitalize">{item.rol}</td><td>{formatDateTime(item.ultimo_acceso)}</td><td><span className={`badge bg-${item.estado ? 'success' : 'secondary'}`}>{item.estado ? 'Activo' : 'Inactivo'}</span></td><td><div className="d-flex gap-2 justify-content-end">{item.rol === 'bibliotecario' && <button className="btn btn-sm btn-outline-primary" onClick={() => reset(item)}>Contraseña</button>}<button className="btn btn-sm btn-light" onClick={() => toggle(item)}>{item.estado ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody></table></div></div>
  </>;
}

