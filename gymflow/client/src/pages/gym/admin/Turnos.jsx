import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle, XCircle, ArrowLeft, LogOut, Dumbbell } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const estadoStyles = {
  confirmada: 'bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30',
  cancelada:  'bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full',
  asistio:    'bg-blue-900/30 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/30',
  ausente:    'bg-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30',
};

export default function GymTurnos() {
  const { gymSlug } = useParams();
  const { gimnasio, logout } = useAuth();
  const navigate = useNavigate();
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => { cargarTurnos(); }, [filtroFecha, filtroEstado]);

  const cargarTurnos = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroFecha) params.append('fecha', filtroFecha);
      if (filtroEstado) params.append('estado', filtroEstado);
      const { data } = await api.get(`/gym/${gymSlug}/admin/turnos?${params}`);
      setTurnos(data.turnos);
    } catch { toast.error('Error al cargar turnos'); }
    finally { setCargando(false); }
  };

  const marcarAsistencia = async (id, estado) => {
    try {
      await api.put(`/gym/${gymSlug}/admin/turnos/${id}/asistencia`, { estado });
      toast.success('Asistencia registrada');
      cargarTurnos();
    } catch { toast.error('Error al registrar asistencia'); }
  };

  const color = gimnasio?.color_primario || '#f97316';

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{backgroundColor:`${color}20`}}>
              <Dumbbell size={14} style={{color}}/>
            </div>
            <h1 className="text-xl font-bold text-white">Turnos</h1>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 p-2"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
            className="input-field w-auto"/>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input-field w-auto">
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="asistio">Asistió</option>
            <option value="ausente">Ausente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {cargando ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : turnos.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="text-gray-700 mx-auto mb-4" size={48}/>
            <p className="text-gray-500">No hay turnos para este día</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Horario</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Estado</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t, i) => (
                  <tr key={t.id} className={`border-t border-gray-800 ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{t.nombre} {t.apellido}</p>
                      <p className="text-gray-500 text-xs">{t.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {t.hora_inicio?.slice(0,5)} - {t.hora_fin?.slice(0,5)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={estadoStyles[t.estado] || estadoStyles.confirmada}>{t.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.estado === 'confirmada' && (
                        <div className="flex gap-2">
                          <button onClick={() => marcarAsistencia(t.id, 'asistio')}
                            className="text-gray-500 hover:text-green-400 transition-colors" title="Asistió">
                            <CheckCircle size={18}/>
                          </button>
                          <button onClick={() => marcarAsistencia(t.id, 'ausente')}
                            className="text-gray-500 hover:text-red-400 transition-colors" title="Ausente">
                            <XCircle size={18}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
