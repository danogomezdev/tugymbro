import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function Recupero() {
  const { gymSlug } = useParams();
  const [ausencias, setAusencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAusencia, setModalAusencia] = useState(null);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { cargarAusencias(); }, []);

  const cargarAusencias = async () => {
    setCargando(true);
    try {
      const { data } = await api.get(`/gym/${gymSlug}/cliente/recupero/mis-ausencias`);
      setAusencias(data.ausencias);
    } catch { toast.error('Error al cargar ausencias'); }
    finally { setCargando(false); }
  };

  const abrirModal = (ausencia) => {
    setModalAusencia(ausencia);
    setDiaSeleccionado(null);
    setHorarioSeleccionado(null);
    setHorariosDisponibles([]);
  };

  const seleccionarDia = async (fecha) => {
    setDiaSeleccionado(fecha);
    setHorarioSeleccionado(null);
    try {
      const { data } = await api.get(`/gym/${gymSlug}/cliente/reservas/disponibilidad/${format(fecha, 'yyyy-MM-dd')}`);
      setHorariosDisponibles(data.horarios.filter(h => !h.lleno));
    } catch { toast.error('Error al cargar horarios'); }
  };

  const enviarSolicitud = async () => {
    if (!diaSeleccionado || !horarioSeleccionado) { toast.error('Elegí un día y horario'); return; }
    setEnviando(true);
    try {
      await api.post(`/gym/${gymSlug}/cliente/recupero/solicitar`, {
        reserva_ausente_id: modalAusencia.id,
        horario_id: horarioSeleccionado,
        fecha_recupero: format(diaSeleccionado, 'yyyy-MM-dd')
      });
      toast.success('✅ Solicitud enviada!');
      setModalAusencia(null);
      cargarAusencias();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setEnviando(false); }
  };

  const diasSemanaAusencia = modalAusencia ? (() => {
    const fa = new Date(String(modalAusencia.fecha).includes('T') ? modalAusencia.fecha : modalAusencia.fecha + 'T00:00:00');
    const inicio = startOfWeek(fa, { weekStartsOn: 1 });
    return Array.from({ length: 6 }, (_, i) => addDays(inicio, i)).filter(d => d >= new Date());
  })() : [];

  const estadoBadge = (estado) => {
    if (!estado) return null;
    if (estado === 'pendiente') return <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Pendiente</span>;
    if (estado === 'aprobado') return <span className="text-xs bg-green-900/30 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Aprobado</span>;
    if (estado === 'rechazado') return <span className="text-xs bg-red-900/30 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Rechazado</span>;
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-1">Recupero de clases</h1>
        <p className="text-gray-500 text-sm mb-6">Si faltaste, podés recuperar en otro horario de la misma semana.</p>

        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : ausencias.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="text-green-500 mx-auto mb-3" size={44} />
            <p className="text-gray-400 font-medium">No tenés ausencias recientes</p>
            <p className="text-gray-600 text-sm mt-1">¡Seguí así! 💪</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ausencias.map(a => (
              <div key={a.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500/10 p-2 rounded-lg"><XCircle className="text-red-500" size={18} /></div>
                  <div>
                    <p className="font-semibold text-white text-sm capitalize">
                      {a.fecha ? format(new Date(String(a.fecha).includes('T') ? a.fecha : a.fecha + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es }) : '-'}
                    </p>
                    <p className="text-gray-400 text-xs">{a.hora_inicio?.slice(0,5)} - {a.hora_fin?.slice(0,5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {estadoBadge(a.recupero_estado)}
                  {!a.recupero_estado && (
                    <button onClick={() => abrirModal(a)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                      <RefreshCw size={12} /> Recuperar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalAusencia && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-white mb-1">Solicitar recupero</h3>
            <p className="text-gray-400 text-sm mb-5">
              Ausencia: <span className="text-white capitalize">
                {modalAusencia.fecha ? format(new Date(String(modalAusencia.fecha).includes('T') ? modalAusencia.fecha : modalAusencia.fecha + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es }) : '-'}
              </span>
            </p>
            <p className="text-sm font-medium text-gray-300 mb-3">Elegí el día (misma semana):</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {diasSemanaAusencia.map(dia => (
                <button key={dia.toISOString()} onClick={() => seleccionarDia(dia)}
                  className={`py-2 px-2 rounded-lg text-sm transition-colors text-center ${
                    diaSeleccionado && isSameDay(dia, diaSeleccionado) ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}>
                  <span className="block font-medium capitalize">{format(dia, 'EEE', { locale: es })}</span>
                  <span className="text-xs">{format(dia, 'd/MM')}</span>
                </button>
              ))}
            </div>
            {diaSeleccionado && (
              <>
                <p className="text-sm font-medium text-gray-300 mb-3">Elegí el horario:</p>
                {horariosDisponibles.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No hay horarios disponibles ese día</p>
                ) : (
                  <div className="space-y-2 mb-5">
                    {horariosDisponibles.map(h => (
                      <button key={h.id} onClick={() => setHorarioSeleccionado(h.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                          horarioSeleccionado === h.id ? 'bg-orange-500/20 border border-orange-500' : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                        }`}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-orange-500" />
                          <span className="text-white text-sm">{h.hora_inicio?.slice(0,5)} - {h.hora_fin?.slice(0,5)}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{h.disponibles} lugares</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalAusencia(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={enviarSolicitud} disabled={!horarioSeleccionado || enviando} className="btn-primary flex-1 disabled:opacity-40">
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
