import { useState, useEffect } from 'react';
import { Users, Calendar, AlertTriangle, TrendingUp, Clock, UserCheck, FileCheck, RefreshCw, Bell, LogOut, Dumbbell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function GymDashboard() {
  const { gymSlug } = useParams();
  const { usuario, gimnasio, logout } = useAuth();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pendientes, setPendientes] = useState({ comprobantes: 0, recuperos: 0 });

  useEffect(() => {
    const cargar = async () => {
      try {
        const [dashRes, compRes, recRes] = await Promise.allSettled([
          api.get(`/gym/${gymSlug}/admin/dashboard`),
          api.get(`/gym/${gymSlug}/admin/pagos/solicitudes?estado=pendiente`),
          api.get(`/gym/${gymSlug}/admin/recuperos/solicitudes?estado=pendiente`),
        ]);
        if (dashRes.status === 'fulfilled') setDatos(dashRes.value.data);
        setPendientes({
          comprobantes: compRes.status === 'fulfilled' ? (compRes.value.data.solicitudes?.length || 0) : 0,
          recuperos:    recRes.status  === 'fulfilled' ? (recRes.value.data.solicitudes?.length  || 0) : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [gymSlug]);

  const stats = [
    { label: 'Total clientes',    valor: datos?.stats?.clientes,             icon: Users,         color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    { label: 'Reservas hoy',      valor: datos?.stats?.reservas_hoy,         icon: Calendar,      color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Reservas semana',   valor: datos?.stats?.reservas_semana,      icon: TrendingUp,    color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Pagos pendientes',  valor: datos?.stats?.pagos_pendientes,     icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Notificaciones',    valor: datos?.stats?.notificaciones_sin_leer, icon: Bell,       color: 'text-green-400',  bg: 'bg-green-400/10' },
    { label: 'Comprobantes',      valor: pendientes.comprobantes,            icon: FileCheck,     color: 'text-pink-400',   bg: 'bg-pink-400/10' },
  ];

  const alertas = [
    pendientes.comprobantes > 0 && {
      icon: FileCheck, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30',
      mensaje: `${pendientes.comprobantes} comprobante${pendientes.comprobantes > 1 ? 's' : ''} pendiente${pendientes.comprobantes > 1 ? 's' : ''} de aprobación`,
      path: 'pagos',
    },
    pendientes.recuperos > 0 && {
      icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30',
      mensaje: `${pendientes.recuperos} solicitud${pendientes.recuperos > 1 ? 'es' : ''} de recupero pendiente${pendientes.recuperos > 1 ? 's' : ''}`,
      path: 'recuperos',
    },
    datos?.stats?.pagos_pendientes > 0 && {
      icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30',
      mensaje: `${datos.stats.pagos_pendientes} cliente${datos.stats.pagos_pendientes > 1 ? 's' : ''} con pago pendiente`,
      path: 'pagos',
    },
  ].filter(Boolean);

  const color = gimnasio?.color_primario || '#f97316';
  const navItems = [
    { label: 'Dashboard',     path: '' },
    { label: 'Clientes',      path: 'clientes' },
    { label: 'Turnos',        path: 'turnos' },
    { label: 'Pagos',         path: 'pagos' },
    { label: 'Rutinas',       path: 'rutinas' },
    { label: 'Horarios',      path: 'configuracion?tab=horarios' },
    { label: 'Configuración', path: 'configuracion' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor:`${color}20`}}>
              <Dumbbell size={16} style={{color}}/>
            </div>
            <div>
              <p className="font-bold text-white text-sm">{gimnasio?.nombre}</p>
              <p className="text-gray-500 text-xs">{gimnasio?.plan_nombre} · {usuario?.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex gap-1">
              {navItems.map(item => (
                <button key={item.path} onClick={() => navigate(`/gym/${gymSlug}/admin/${item.path}`)}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  {item.label}
                </button>
              ))}
            </nav>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 p-2 transition-colors"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Alertas */}
        {!cargando && alertas.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={16} className="text-orange-500"/>
              <h2 className="text-sm font-semibold text-gray-300">Requieren atención</h2>
            </div>
            {alertas.map((a, i) => (
              <div key={i} className={`border rounded-xl p-4 flex items-center justify-between ${a.bg}`}>
                <div className="flex items-center gap-3">
                  <a.icon className={a.color} size={18}/>
                  <p className={`text-sm font-medium ${a.color}`}>{a.mensaje}</p>
                </div>
                <button onClick={() => navigate(`/gym/${gymSlug}/admin/${a.path}`)} className={`text-sm font-semibold ${a.color} hover:opacity-80`}>
                  Ver →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {stats.map(({ label, valor, icon: Icon, color: c, bg }) => (
            <div key={label} className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{label}</span>
                <div className={`${bg} p-2 rounded-lg`}>
                  <Icon className={c} size={18}/>
                </div>
              </div>
              <p className={`text-3xl font-black ${c}`}>
                {cargando ? '...' : (valor ?? 0)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico reservas semana */}
          <div className="card">
            <h2 className="font-bold text-white mb-4">Reservas esta semana</h2>
            {datos?.reservasSemana?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={datos.reservasSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                  <XAxis dataKey="dia" stroke="#6b7280" tick={{ fontSize: 12 }}/>
                  <YAxis stroke="#6b7280" tick={{ fontSize: 12 }}/>
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}/>
                  <Bar dataKey="cantidad" fill={color} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-600">Sin datos esta semana</div>
            )}
          </div>

          {/* Turnos de hoy */}
          <div className="card">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={18} className="text-orange-500"/>
              Turnos de hoy
            </h2>
            {cargando ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded animate-pulse"/>)}</div>
            ) : datos?.turnosHoy?.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No hay turnos hoy</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {datos?.turnosHoy?.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{t.nombre} {t.apellido}</p>
                      <p className="text-xs text-gray-500">{t.hora_inicio?.slice(0,5)} - {t.hora_fin?.slice(0,5)}</p>
                    </div>
                    <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">{t.estado}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate(`/gym/${gymSlug}/admin/turnos`)}
              className="btn-secondary text-sm w-full text-center block mt-4">
              Ver todos los turnos
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
