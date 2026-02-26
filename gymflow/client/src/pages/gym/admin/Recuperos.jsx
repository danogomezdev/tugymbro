import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, ArrowLeft, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const formatFecha = (fecha) => {
  if (!fecha) return '-';
  const str = typeof fecha === 'string' ? fecha : fecha.toString();
  try { return format(new Date(str.includes('T') ? str : str + 'T00:00:00'), "EEEE d/MM", { locale: es }); }
  catch { return '-'; }
};

export default function GymRecuperos() {
  const { gymSlug } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('pendiente');
  const [modalRechazo, setModalRechazo] = useState(null);
  const [motivo, setMotivo] = useState('');

  useEffect(() => { cargarSolicitudes(); }, [filtro, gymSlug]);

  const cargarSolicitudes = async () => {
    setCargando(true);
    try {
      const { data } = await api.get(`/gym/${gymSlug}/admin/recuperos/solicitudes?estado=${filtro}`);
      setSolicitudes(data.solicitudes);
    } catch { toast.error('Error al cargar solicitudes'); }
    finally { setCargando(false); }
  };

  const aprobar = async (id) => {
    try {
      await api.put(`/gym/${gymSlug}/admin/recuperos/solicitudes/${id}`, { estado: 'aprobado' });
      toast.success('Recupero aprobado');
      cargarSolicitudes();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al aprobar'); }
  };

  const rechazar = async () => {
    try {
      await api.put(`/gym/${gymSlug}/admin/recuperos/solicitudes/${modalRechazo}`, { estado: 'rechazado', notas: motivo });
      toast.success('Rechazado');
      setModalRechazo(null); setMotivo('');
      cargarSolicitudes();
    } catch { toast.error('Error al rechazar'); }
  };

  const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente').length;

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-white">Recuperos</h1>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 p-2"><LogOut size={18}/></button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {['pendiente', 'aprobado', 'rechazado'].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filtro === e ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {e}
              {e === 'pendiente' && pendientesCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendientesCount}</span>
              )}
            </button>
          ))}
        </div>
        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : solicitudes.length === 0 ? (
          <div className="card text-center py-16">
            <RefreshCw className="text-gray-700 mx-auto mb-3" size={48}/>
            <p className="text-gray-500">No hay solicitudes {filtro === 'pendiente' ? 'pendientes' : filtro === 'aprobado' ? 'aprobadas' : 'rechazadas'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudes.map(s => (
              <div key={s.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">{s.nombre} {s.apellido}</p>
                    <p className="text-gray-400 text-sm">{s.email}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        <span className="text-red-400 font-medium">Ausencia:</span> <span className="capitalize">{formatFecha(s.fecha_ausencia)}</span> {s.hora_ausencia && `a las ${s.hora_ausencia.slice(0,5)}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="text-orange-400 font-medium">Quiere recuperar:</span> <span className="capitalize">{formatFecha(s.fecha_recupero)}</span> {s.hora_inicio && `· ${s.hora_inicio.slice(0,5)} - ${s.hora_fin?.slice(0,5)}`}
                      </p>
                    </div>
                    {s.notas_admin && <p className="text-red-400 text-xs mt-1">Motivo: {s.notas_admin}</p>}
                  </div>
                  {s.estado === 'pendiente' ? (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => aprobar(s.id)} className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors">
                        <CheckCircle size={15}/> Aprobar
                      </button>
                      <button onClick={() => setModalRechazo(s.id)} className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors">
                        <XCircle size={15}/> Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${s.estado === 'aprobado' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {s.estado === 'aprobado' ? '✅ Aprobado' : '❌ Rechazado'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {modalRechazo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-4">Rechazar recupero</h3>
            <label className="block text-sm text-gray-300 mb-1.5">Motivo</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} className="input-field resize-none" rows={3} placeholder="Ej: No hay lugar en ese horario"/>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setModalRechazo(null); setMotivo(''); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={rechazar} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg flex-1 transition-colors">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
