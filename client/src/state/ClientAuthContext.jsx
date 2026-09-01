import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clientApi } from '../api.js';

const ClientAuthContext = createContext(null);
const tokenKey = 'biblioteca_cliente_token';
const userKey = 'biblioteca_cliente_user';

export function ClientAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey)); } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(tokenKey)));

  const saveSession = (data) => {
    localStorage.setItem(tokenKey, data.token);
    localStorage.setItem(userKey, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    setUser(null);
  };

  useEffect(() => {
    const closed = () => setUser(null);
    window.addEventListener('biblioteca:cliente-sesion-cerrada', closed);
    if (checking) {
      clientApi.get('/clientes/auth/me')
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem(userKey, JSON.stringify(data.user));
        })
        .catch(logout)
        .finally(() => setChecking(false));
    }
    return () => window.removeEventListener('biblioteca:cliente-sesion-cerrada', closed);
  }, []);

  const value = useMemo(() => ({
    user,
    checking,
    async login(identificacion, password) {
      const { data } = await clientApi.post('/clientes/auth/login', { identificacion, password });
      return saveSession(data);
    },
    async register(payload) {
      const { data } = await clientApi.post('/clientes/auth/registro', payload);
      return saveSession(data);
    },
    async activate(payload) {
      const { data } = await clientApi.post('/clientes/auth/activar', payload);
      return saveSession(data);
    },
    async changePassword(payload) {
      const { data } = await clientApi.post('/clientes/auth/cambiar-password', payload);
      return saveSession(data);
    },
    updateUser(next) {
      localStorage.setItem(userKey, JSON.stringify(next));
      setUser(next);
    },
    logout,
  }), [user, checking]);

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export const useClientAuth = () => useContext(ClientAuthContext);

export function ClientProtected({ children, allowPasswordChange = false }) {
  const { user, checking } = useClientAuth();
  const location = useLocation();
  if (checking) return <div className="page-loader"><span className="spinner-border text-success" /></div>;
  if (!user) return <Navigate to="/cuenta/login" state={{ from: location }} replace />;
  if (user.debe_cambiar_password && !allowPasswordChange) return <Navigate to="/mi-cuenta/seguridad" replace />;
  return children;
}
