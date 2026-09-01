import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Protected } from './state/AuthContext.jsx';
import { ClientProtected } from './state/ClientAuthContext.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import StaffLayout from './components/StaffLayout.jsx';
import EasterEgg from './components/EasterEgg.jsx';

const Catalog = lazy(() => import('./pages/public/Catalog.jsx'));
const BookDetail = lazy(() => import('./pages/public/BookDetail.jsx'));
const RequestLoan = lazy(() => import('./pages/public/RequestLoan.jsx'));
const RequestConfirmation = lazy(() => import('./pages/public/RequestConfirmation.jsx'));
const Reader = lazy(() => import('./pages/public/Reader.jsx'));
const Login = lazy(() => import('./pages/staff/Login.jsx'));
const Dashboard = lazy(() => import('./pages/staff/Dashboard.jsx'));
const Requests = lazy(() => import('./pages/staff/Requests.jsx'));
const Loans = lazy(() => import('./pages/staff/Loans.jsx'));
const AdminCatalog = lazy(() => import('./pages/staff/AdminCatalog.jsx'));
const StaffAccounts = lazy(() => import('./pages/staff/StaffAccounts.jsx'));
const Movements = lazy(() => import('./pages/staff/Movements.jsx'));
const StaffClients = lazy(() => import('./pages/staff/StaffClients.jsx'));
const ClientLogin = lazy(() => import('./pages/client/ClientLogin.jsx'));
const Register = lazy(() => import('./pages/client/Register.jsx'));
const Activate = lazy(() => import('./pages/client/Activate.jsx'));
const AccountDashboard = lazy(() => import('./pages/client/AccountDashboard.jsx'));
const LoanHistory = lazy(() => import('./pages/client/LoanHistory.jsx'));
const LoanDetail = lazy(() => import('./pages/client/LoanDetail.jsx'));
const Profile = lazy(() => import('./pages/client/Profile.jsx'));
const Security = lazy(() => import('./pages/client/Security.jsx'));

export default function App() {
  return (
    <>
    <EasterEgg />
    <Suspense fallback={<div className="page-loader"><span className="spinner-border text-success" /></div>}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Catalog />} />
        <Route path="/libros/:id" element={<BookDetail />} />
        <Route path="/libros/:id/leer" element={<Reader />} />
        <Route path="/solicitud" element={<RequestLoan />} />
        <Route path="/solicitud/confirmacion/:codigo" element={<RequestConfirmation />} />
        <Route path="/cuenta/login" element={<ClientLogin />} />
        <Route path="/cuenta/registro" element={<Register />} />
        <Route path="/cuenta/activar" element={<Activate />} />
        <Route path="/mi-cuenta" element={<ClientProtected><AccountDashboard /></ClientProtected>} />
        <Route path="/mi-cuenta/prestamos" element={<ClientProtected><LoanHistory /></ClientProtected>} />
        <Route path="/mi-cuenta/prestamos/:id" element={<ClientProtected><LoanDetail /></ClientProtected>} />
        <Route path="/mi-cuenta/perfil" element={<ClientProtected><Profile /></ClientProtected>} />
        <Route path="/mi-cuenta/seguridad" element={<ClientProtected allowPasswordChange><Security /></ClientProtected>} />
      </Route>
      <Route path="/personal/login" element={<Login />} />
      <Route element={<Protected><StaffLayout /></Protected>}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/panel/solicitudes" element={<Requests />} />
        <Route path="/panel/prestamos" element={<Loans />} />
        <Route path="/panel/catalogo" element={<AdminCatalog />} />
        <Route path="/panel/clientes" element={<StaffClients />} />
        <Route path="/panel/personal" element={<Protected roles={['administrador']}><StaffAccounts /></Protected>} />
        <Route path="/panel/movimientos" element={<Protected roles={['administrador']}><Movements /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}
