import { Link, NavLink, Outlet } from 'react-router-dom';
import { useRequest } from '../state/RequestContext.jsx';
import { useClientAuth } from '../state/ClientAuthContext.jsx';

export default function PublicLayout() {
  const { items } = useRequest();
  const { user, logout } = useClientAuth();
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="container d-flex align-items-center justify-content-between gap-3 py-3">
          <Link to="/" className="public-brand" data-easter-trigger>
            <img src="/assets/logo.jpg" alt="Municipio de Jipijapa" />
            <span><strong>Biblioteca Municipal</strong><small>Jipijapa · Patrimonio y conocimiento</small></span>
          </Link>
          <nav className="d-flex align-items-center gap-2 gap-md-3">
            <NavLink to="/" className="public-nav-link d-none d-sm-inline-flex">Catálogo</NavLink>
            <Link to="/solicitud" className="btn btn-primary position-relative">
              <i className="fas fa-book-open-reader me-2" />Solicitud
              {items.length > 0 && <span className="cart-count">{items.length}</span>}
            </Link>
            {user ? <div className="public-account-actions"><Link to="/mi-cuenta" className="btn btn-outline-success"><i className="fas fa-user me-md-2" /><span className="d-none d-md-inline">Mi cuenta</span></Link><button type="button" className="btn btn-light d-none d-lg-inline-flex align-items-center gap-2" onClick={logout} title="Cerrar sesión"><i className="fas fa-right-from-bracket" /><span>Salir</span></button></div>
              : <Link to="/cuenta/login" className="btn btn-outline-success"><i className="fas fa-user me-md-2" /><span className="d-none d-md-inline">Ingresar</span></Link>}
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="public-footer">
        <div className="container py-4 d-flex flex-column flex-md-row justify-content-between gap-2">
          <span>© {new Date().getFullYear()} Municipio de Jipijapa · Biblioteca Municipal</span>
          {!user && <Link to="/personal/login">Acceso del personal</Link>}
        </div>
      </footer>
    </div>
  );
}
