import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { superApi } from '../../services/api';
import toast from 'react-hot-toast';

const formatFecha = (f) => { try { return new Date(f).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }); } catch { return '-'; } };

export default function SuperAdminSolicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [expandida, setExpandida] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [modalAprobar, setModalAprobar] = useState(null);
  const [formAprobar, setFormAprobar] = useState({ plan_id: 1, slug_final: '', notas: '' });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([superApi.get('/solicitudes'), superApi.get('/planes')])
      .then(([s, p]) => { setSolicitudes(s.data.solicitudes); setPlanes(p.data.planes); })
      .finally(() => setCargando(false));
  }, []);

  const abrirAprobar = (sol) => {
    setFormAprobar({ plan_id: sol.plan_solicitado === 'premium' ? 2 : 1, slug_final: sol.slug_deseado, notas: '' });
    setModalAprobar(sol);
  };

  const aprobar = async () => {
    try {
      const { data } = await superApi.post(`/solicitudes/${modalAprobar.id}/aprobar`, formAprobar);
      toast.success(data.mensaje);
      toast.success(`Credenciales: ${data.credenciales.email} / ${data.credenciales.password_temporal}`, { duration: 8000 });
      setSolicitudes(prev => prev.map(s => s.id === modalAprobar.id ? { ...s, estado: 'aprobado' } : s));
      setModalAprobar(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const rechazar = async (id) => {
    const notas = prompt('Motivo del rechazo (opcional):');
    if (notas === null) return;
    try {
      await superApi.post(`/solicitudes/${id}/rechazar`, { notas });
      setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: 'rechazado' } : s));
      toast.success('Solicitud rechazada');
    } catch { toast.error('Error'); }
  };

  const estadoColor = { pendiente: 'text-yellow-400 bg-yellow-500/10', aprobado: 'text-green-400 bg-green-500/10', rechazado: 'text-red-400 bg-red-500/10' };
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const resto = solicitudes.filter(s => s.estado !== 'pendiente');

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/superadmin')} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-white">Solicitudes de registro</h1>
            {pendientes.length > 0 && <p className="text-yellow-400 text-xs">{pendientes.length} pendientes de revisión</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : solicitudes.length === 0 ? (
          <div className="text-center py-16"><Clock className="text-gray-700 mx-auto mb-4" size={48}/><p className="text-gray-500">No hay solicitudes todavía</p></div>
        ) : (
          <div className="space-y-3">
            {[...pendientes, ...resto].map(s => (
              <div key={s.id} className={`bg-gray-900 border rounded-xl overflow-hidden ${s.estado === 'pendiente' ? 'border-yellow-500/30' : 'border-gray-800'}`}>
                <div className="flex items-center justify-between p-5">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandida(expandida === s.id ? null : s.id)}>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-white">{s.nombre_gym}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[s.estado]}`}>{s.estado}</span>
                      <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{s.plan_solicitado}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{s.nombre_contacto} · {s.email_contacto}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{formatFecha(s.creado_en)} · tugymbro.com/gym/{s.slug_deseado}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {s.estado === 'pendiente' && (
                      <>
                        <button onClick={() => abrirAprobar(s)} className="bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1"><Check size={14}/> Aprobar</button>
                        <button onClick={() => rechazar(s.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg text-sm transition-all"><X size={14}/></button>
                      </>
                    )}
                    <button onClick={() => setExpandida(expandida === s.id ? null : s.id)} className="text-gray-500 p-1">
                      {expandida === s.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                  </div>
                </div>
                {expandida === s.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-800">
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      {s.telefono && <p className="text-gray-400">📞 {s.telefono}</p>}
                      {s.mensaje && <p className="text-gray-400 col-span-2">💬 {s.mensaje}</p>}
                      {s.notas_superadmin && <p className="text-gray-500 col-span-2 italic">Nota: {s.notas_superadmin}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal aprobar */}
      {modalAprobar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-4">Aprobar: {modalAprobar.nombre_gym}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Plan a asignar</label>
                <select value={formAprobar.plan_id} onChange={e => setFormAprobar(p => ({...p, plan_id: parseInt(e.target.value)}))} className="input-field w-full">
                  {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Slug final (URL)</label>
                <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <span className="px-3 text-gray-500 text-xs border-r border-gray-700 py-3">/gym/</span>
                  <input value={formAprobar.slug_final} onChange={e => setFormAprobar(p => ({...p, slug_final: e.target.value}))}
                    className="flex-1 bg-transparent px-3 py-3 text-white text-sm outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Notas (opcional)</label>
                <textarea value={formAprobar.notas} onChange={e => setFormAprobar(p => ({...p, notas: e.target.value}))}
                  className="input-field w-full resize-none" rows={2}/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalAprobar(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={aprobar} className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold transition-all">Confirmar aprobación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
