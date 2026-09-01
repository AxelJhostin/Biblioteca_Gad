import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

const baseMenu = [
  ['fa-gauge-high', 'Inicio', '/panel'],
  ['fa-inbox', 'Solicitudes', '/panel/solicitudes'],
  ['fa-right-left', 'Préstamos', '/panel/prestamos'],
  ['fa-book', 'Catálogo', '/panel/catalogo'],
  ['fa-address-card', 'Clientes', '/panel/clientes'],
];
const adminMenu = [
  ['fa-users-gear', 'Personal', '/panel/personal'],
  ['fa-clock-rotate-left', 'Movimientos', '/panel/movimientos'],
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menu = user?.rol === 'administrador' ? [...baseMenu, ['__sep', 'Administración'], ...adminMenu] : baseMenu;

  useEffect(() => () => document.body.classList.remove('sidebar-open', 'sidebar-collapsed'), []);
  const toggle = () => {
    if (window.innerWidth < 992) {
      setMobileOpen((open) => {
        document.body.classList.toggle('sidebar-open', !open);
        return !open;
      });
    } else document.body.classList.toggle('sidebar-collapsed');
  };
  const close = () => { setMobileOpen(false); document.body.classList.remove('sidebar-open'); };
  const exit = () => { logout(); navigate('/personal/login'); };

  return (
    <div className="app-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand" data-easter-trigger>
          <span className="brand-badge"><img src="/assets/logo.jpg" alt="Logo" /></span>
          <span className="brand-text">Biblioteca Municipal<small>JIPIJAPA</small></span>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav flex-column">
            {menu.map(([icon, label, route]) => icon === '__sep'
              ? <li className="sidebar-heading" key={label}>{label}</li>
              : <li className="nav-item" key={route}>
                <NavLink end={route === '/panel'} to={route} onClick={close} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <i className={`fas ${icon}`} /><span className="link-text">{label}</span>
                </NavLink>
              </li>)}
          </ul>
        </nav>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={close} />}
      <div className="app-content">
        <nav className="topbar navbar">
          <button className="btn btn-link sidebar-toggle" onClick={toggle} aria-label="Alternar menú"><i className="fas fa-bars" /></button>
          <span className="navbar-brand mb-0 h6 d-none d-md-inline">Sistema de Biblioteca</span>
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="avatar-circle">{user?.nombre_completo?.charAt(0).toUpperCase()}</span>
            <span className="d-none d-sm-block small"><strong className="d-block">{user?.nombre_completo}</strong><span className="text-muted text-capitalize">{user?.rol}</span></span>
            <button className="btn btn-light ms-2" onClick={exit} title="Cerrar sesión"><i className="fas fa-right-from-bracket" /></button>
          </div>
        </nav>
        <main className="content-area p-3 p-md-4"><Outlet /></main>
        <footer className="text-center text-muted small py-3">Municipio de Jipijapa · Biblioteca Municipal</footer>
      </div>
    </div>
  );
}
