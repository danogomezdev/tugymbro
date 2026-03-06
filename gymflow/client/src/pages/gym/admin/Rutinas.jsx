import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Plus, ChevronRight, Search, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function GymRutinas() {
  const { gymSlug } = useParams();
  const { gimnasio } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!gimnasio?.feature_rutinas) return setCargando(false);
    api.get(`/gym/${gymSlug}/admin/clientes`)
      .then(r => setClientes(r.data.clientes))
      .catch(() => toast.error('Error'))
      .finally(() => setCargando(false));
  }, [gymSlug]);

  if (!gimnasio?.features?.rutinas) return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20}/></button>
          <h1 className="text-xl font-bold text-white">Rutinas</h1>
        </div>
      </header>
      <div className="flex items-center justify-center" style={{minHeight:'calc(100vh - 64px)'}}>
        <div className="text-center max-w-sm mx-auto px-6">
          <Lock className="text-gray-700 mx-auto mb-4" size={48}/>
          <p className="text-white font-bold text-lg mb-2">Función Premium</p>
          <p className="text-gray-500 text-sm">Las rutinas personalizadas están disponibles en el plan Premium.</p>
          <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="mt-6 px-5 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
            ← Volver al panel
          </button>
        </div>
      </div>
    </div>
  );

  const filtrados = clientes.filter(c =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes((busqueda||'').toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Rutinas</h1>
            <p className="text-gray-500 text-xs">Seleccioná un cliente para ver o crear su rutina</p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none w-44"
              placeholder="Buscar..."/>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {cargando ? (
          <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <Dumbbell className="text-gray-700 mx-auto mb-4" size={48}/>
            <p className="text-gray-500">{busqueda ? 'Sin resultados' : 'No hay clientes todavía'}</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {filtrados.map((c, i) => (
              <button key={c.id}
                onClick={() => navigate(`/gym/${gymSlug}/admin/rutinas/${c.id}`)}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-800/60 transition-colors text-left
                  ${i < filtrados.length-1 ? 'border-b border-gray-800' : ''}`}>
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.nombre?.[0]}{c.apellido?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{c.nombre} {c.apellido}</p>
                  <p className="text-gray-500 text-xs">{c.plan?.replace('_',' ')} · {c.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {c.tiene_rutina
                    ? <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Tiene rutina</span>
                    : <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Plus size={10}/> Sin rutina</span>
                  }
                  <ChevronRight size={16} className="text-gray-600"/>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
