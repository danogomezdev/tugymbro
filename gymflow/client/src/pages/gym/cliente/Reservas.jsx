import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Users, Check, AlertTriangle, Lock, CreditCard } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function Reservas() {
  const { gymSlug } = useParams();
  const { usuario, gimnasio } = useAuth();
  const navigate = useNavigate();
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());
  const [horarios, setHorarios] = useState([]);
  const [modoLibre, setModoLibre] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  const [misReservasSemana, setMisReservasSemana] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [reservando, setReservando] = useState(null);
  const [gymConfig, setGymConfig] = useState(null);

  const planLimites = { '1_dia':1, '2_dias':2, '3_dias':3, '4_dias':4, '5_dias':5, 'libre':999 };

  // Plan activo = tiene plan Y fecha de vencimiento futura
  const planActivo = usuario?.plan &&
  usuario?.fecha_vencimiento_pago &&
  new Date(usuario.fecha_vencimiento_pago) > new Date();

  const limite = gymConfig?.plan_libre ? 999 : (planLimites[usuario?.plan] || 3);

  const inicioSemana = startOfWeek(addDays(new Date(), semanaOffset * 7), { weekStartsOn: 1 });
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  useEffect(() => {
    api.get(`/gym/${gymSlug}/cliente/pagos/configuracion`)
      .then(({ data }) => setGymConfig(data.config))
      .catch(() => {});
  }, [gymSlug]);

  useEffect(() => { cargarDisponibilidad(diaSeleccionado); }, [diaSeleccionado]);
  useEffect(() => { cargarReservasSemana(); }, [semanaOffset]);

  const cargarDisponibilidad = async (fecha) => {
    setCargando(true);
    try {
      const { data } = await api.get(`/gym/${gymSlug}/cliente/reservas/disponibilidad/${format(fecha, 'yyyy-MM-dd')}`);
      setHorarios(data.horarios || []);
      setModoLibre(data.modo_libre || false);
      setCerrado(data.cerrado || false);
    } catch { toast.error('Error al cargar horarios'); }
    finally { setCargando(false); }
  };

  const cargarReservasSemana = async () => {
    try {
      const { data } = await api.get(`/gym/${gymSlug}/cliente/reservas?mes=${inicioSemana.getMonth()+1}&anio=${inicioSemana.getFullYear()}`);
      setMisReservasSemana(data.reservas.filter(r => r.estado !== 'cancelada'));
    } catch {}
  };

  const reservasEstaSemana = misReservasSemana.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return f >= inicioSemana && f <= addDays(inicioSemana, 6);
  });

  const tengoReservaEseDia = (fecha) => misReservasSemana.some(r => isSameDay(new Date(r.fecha + 'T00:00:00'), fecha));

  const esDiaAbierto = (fecha) => {
    if (!gymConfig) return true;
    if (gymConfig.abierto_24h) return true;
    const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const diaSemana = dias[fecha.getDay()];
    const diasAbierto = Array.isArray(gymConfig.dias_abierto) && gymConfig.dias_abierto.length > 0 ? gymConfig.dias_abierto : null;
    if (!diasAbierto) return true;
    return diasAbierto.includes(diaSemana);
  };

  const reservar = async (horarioId = null) => {
    if (!planActivo) { toast.error('Necesitás un plan activo para reservar.'); return; }
    if (usuario?.bloqueado) { toast.error('Tu cuenta está bloqueada.'); return; }
    if (limite < 999 && reservasEstaSemana.length >= limite) { toast.error(`Ya alcanzaste el límite de ${limite} clases para esta semana.`); return; }
    if (tengoReservaEseDia(diaSeleccionado)) { toast.error('Ya tenés una reserva para ese día.'); return; }

    setReservando(horarioId || 'libre');
    try {
      await api.post(`/gym/${gymSlug}/cliente/reservas`, {
        horario_id: horarioId,
        fecha: format(diaSeleccionado, 'yyyy-MM-dd')
      });
      toast.success('✅ Reserva confirmada!');
      cargarDisponibilidad(diaSeleccionado);
      cargarReservasSemana();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al reservar'); }
    finally { setReservando(null); }
  };

  const color = gimnasio?.color_primario || '#f97316';

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Reservar turno</h1>
          {planActivo && limite < 999 && (
            <p className="text-gray-500 text-sm mt-0.5">
              Esta semana: <span className={reservasEstaSemana.length >= limite ? 'text-red-400' : 'text-orange-500'}>{reservasEstaSemana.length}/{limite}</span>
            </p>
          )}
        </div>

        {/* Sin plan activo — bloqueo total */}
        {!planActivo && (
          <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-6 mb-4 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: '#eab30820' }}>
              <CreditCard className="text-yellow-500" size={22} />
            </div>
            <p className="font-bold text-white mb-1">Necesitás un plan activo</p>
            <p className="text-gray-400 text-sm mb-4">Para reservar turnos primero tenés que contratar un plan y que el gimnasio lo apruebe.</p>
            <button onClick={() => navigate(`/gym/${gymSlug}/pagar`)}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: color }}>
              Ver planes
            </button>
          </div>
        )}

        {/* Alerta cuenta bloqueada */}
        {usuario?.bloqueado && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
            <p className="text-red-300 text-sm">Tu cuenta está bloqueada. No podés hacer reservas.</p>
          </div>
        )}

        {/* Calendario — siempre visible pero botones deshabilitados sin plan */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setSemanaOffset(o => o - 1)} className="text-gray-400 hover:text-white p-1"><ChevronLeft size={18} /></button>
            <span className="text-sm font-medium text-white capitalize">
              {format(inicioSemana, "d 'de' MMMM", { locale: es })} — {format(addDays(inicioSemana, 6), "d 'de' MMMM", { locale: es })}
            </span>
            <button onClick={() => setSemanaOffset(o => o + 1)} className="text-gray-400 hover:text-white p-1"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasSemana.map(dia => {
              const pasado = isPast(dia) && !isToday(dia);
              const seleccionado = isSameDay(dia, diaSeleccionado);
              const tieneReserva = tengoReservaEseDia(dia);
              const abierto = esDiaAbierto(dia);
              return (
                <button key={dia.toISOString()} onClick={() => !pasado && setDiaSeleccionado(dia)}
                  disabled={pasado}
                  className={`flex flex-col items-center py-2 px-0.5 rounded-xl transition-all text-center ${
                    seleccionado ? 'text-white' :
                    pasado || !abierto ? 'opacity-30 cursor-not-allowed text-gray-600' :
                    'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                  style={seleccionado ? { backgroundColor: color } : {}}>
                  <span className="text-xs font-medium capitalize">{format(dia, 'EEE', { locale: es })}</span>
                  <span className="text-sm font-bold mt-0.5">{format(dia, 'd')}</span>
                  {tieneReserva && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${seleccionado ? 'bg-white' : 'bg-orange-500'}`} />}
                  {!abierto && !pasado && <Lock size={9} className="mt-0.5 text-gray-600" />}
                </button>
              );
            })}
          </div>
        </div>

        <h2 className="font-bold text-white mb-3 text-sm capitalize">
          {format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}
        </h2>

        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : cerrado ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-10">
            <Lock className="text-gray-700 mx-auto mb-2" size={36} />
            <p className="text-gray-500 text-sm font-medium">El gimnasio está cerrado este día</p>
          </div>
        ) : modoLibre ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: color + '20' }}>
                <Clock style={{ color }} size={22} />
              </div>
              <h3 className="font-bold text-white mb-1">Acceso libre</h3>
              <p className="text-gray-400 text-sm">Este gimnasio no tiene horarios fijos, podés reservar cualquier momento del día.</p>
            </div>
            {tengoReservaEseDia(diaSeleccionado) ? (
              <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl py-3">
                <Check size={18} /> <span className="font-semibold text-sm">Ya reservaste este día</span>
              </div>
            ) : (
              <button onClick={() => reservar(null)}
                disabled={!planActivo || usuario?.bloqueado || reservando !== null}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:opacity-90"
                style={{ backgroundColor: color }}>
                {reservando ? 'Reservando...' : 'Reservar este día'}
              </button>
            )}
          </div>
        ) : horarios.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-10">
            <Clock className="text-gray-700 mx-auto mb-2" size={36} />
            <p className="text-gray-500 text-sm">No hay horarios disponibles para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {horarios.map(h => {
              const yaReserve = tengoReservaEseDia(diaSeleccionado);
              return (
                <div key={h.id} className={`bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between ${h.lleno ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: color + '15' }}>
                      <Clock style={{ color }} size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{h.hora_inicio?.slice(0,5)} - {h.hora_fin?.slice(0,5)}</p>
                      {h.disponibles < 999 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users size={12} className="text-gray-500" />
                          <p className="text-gray-400 text-xs">{h.disponibles} lugares de {h.capacidad_maxima}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {yaReserve ? (
                    <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium"><Check size={15} /> Reservado</span>
                  ) : h.lleno ? (
                    <span className="text-red-400 text-sm font-medium">Sin lugar</span>
                  ) : (
                    <button onClick={() => reservar(h.id)}
                      disabled={!planActivo || usuario?.bloqueado || reservando === h.id}
                      className="py-2 px-4 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                      style={{ backgroundColor: color }}>
                      {reservando === h.id ? '...' : 'Reservar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
