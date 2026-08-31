import { Navigate, Route, Routes } from 'react-router-dom';
import { Protected } from './state/AuthContext.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import StaffLayout from './components/StaffLayout.jsx';
import Catalog from './pages/public/Catalog.jsx';
import BookDetail from './pages/public/BookDetail.jsx';
import RequestLoan from './pages/public/RequestLoan.jsx';
import RequestConfirmation from './pages/public/RequestConfirmation.jsx';
import Reader from './pages/public/Reader.jsx';
import Login from './pages/staff/Login.jsx';
import Dashboard from './pages/staff/Dashboard.jsx';
import Requests from './pages/staff/Requests.jsx';
import Loans from './pages/staff/Loans.jsx';
import AdminCatalog from './pages/staff/AdminCatalog.jsx';
import StaffAccounts from './pages/staff/StaffAccounts.jsx';
import Movements from './pages/staff/Movements.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Catalog />} />
        <Route path="/libros/:id" element={<BookDetail />} />
        <Route path="/libros/:id/leer" element={<Reader />} />
        <Route path="/solicitud" element={<RequestLoan />} />
        <Route path="/solicitud/confirmacion/:codigo" element={<RequestConfirmation />} />
      </Route>
      <Route path="/personal/login" element={<Login />} />
      <Route element={<Protected><StaffLayout /></Protected>}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/panel/solicitudes" element={<Requests />} />
        <Route path="/panel/prestamos" element={<Loans />} />
        <Route path="/panel/catalogo" element={<AdminCatalog />} />
        <Route path="/panel/personal" element={<Protected roles={['administrador']}><StaffAccounts /></Protected>} />
        <Route path="/panel/movimientos" element={<Protected roles={['administrador']}><Movements /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

