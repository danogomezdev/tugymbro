import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Dumbbell, Lock } from 'lucide-react';
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

  // Estado para forzar cambio de contraseña
  const [debeCambiar, setDebeCambiar] = useState(false);
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmarPass, setConfirmarPass] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [tokenTemp, setTokenTemp] = useState(null);
  const [usuarioTemp, setUsuarioTemp] = useState(null);

  useEffect(() => {
    if (usuario) {
      if (usuario.rol === 'admin_gym' || usuario.rol === 'profesor') {
        navigate(`/gym/${gymSlug}/admin`);
      } else {
        navigate(`/gym/${gymSlug}`);
      }
    }
    api.get(`/public/gym/${gymSlug}`)
      .then(r => setGym(r.data.gym))
      .catch(() => toast.error('Gimnasio no encontrado'));
  }, [gymSlug, usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const data = await loginGym(email, password, gymSlug);
      // Chequear si debe cambiar contraseña ANTES de navegar
      if (data.debe_cambiar_password || data.usuario?.debe_cambiar_password) {
        setTokenTemp(data.token);
        setUsuarioTemp(data.usuario);
        setDebeCambiar(true);
        return;
      }
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

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (nuevaPass.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (nuevaPass !== confirmarPass) { toast.error('Las contraseñas no coinciden'); return; }
    setGuardandoPass(true);
    try {
      await api.post(
        `/gym/${gymSlug}/auth/cambiar-password`,
        { passwordActual: password, passwordNueva: nuevaPass },
        { headers: { Authorization: `Bearer ${tokenTemp}` } }
      );
      toast.success('¡Contraseña actualizada! Bienvenido/a 🎉');
      if (usuarioTemp.rol === 'admin_gym' || usuarioTemp.rol === 'profesor') {
        navigate(`/gym/${gymSlug}/admin`);
      } else {
        navigate(`/gym/${gymSlug}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setGuardandoPass(false);
    }
  };

  const color = gym?.color_primario || '#f97316';

  // PANTALLA: Cambio obligatorio de contraseña
  if (debeCambiar) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ backgroundColor: `${color}20` }}>
              <Lock size={32} style={{ color }} />
            </div>
            <h1 className="text-2xl font-black text-white">Cambiá tu contraseña</h1>
            <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
              Por seguridad, necesitás elegir una contraseña nueva antes de continuar.
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  value={nuevaPass}
                  onChange={e => setNuevaPass(e.target.value)}
                  className="input-field w-full"
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Repetir contraseña</label>
                <input
                  type="password"
                  value={confirmarPass}
                  onChange={e => setConfirmarPass(e.target.value)}
                  className="input-field w-full"
                  placeholder="Repetí la contraseña"
                  required
                />
                {confirmarPass.length > 0 && (
                  <p className={`text-xs mt-1 ${nuevaPass === confirmarPass ? 'text-green-400' : 'text-red-400'}`}>
                    {nuevaPass === confirmarPass ? '✓ Coinciden' : 'No coinciden'}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={guardandoPass || nuevaPass !== confirmarPass || nuevaPass.length < 6}
                className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: color }}>
                {guardandoPass ? 'Guardando...' : 'Guardar y entrar'}
              </button>
            </form>
          </div>
          <p className="text-center text-gray-700 text-xs mt-4">Powered by TGB · Tu Gym Bro</p>
        </div>
      </div>
    );
  }

  // PANTALLA: Login normal
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: `${color}20` }}>
            {gym?.logo_url
              ? <img src={gym.logo_url} alt={gym.nombre} className="w-10 h-10 object-contain" />
              : <Dumbbell size={32} style={{ color }} />
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
              style={{ backgroundColor: color }}>
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
