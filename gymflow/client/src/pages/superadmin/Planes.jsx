import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { superApi } from '../../services/api';
import toast from 'react-hot-toast';

const features = [
  { key: 'feature_rutinas', label: 'Rutinas personalizadas' },
  { key: 'feature_profesores', label: 'Múltiples profesores' },
  { key: 'feature_estadisticas', label: 'Estadísticas avanzadas' },
  { key: 'feature_logo_propio', label: 'Logo y colores propios' },
];

export default function SuperAdminPlanes() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    superApi.get('/planes').then(r => setPlanes(r.data.planes)).finally(() => setCargando(false));
  }, []);

  const guardar = async () => {
    try {
      await superApi.put(`/planes/${editando.id}`, editando);
      setPlanes(prev => prev.map(p => p.id === editando.id ? editando : p));
      toast.success('Plan actualizado');
      setEditando(null);
    } catch { toast.error('Error'); }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/superadmin')} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <h1 className="text-xl font-bold text-white">Planes de la plataforma</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {cargando ? (
          <div className="grid grid-cols-2 gap-4">{[1,2].map(i=><div key={i} className="h-64 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planes.map(plan => (
              <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-white text-xl capitalize">{plan.nombre}</h3>
                  <button onClick={() => setEditando({...plan})} className="text-orange-400 text-sm hover:text-orange-300">Editar</button>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-gray-400 text-sm">Máx. clientes: <span className="text-white">{plan.max_clientes}</span></p>
                  <p className="text-gray-400 text-sm">Setup: <span className="text-white">USD {plan.precio_inicial}</span></p>
                  <p className="text-gray-400 text-sm">Mensual: <span className="text-white">USD {plan.precio_mensual}</span></p>
                </div>
                <div className="space-y-2 border-t border-gray-800 pt-4">
                  {features.map(f => (
                    <div key={f.key} className="flex items-center gap-2 text-sm">
                      {plan[f.key] ? <Check size={14} className="text-green-400"/> : <X size={14} className="text-gray-700"/>}
                      <span className={plan[f.key] ? 'text-gray-300' : 'text-gray-600'}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white mb-4">Editar plan: {editando.nombre}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio setup (USD)</label>
                  <input type="number" value={editando.precio_inicial} onChange={e => setEditando(p=>({...p,precio_inicial:e.target.value}))} className="input-field w-full"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio mensual (USD)</label>
                  <input type="number" value={editando.precio_mensual} onChange={e => setEditando(p=>({...p,precio_mensual:e.target.value}))} className="input-field w-full"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Máx. clientes</label>
                  <input type="number" value={editando.max_clientes} onChange={e => setEditando(p=>({...p,max_clientes:e.target.value}))} className="input-field w-full"/>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <p className="text-sm text-gray-400 mb-3">Features habilitadas:</p>
                {features.map(f => (
                  <label key={f.key} className="flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={editando[f.key]} onChange={e => setEditando(p=>({...p,[f.key]:e.target.checked}))}
                      className="w-4 h-4 accent-orange-500"/>
                    <span className="text-gray-300 text-sm">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditando(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={guardar} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
