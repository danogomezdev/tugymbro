import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, ArrowLeft, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const planLabels = { '1_dia': '1 día/semana', '2_dias': '2 días/semana', '3_dias': '3 días/semana' };

export default function GymPagos() {
  const { gymSlug } = useParams();
  const { gimnasio, logout } = useAuth();
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
      const { data } = await api.get(`/gym/${gymSlug}/admin/pagos/solicitudes?estado=${filtro}`);
      setSolicitudes(data.solicitudes);
    } catch { toast.error('Error al cargar solicitudes'); }
    finally { setCargando(false); }
  };

  const aprobar = async (id) => {
    try {
      await api.put(`/gym/${gymSlug}/admin/pagos/solicitudes/${id}`, { estado: 'aprobado' });
      toast.success('✅ Pago aprobado');
      cargarSolicitudes();
    } catch { toast.error('Error al aprobar'); }
  };

  const rechazar = async () => {
    if (!motivo) { toast.error('Escribí el motivo'); return; }
    try {
      await api.put(`/gym/${gymSlug}/admin/pagos/solicitudes/${modalRechazo}`, { estado: 'rechazado', notas: motivo });
      toast.success('Solicitud rechazada');
      setModalRechazo(null);
      setMotivo('');
      cargarSolicitudes();
    } catch { toast.error('Error al rechazar'); }
  };

  const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente').length;

  const filtroStyles = {
    pendiente: 'bg-neutral-900 border-neutral-700 text-white',
    aprobado:  'bg-neutral-900 border-neutral-700 text-white',
    rechazado: 'bg-neutral-900 border-neutral-700 text-white',
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-neutral-950 border-b border-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-neutral-600 hover:text-white transition-colors">
              <ArrowLeft size={20}/>
            </button>
            <h1 className="text-xl font-bold text-white">Pagos</h1>
          </div>
          <button onClick={logout} className="text-neutral-700 hover:text-red-400 p-2 transition-colors"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {['pendiente', 'aprobado', 'rechazado'].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${
                filtro === e
                  ? 'bg-neutral-800 border-neutral-700 text-white'
                  : 'bg-transparent border-neutral-900 text-neutral-600 hover:text-neutral-300 hover:border-neutral-800'
              }`}>
              {e}
              {e === 'pendiente' && pendientesCount > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{pendientesCount}</span>
              )}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-neutral-950 rounded-xl animate-pulse"/>)}</div>
        ) : solicitudes.length === 0 ? (
          <div className="card text-center py-16">
            <Clock className="text-neutral-800 mx-auto mb-3" size={48}/>
            <p className="text-neutral-600">No hay solicitudes {filtro === 'pendiente' ? 'pendientes' : filtro === 'aprobado' ? 'aprobadas' : 'rechazadas'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudes.map(s => (
              <div key={s.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                      s.estado === 'pendiente' ? 'bg-neutral-800' :
                      s.estado === 'aprobado'  ? 'bg-green-950/50'  : 'bg-red-950/50'
                    }`}>
                      <Clock className={
                        s.estado === 'pendiente' ? 'text-neutral-400' :
                        s.estado === 'aprobado'  ? 'text-green-500'  : 'text-red-500'
                      } size={20}/>
                    </div>
                    <div>
                      <p className="font-bold text-white">{s.nombre} {s.apellido}</p>
                      <p className="text-neutral-500 text-sm">{s.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                          {planLabels[s.plan] || s.plan}
                        </span>
                        {s.monto && (
                          <span className="text-xs text-neutral-500">${parseFloat(s.monto).toLocaleString('es-AR')}</span>
                        )}
                        <span className="text-xs text-neutral-700">
                          {format(new Date(s.creado_en), "d MMM HH:mm", { locale: es })}
                        </span>
                      </div>
                      {s.notas_admin && (
                        <p className="text-red-400 text-xs mt-1">Motivo: {s.notas_admin}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.comprobante_url && (
                      <button onClick={() => window.open(s.comprobante_url, '_blank')}
                        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-3 py-2 rounded-lg transition-colors">
                        <Eye size={15}/> Ver comprobante
                      </button>
                    )}
                    {s.estado === 'pendiente' && (
                      <>
                        <button onClick={() => aprobar(s.id)}
                          className="flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors">
                          <CheckCircle size={15}/> Aprobar
                        </button>
                        <button onClick={() => setModalRechazo(s.id)}
                          className="flex items-center gap-1.5 text-sm bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors">
                          <XCircle size={15}/> Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalRechazo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-4">Rechazar comprobante</h3>
            <label className="block text-sm text-neutral-400 mb-1.5">Motivo (visible para el cliente)</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              className="input-field resize-none" rows={3}
              placeholder="Ej: El comprobante no se ve con claridad"/>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setModalRechazo(null); setMotivo(''); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={rechazar} className="bg-red-700 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg flex-1 transition-colors">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
