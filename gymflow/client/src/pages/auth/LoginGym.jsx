import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function LoginGym() {
  const { gymSlug } = useParams();
  const [gym, setGym] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { loginGym, usuario } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Si ya está logueado, redirigir
    if (usuario) {
      if (usuario.rol === 'admin_gym' || usuario.rol === 'profesor') {
        navigate(`/gym/${gymSlug}/admin`);
      } else {
        navigate(`/gym/${gymSlug}`);
      }
    }
    // Cargar info del gym
    api.get(`/public/gym/${gymSlug}`)
      .then(r => setGym(r.data.gym))
      .catch(() => toast.error('Gimnasio no encontrado'));
  }, [gymSlug, usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const data = await loginGym(email, password, gymSlug);
      if (data.usuario.rol === 'admin_gym' || data.usuario.rol === 'profesor') {
        navigate(`/gym/${gymSlug}/admin`);
      } else {
        navigate(`/gym/${gymSlug}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: `${gym?.color_primario || '#f97316'}20` }}>
            {gym?.logo_url
              ? <img src={gym.logo_url} alt={gym.nombre} className="w-10 h-10 object-contain" />
              : <Dumbbell size={32} style={{ color: gym?.color_primario || '#f97316' }} />
            }
          </div>
          <h1 className="text-2xl font-black text-white">{gym?.nombre || gymSlug}</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresá a tu cuenta</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field w-full" placeholder="tu@email.com" required />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={verPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field w-full pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setVerPass(!verPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={cargando}
              className="w-full py-3 rounded-xl font-bold text-white transition-all mt-2"
              style={{ backgroundColor: gym?.color_primario || '#f97316' }}>
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-4">
            ¿No tenés cuenta?{' '}
            <Link to={`/gym/${gymSlug}/registro`} className="text-orange-400 hover:text-orange-300">Registrate</Link>
          </p>
        </div>
        <p className="text-center text-gray-700 text-xs mt-4">Powered by TGB · Tu Gym Bro</p>
      </div>
    </div>
  );
}
