import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, CreditCard, Dumbbell, RefreshCw, Bell, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../../context/AuthContext';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';

const planLabels = { '1_dia':'1 día/semana', '2_dias':'2 días/semana', '3_dias':'3 días/semana', '4_dias':'4 días/semana', '5_dias':'5 días/semana', 'libre':'Acceso libre' };

export default function ClienteHome() {
  const { gymSlug } = useParams();
  const { usuario, gimnasio } = useAuth();
  const navigate = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notifNoLeidas, setNotifNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const mes = new Date().getMonth() + 1;
        const anio = new Date().getFullYear();
        const [resReservas, resNotif, resNoLeidas] = await Promise.allSettled([
          api.get(`/gym/${gymSlug}/cliente/reservas?mes=${mes}&anio=${anio}`),
          api.get(`/gym/${gymSlug}/cliente/notificaciones`),
          api.get(`/gym/${gymSlug}/cliente/notificaciones/no-leidas`),
        ]);
        if (resReservas.status === 'fulfilled') setReservas(resReservas.value.data.reservas || []);
        if (resNotif.status === 'fulfilled') setNotificaciones(resNotif.value.data.notificaciones?.slice(0,4) || []);
        if (resNoLeidas.status === 'fulfilled') setNotifNoLeidas(resNoLeidas.value.data.cantidad || 0);
      } finally { setCargando(false); }
    };
    cargar();
  }, [gymSlug]);

  const reservasConfirmadas = reservas.filter(r => r.estado === 'confirmada');
  const vencida = usuario?.fecha_vencimiento_pago && new Date(usuario.fecha_vencimiento_pago) < new Date();
  const color = gimnasio?.color_primario || '#f97316';
  const sinPlan = !usuario?.plan || usuario.plan === '3_dias'; // Default - mostrar botón contratar

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente notifCount={notifNoLeidas} />
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Alertas */}
        {usuario?.bloqueado && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 mb-4 flex items-start gap-3">
            <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
            <div>
              <p className="font-semibold text-red-400 text-sm">Cuenta bloqueada</p>
              <p className="text-red-300 text-xs mt-0.5">{usuario.motivo_bloqueo || 'Contactá al gimnasio.'}</p>
            </div>
          </div>
        )}
        {!usuario?.bloqueado && vencida && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-3 mb-4 flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" size={16} />
            <div>
              <p className="font-semibold text-yellow-400 text-sm">Pago vencido</p>
              <p className="text-yellow-300 text-xs mt-0.5">Regularizá tu cuota.{' '}
                <button onClick={() => navigate(`/gym/${gymSlug}/pagar`)} className="underline font-semibold">Pagar ahora</button>
              </p>
            </div>
          </div>
        )}

        {/* Saludo */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">
            Hola, <span style={{ color }}>{usuario?.nombre}</span> 👋
          </h2>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
        </div>

        {/* Banner contratar plan — solo si NO tiene fecha de vencimiento futura */}
        {(() => {
          const tieneVencimientoActivo = usuario?.fecha_vencimiento_pago && new Date(usuario.fecha_vencimiento_pago) > new Date();
          if (tieneVencimientoActivo) return null;
          return (
            <div onClick={() => navigate(`/gym/${gymSlug}/pagar`)}
              className="rounded-2xl p-4 mb-5 cursor-pointer flex items-center justify-between hover:opacity-95 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`, border: `1px solid ${color}40` }}>
              <div>
                <p className="font-bold text-white text-sm">Contratá tu plan</p>
                <p className="text-gray-400 text-xs mt-0.5">Enviá el comprobante y activá tu membresía</p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ backgroundColor: color }}>
                Ver planes
              </span>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center p-3">
            <p className="text-2xl font-black" style={{ color }}>{reservasConfirmadas.length}</p>
            <p className="text-gray-500 text-xs mt-0.5">Reservas este mes</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center p-3">
            <p className="text-sm font-bold text-white">{planLabels[usuario?.plan] || 'Sin plan'}</p>
            <p className="text-gray-500 text-xs mt-0.5">Plan actual</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center p-3">
            <p className={`text-sm font-bold ${usuario?.bloqueado ? 'text-red-400' : 'text-green-400'}`}>
              {usuario?.bloqueado ? 'Bloqueada' : 'Activa'}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">Estado</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: Calendar, label: 'Reservar turno', sub: 'Ver horarios disponibles', path: 'reservas', colorStyle: { backgroundColor: color + '20', color } },
            { icon: CreditCard, label: 'Pagar cuota', sub: 'Enviá tu comprobante', path: 'pagar', colorStyle: { backgroundColor: '#22c55e20', color: '#22c55e' } },
            { icon: Dumbbell, label: 'Mi rutina', sub: 'Ver ejercicios', path: 'rutina', colorStyle: { backgroundColor: color + '20', color }, hide: !gimnasio?.feature_rutinas },
            { icon: RefreshCw, label: 'Recupero', sub: 'Recuperar clase', path: 'recupero', colorStyle: { backgroundColor: '#a855f720', color: '#a855f7' } },
          ].filter(i => !i.hide).map((item, i) => (
            <button key={i} onClick={() => navigate(`/gym/${gymSlug}/${item.path}`)}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left hover:border-gray-600 transition-all active:scale-95">
              <div className="inline-flex p-2.5 rounded-xl mb-2.5" style={item.colorStyle}>
                <item.icon size={18} />
              </div>
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.sub}</p>
            </button>
          ))}
        </div>

        {/* Próximas reservas */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-sm">Próximas reservas</h3>
            <button onClick={() => navigate(`/gym/${gymSlug}/mis-reservas`)} className="text-xs flex items-center gap-1" style={{ color }}>
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          {cargando ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />)}</div>
          ) : reservasConfirmadas.length === 0 ? (
            <div className="text-center py-5">
              <Calendar className="text-gray-700 mx-auto mb-2" size={28} />
              <p className="text-gray-500 text-sm mb-3">No tenés reservas este mes</p>
              <button onClick={() => navigate(`/gym/${gymSlug}/reservas`)}
                className="text-xs font-bold px-4 py-2 rounded-xl text-white"
                style={{ backgroundColor: color }}>+ Reservar</button>
            </div>
          ) : (
            <div className="space-y-2">
              {reservasConfirmadas.slice(0,3).map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-2.5">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: color + '15' }}>
                    <Calendar style={{ color }} size={13} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white capitalize">
                      {r.fecha ? format(new Date(r.fecha.toString().includes('T') ? r.fecha : r.fecha + 'T00:00:00'), "EEEE d/MM", { locale: es }) : ''}
                    </p>
                    <p className="text-xs text-gray-400">{r.hora_inicio?.slice(0,5)} - {r.hora_fin?.slice(0,5)}</p>
                  </div>
                  <CheckCircle className="text-green-500 flex-shrink-0" size={14} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notificaciones recientes */}
        {notificaciones.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Bell size={13} style={{ color }} /> Notificaciones
              </h3>
              <button onClick={() => navigate(`/gym/${gymSlug}/notificaciones`)} className="text-xs flex items-center gap-1" style={{ color }}>
                Ver todas <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {notificaciones.map(n => (
                <div key={n.id} className={`p-2.5 rounded-xl border-l-2 ${
                  n.tipo === 'error' ? 'bg-red-900/20 border-red-500' :
                  n.tipo === 'pago' ? 'bg-green-900/20 border-green-500' :
                  n.tipo === 'advertencia' ? 'bg-yellow-900/20 border-yellow-500' :
                  'bg-gray-800/50 border-orange-500'
                }`}>
                  <p className="text-xs font-medium text-white">{n.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.mensaje}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
