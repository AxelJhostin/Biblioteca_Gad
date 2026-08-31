import { Link, NavLink, Outlet } from 'react-router-dom';
import { useRequest } from '../state/RequestContext.jsx';

export default function PublicLayout() {
  const { items } = useRequest();
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="container d-flex align-items-center justify-content-between gap-3 py-3">
          <Link to="/" className="public-brand">
            <img src="/assets/logo.jpg" alt="Municipio de Jipijapa" />
            <span><strong>Biblioteca Municipal</strong><small>Jipijapa · Patrimonio y conocimiento</small></span>
          </Link>
          <nav className="d-flex align-items-center gap-2 gap-md-3">
            <NavLink to="/" className="public-nav-link d-none d-sm-inline-flex">Catálogo</NavLink>
            <Link to="/solicitud" className="btn btn-primary position-relative">
              <i className="fas fa-book-open-reader me-2" />Solicitud
              {items.length > 0 && <span className="cart-count">{items.length}</span>}
            </Link>
            <Link to="/personal/login" className="btn btn-outline-success d-none d-md-inline-flex">Personal</Link>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="public-footer">
        <div className="container py-4 d-flex flex-column flex-md-row justify-content-between gap-2">
          <span>© {new Date().getFullYear()} Municipio de Jipijapa · Biblioteca Municipal</span>
          <Link to="/personal/login">Acceso del personal</Link>
        </div>
      </footer>
    </div>
  );
}

