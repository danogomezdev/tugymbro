import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle, XCircle, ArrowLeft, LogOut, Dumbbell } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const estadoStyles = {
  confirmada: 'bg-green-950/50 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-900',
  cancelada:  'bg-neutral-900 text-neutral-500 text-xs px-2 py-0.5 rounded-full',
  asistio:    'bg-blue-950/50 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-900',
  ausente:    'bg-red-950/50 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-900',
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

  const color = gimnasio?.color_primario || '#3b82f6';

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-neutral-950 border-b border-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-neutral-600 hover:text-white transition-colors"><ArrowLeft size={20}/></button>
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Dumbbell size={14} className="text-white"/>
            </div>
            <h1 className="text-xl font-bold text-white">Turnos</h1>
          </div>
          <button onClick={logout} className="text-neutral-700 hover:text-red-400 p-2 transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
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
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-neutral-950 rounded-xl animate-pulse"/>)}</div>
        ) : turnos.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="text-neutral-800 mx-auto mb-4" size={48}/>
            <p className="text-neutral-600">No hay turnos para este día</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-neutral-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 text-sm font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-neutral-500 text-sm font-medium">Horario</th>
                  <th className="text-left px-4 py-3 text-neutral-500 text-sm font-medium">Estado</th>
                  <th className="text-left px-4 py-3 text-neutral-500 text-sm font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t, i) => (
                  <tr key={t.id} className={`border-t border-neutral-900 ${i % 2 === 0 ? '' : 'bg-neutral-950/50'}`}>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{t.nombre} {t.apellido}</p>
                      <p className="text-neutral-600 text-xs">{t.email}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-sm">
                      {t.hora_inicio?.slice(0,5)} - {t.hora_fin?.slice(0,5)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={estadoStyles[t.estado] || estadoStyles.confirmada}>{t.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.estado === 'confirmada' && (
                        <div className="flex gap-2">
                          <button onClick={() => marcarAsistencia(t.id, 'asistio')}
                            className="text-neutral-600 hover:text-green-400 transition-colors" title="Asistió">
                            <CheckCircle size={18}/>
                          </button>
                          <button onClick={() => marcarAsistencia(t.id, 'ausente')}
                            className="text-neutral-600 hover:text-red-400 transition-colors" title="Ausente">
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
