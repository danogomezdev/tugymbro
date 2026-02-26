import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, AlertCircle, LogOut, ChevronRight, Layers, Activity } from 'lucide-react';
import { superApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    superApi.get('/stats').then(r => setStats(r.data)).catch(console.error);
  }, []);

  const cards = [
    {
      label: 'Gimnasios activos',
      value: stats?.gimnasios_activos ?? '—',
      sub: `${stats?.gimnasios_total ?? 0} total`,
      icon: Building2, color: 'text-green-400', bg: 'bg-green-500/10',
      link: '/superadmin/gimnasios'
    },
    {
      label: 'Usuarios totales',
      value: stats?.usuarios_total ?? '—',
      sub: 'en todos los gyms',
      icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10',
      link: '/superadmin/usuarios'
    },
    {
      label: 'Solicitudes pendientes',
      value: stats?.solicitudes_pendientes ?? '—',
      sub: 'esperando revisión',
      icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10',
      link: '/superadmin/solicitudes'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">🏋️ TGB Platform</h1>
            <p className="text-gray-500 text-xs">Bienvenido, {usuario?.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex gap-1">
              {[
                { label: 'Dashboard',   path: '/superadmin' },
                { label: 'Gimnasios',   path: '/superadmin/gimnasios' },
                { label: 'Usuarios',    path: '/superadmin/usuarios' },
                { label: 'Solicitudes', path: '/superadmin/solicitudes' },
                { label: 'Planes',      path: '/superadmin/planes' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  {item.label}
                </button>
              ))}
            </nav>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-500 mt-1">Resumen de la plataforma</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {cards.map((card, i) => (
            <button key={i} onClick={() => navigate(card.link)}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left hover:border-gray-600 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bg}`}>
                  <card.icon className={card.color} size={22} />
                </div>
                <ChevronRight className="text-gray-700 group-hover:text-gray-400 transition-colors" size={18} />
              </div>
              <p className="text-3xl font-black text-white">{card.value}</p>
              <p className="text-gray-600 text-xs mt-0.5">{card.sub}</p>
              <p className="text-gray-400 text-sm mt-1">{card.label}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Building2, label: 'Gimnasios',   desc: 'Ver, suspender o cambiar planes', path: '/superadmin/gimnasios',   color: 'text-blue-400' },
            { icon: Users,     label: 'Usuarios',    desc: 'Ver toda la cartera de clientes', path: '/superadmin/usuarios',    color: 'text-green-400' },
            { icon: Layers,    label: 'Planes',      desc: 'Editá precios y features',        path: '/superadmin/planes',      color: 'text-purple-400' },
          ].map((item, i) => (
            <button key={i} onClick={() => navigate(item.path)}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left hover:border-gray-600 transition-all group flex items-center gap-4">
              <div className="p-3 bg-gray-800 rounded-xl group-hover:bg-gray-700 transition-colors flex-shrink-0">
                <item.icon className={item.color} size={20} />
              </div>
              <div>
                <p className="font-bold text-white">{item.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight className="text-gray-700 group-hover:text-gray-400 ml-auto transition-colors" size={16} />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
