import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('biblioteca_user')); } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('biblioteca_token')));

  useEffect(() => {
    if (!checking) return;
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('biblioteca_user', JSON.stringify(data.user));
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const value = useMemo(() => ({
    user,
    checking,
    async login(usuario, password) {
      const { data } = await api.post('/auth/login', { usuario, password });
      localStorage.setItem('biblioteca_token', data.token);
      localStorage.setItem('biblioteca_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    },
    logout() {
      localStorage.removeItem('biblioteca_token');
      localStorage.removeItem('biblioteca_user');
      setUser(null);
    },
  }), [user, checking]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function Protected({ children, roles }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <div className="page-loader"><span className="spinner-border text-success" /></div>;
  if (!user) return <Navigate to="/personal/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/panel" replace />;
  return children;
}

