import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function RegistroCliente() {
  const { gymSlug } = useParams();
  const navigate = useNavigate();
  const [gym, setGym] = useState(null);
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre:'',apellido:'',email:'',password:'',telefono:'' });

  useEffect(() => {
    api.get(`/public/gym/${gymSlug}`).then(r => setGym(r.data.gym)).catch(() => toast.error('Gimnasio no encontrado'));
  }, [gymSlug]);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setCargando(true);
    try {
      await api.post(`/auth/registro/${gymSlug}`, form);
      toast.success('Cuenta creada. ¡Ya podés ingresar!');
      navigate(`/gym/${gymSlug}/login`);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear cuenta'); }
    finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{backgroundColor:`${gym?.color_primario||'#f97316'}20`}}>
            <Dumbbell size={28} style={{color:gym?.color_primario||'#f97316'}}/>
          </div>
          <h1 className="text-2xl font-black text-white">{gym?.nombre || gymSlug}</h1>
          <p className="text-gray-500 text-sm mt-1">Creá tu cuenta</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Nombre *</label>
                <input value={form.nombre} onChange={e=>set('nombre',e.target.value)} className="input-field w-full" required/>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Apellido *</label>
                <input value={form.apellido} onChange={e=>set('apellido',e.target.value)} className="input-field w-full" required/>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className="input-field w-full" required/>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Teléfono</label>
              <input value={form.telefono} onChange={e=>set('telefono',e.target.value)} className="input-field w-full"/>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Contraseña *</label>
              <div className="relative">
                <input type={verPass?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)} className="input-field w-full pr-10" required minLength={6}/>
                <button type="button" onClick={()=>setVerPass(!verPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {verPass?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={cargando} className="w-full py-3 rounded-xl font-bold text-white mt-2 transition-all" style={{backgroundColor:gym?.color_primario||'#f97316'}}>
              {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-4">
            ¿Ya tenés cuenta? <Link to={`/gym/${gymSlug}/login`} className="text-orange-400 hover:text-orange-300">Ingresá</Link>
          </p>
        </div>
        <p className="text-center text-gray-700 text-xs mt-4">Powered by TGB · Tu Gym Bro</p>
      </div>
    </div>
  );
}
