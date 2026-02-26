import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './pages/landing/Landing';
import RegistroGym from './pages/landing/RegistroGym';
import SuperAdminLogin from './pages/superadmin/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import SuperAdminGimnasios from './pages/superadmin/Gimnasios';
import SuperAdminSolicitudes from './pages/superadmin/Solicitudes';
import SuperAdminPlanes from './pages/superadmin/Planes';
import SuperAdminUsuarios from './pages/superadmin/Usuarios';

import GymLanding from './pages/gym/GymLanding';
import GymDashboard from './pages/gym/admin/Dashboard';
import GymClientes from './pages/gym/admin/Clientes';
import GymProfesores from './pages/gym/admin/Profesores';
import GymConfiguracion from './pages/gym/admin/Configuracion';
import GymRutinas from './pages/gym/admin/Rutinas';
import RutinaCliente from './pages/gym/admin/RutinaCliente';
import GymTurnos from './pages/gym/admin/Turnos';
import GymPagos from './pages/gym/admin/Pagos';
import GymRecuperos from './pages/gym/admin/Recuperos';

import ClienteHome from './pages/gym/cliente/Home';
import ClienteReservas from './pages/gym/cliente/Reservas';
import ClienteMisReservas from './pages/gym/cliente/MisReservas';
import ClientePagar from './pages/gym/cliente/Pagar';
import ClienteRecupero from './pages/gym/cliente/Recupero';
import ClienteNotificaciones from './pages/gym/cliente/Notificaciones';
import ClienteMiRutina from './pages/gym/cliente/MiRutina';

const Spinner = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
  </div>
);

// Rutas superadmin
const PrivateRoute = ({ children, roles }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner />;
  if (!usuario) return <Navigate to="/" />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" />;
  return children;
};

// Rutas de admin/profe del gym
const GymRoute = ({ children, roles }) => {
  const { gymSlug } = useParams();
  const { usuario, gimnasio, cargando } = useAuth();
  if (cargando) return <Spinner />;
  if (!usuario || !gimnasio) return <Navigate to={`/gym/${gymSlug}`} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={`/gym/${gymSlug}`} />;
  return children;
};

// Rutas de cliente — requiere login en este gym
const ClienteRoute = ({ children }) => {
  const { gymSlug } = useParams();
  const { usuario, gimnasio, cargando } = useAuth();
  if (cargando) return <Spinner />;
  if (!usuario || !gimnasio) return <Navigate to={`/gym/${gymSlug}`} />;
  // Si el gym del token no coincide con el gym de la URL, redirigir a landing
  if (gimnasio.slug !== gymSlug) return <Navigate to={`/gym/${gymSlug}`} />;
  if (usuario.rol === 'admin_gym' || usuario.rol === 'profesor') {
    return <Navigate to={`/gym/${gymSlug}/admin`} />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/registro-gym" element={<RegistroGym />} />

      <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      <Route path="/superadmin" element={<PrivateRoute roles={['superadmin']}><SuperAdminDashboard /></PrivateRoute>} />
      <Route path="/superadmin/gimnasios" element={<PrivateRoute roles={['superadmin']}><SuperAdminGimnasios /></PrivateRoute>} />
      <Route path="/superadmin/solicitudes" element={<PrivateRoute roles={['superadmin']}><SuperAdminSolicitudes /></PrivateRoute>} />
      <Route path="/superadmin/planes" element={<PrivateRoute roles={['superadmin']}><SuperAdminPlanes /></PrivateRoute>} />
      <Route path="/superadmin/usuarios" element={<PrivateRoute roles={['superadmin']}><SuperAdminUsuarios /></PrivateRoute>} />

      {/* Landing pública del gym — login + registro + info */}
      <Route path="/gym/:gymSlug" element={<GymLanding />} />

      {/* Admin del gym */}
      <Route path="/gym/:gymSlug/admin" element={<GymRoute roles={['admin_gym']}><GymDashboard /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/clientes" element={<GymRoute roles={['admin_gym','profesor']}><GymClientes /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/profesores" element={<GymRoute roles={['admin_gym']}><GymProfesores /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/configuracion" element={<GymRoute roles={['admin_gym']}><GymConfiguracion /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/rutinas" element={<GymRoute roles={['admin_gym','profesor']}><GymRutinas /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/rutinas/:usuarioId" element={<GymRoute roles={['admin_gym','profesor']}><RutinaCliente /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/turnos" element={<GymRoute roles={['admin_gym','profesor']}><GymTurnos /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/pagos" element={<GymRoute roles={['admin_gym']}><GymPagos /></GymRoute>} />
      <Route path="/gym/:gymSlug/admin/recuperos" element={<GymRoute roles={['admin_gym']}><GymRecuperos /></GymRoute>} />

      {/* Área del cliente autenticado */}
      <Route path="/gym/:gymSlug/home" element={<ClienteRoute><ClienteHome /></ClienteRoute>} />
      <Route path="/gym/:gymSlug/reservas" element={<ClienteRoute><ClienteReservas /></ClienteRoute>} />
      <Route path="/gym/:gymSlug/mis-reservas" element={<ClienteRoute><ClienteMisReservas /></ClienteRoute>} />
      <Route path="/gym/:gymSlug/pagar" element={<ClienteRoute><ClientePagar /></ClienteRoute>} />
      <Route path="/gym/:gymSlug/recupero" element={<ClienteRoute><ClienteRecupero /></ClienteRoute>} />
      <Route path="/gym/:gymSlug/notificaciones" element={<ClienteRoute><ClienteNotificaciones /></ClienteRoute>} />
      <Route path="/gym/:gymSlug/rutina" element={<ClienteRoute><ClienteMiRutina /></ClienteRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' } }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
