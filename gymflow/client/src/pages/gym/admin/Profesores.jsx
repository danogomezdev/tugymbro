import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Users, X, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function GymProfesores() {
  const { gymSlug } = useParams();
  const { gimnasio } = useAuth();
  const navigate = useNavigate();
  const [profesores, setProfesores] = useState([]);
  const [alumnos, setAlumnos] = useState({});
  const [expandido, setExpandido] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre:'',apellido:'',email:'',password:'',telefono:'' });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!gimnasio?.features?.profesores) return;
    api.get(`/gym/${gymSlug}/admin/profesores`)
      .then(r => setProfesores(r.data.profesores))
      .finally(() => setCargando(false));
  }, [gymSlug]);

  const verAlumnos = async (profId) => {
    if (expandido === profId) { setExpandido(null); return; }
    if (!alumnos[profId]) {
      const { data } = await api.get(`/gym/${gymSlug}/admin/profesores/${profId}/alumnos`);
      setAlumnos(prev => ({...prev, [profId]: data.alumnos}));
    }
    setExpandido(profId);
  };

  const crearProfesor = async () => {
    if (!form.nombre || !form.email || !form.password) { toast.error('Nombre, email y contraseña requeridos'); return; }
    try {
      const { data } = await api.post(`/gym/${gymSlug}/admin/profesores`, form);
      setProfesores(prev => [...prev, data.profesor]);
      toast.success('Profesor creado');
      setModal(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  if (!gimnasio?.features?.profesores) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Lock className="text-gray-700 mx-auto mb-4" size={48}/>
        <p className="text-white font-bold mb-2">Función no disponible</p>
        <p className="text-gray-500 text-sm">Los múltiples profesores están disponibles en el plan Premium.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <h1 className="text-xl font-bold text-white flex-1">Profesores</h1>
          <button onClick={() => setModal(true)} className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5">
            <Plus size={15}/> Nuevo profe
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {cargando ? (
          <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : profesores.length === 0 ? (
          <div className="text-center py-16"><Users className="text-gray-700 mx-auto mb-4" size={48}/><p className="text-gray-500">No hay profesores todavía</p></div>
        ) : (
          <div className="space-y-3">
            {profesores.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => verAlumnos(p.id)}>
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-400 font-bold">
                    {p.nombre[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{p.nombre} {p.apellido}</p>
                    <p className="text-gray-500 text-xs">{p.email} · {p.total_alumnos} alumno{p.total_alumnos !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-gray-500 text-sm">{expandido === p.id ? '▲' : '▼'}</span>
                </div>
                {expandido === p.id && (
                  <div className="border-t border-gray-800 px-5 py-3">
                    {alumnos[p.id]?.length === 0
                      ? <p className="text-gray-600 text-sm py-2">Sin alumnos asignados todavía</p>
                      : alumnos[p.id]?.map((a,i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <span className="text-gray-300 text-sm">{a.nombre} {a.apellido}</span>
                          <span className="text-gray-600 text-xs">{a.plan?.replace('_',' ')}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Nuevo profesor</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} className="input-field w-full"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Apellido *</label>
                  <input value={form.apellido} onChange={e=>setForm(p=>({...p,apellido:e.target.value}))} className="input-field w-full"/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className="input-field w-full"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Contraseña temporal *</label>
                <input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} className="input-field w-full"/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))} className="input-field w-full"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={crearProfesor} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold">Crear profesor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
