import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Dumbbell, Calendar, Shield, TrendingUp, Users, Star, CheckCircle, ChevronDown, Instagram, Phone, Zap, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ─── AuthForm FUERA del componente para evitar re-mounts en cada keystroke ───
function AuthForm({ modo, setModo, formLogin, setFormLogin, formReg, setFormReg,
  verPass, setVerPass, enviando, handleLogin, handleRegistro, color, gym, compact }) {
  return (
    <div className={compact ? '' : 'bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl'}>
      {!compact && (
        <div className="text-center mb-5">
          {gym.logo_url
            ? <img src={gym.logo_url} alt={gym.nombre} className="h-14 mx-auto object-contain mb-3" />
            : <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: color + '25' }}>
                <Dumbbell size={26} style={{ color }} />
              </div>
          }
          <h2 className="text-lg font-bold text-white">
            {modo === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}
          </h2>
        </div>
      )}
      <div className="flex bg-gray-800 rounded-xl p-1 mb-4">
        {['login','registro'].map(m => (
          <button key={m} type="button" onClick={() => setModo(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${modo === m ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {m === 'login' ? 'Ingresar' : 'Registrarse'}
          </button>
        ))}
      </div>

      {modo === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={formLogin.email}
              onChange={e => setFormLogin(f => ({...f, email: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                value={formLogin.password}
                onChange={e => setFormLogin(f => ({...f, password: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {verPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={enviando}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: color }}>
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegistro} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nombre *</label>
              <input
                value={formReg.nombre}
                onChange={e => setFormReg(f => ({...f, nombre: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                placeholder="Juan"
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Apellido</label>
              <input
                value={formReg.apellido}
                onChange={e => setFormReg(f => ({...f, apellido: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                placeholder="Pérez"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={formReg.email}
              onChange={e => setFormReg(f => ({...f, email: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Contraseña *</label>
            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                value={formReg.password}
                onChange={e => setFormReg(f => ({...f, password: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {verPass ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
            <input
              type="tel"
              value={formReg.telefono}
              onChange={e => setFormReg(f => ({...f, telefono: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              placeholder="+54 9 11 1234-5678"
              autoComplete="tel"
            />
          </div>
          <button type="submit" disabled={enviando}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: color }}>
            {enviando ? 'Creando cuenta...' : 'Crear mi cuenta'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function GymLanding() {
  const { gymSlug } = useParams();
  const { loginGym, usuario, gimnasio: gymCtx } = useAuth();
  const navigate = useNavigate();
  const [gym, setGym] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState('login');
  const [formLogin, setFormLogin] = useState({ email: '', password: '' });
  const [formReg, setFormReg] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '' });
  const [verPass, setVerPass] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [authModal, setAuthModal] = useState(false);

  useEffect(() => {
    api.get(`/public/gym/${gymSlug}`)
      .then(r => setGym(r.data.gym))
      .catch(err => {
        if (err.response?.status === 404) toast.error('Gimnasio no encontrado');
        else toast.error('Error al cargar el gimnasio');
      })
      .finally(() => setCargando(false));
  }, [gymSlug]);

  useEffect(() => {
    if (!cargando && usuario && gymCtx && gymCtx.slug === gymSlug) {
      if (usuario.rol === 'admin_gym' || usuario.rol === 'profesor') navigate(`/gym/${gymSlug}/admin`);
      else navigate(`/gym/${gymSlug}/home`);
    }
  }, [usuario, gymCtx, cargando]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const data = await loginGym(formLogin.email, formLogin.password, gymSlug);
      if (data.usuario.rol === 'admin_gym' || data.usuario.rol === 'profesor') navigate(`/gym/${gymSlug}/admin`);
      else navigate(`/gym/${gymSlug}/home`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email o contraseña incorrectos');
    } finally { setEnviando(false); }
  }, [formLogin, gymSlug]);

  const handleRegistro = useCallback(async (e) => {
    e.preventDefault();
    if (!formReg.nombre || !formReg.email || !formReg.password) { toast.error('Completá los campos requeridos'); return; }
    setEnviando(true);
    try {
      await api.post(`/auth/registro/${gymSlug}`, formReg);
      toast.success('¡Cuenta creada! Ahora ingresá con tus datos.');
      setModo('login');
      setFormLogin({ email: formReg.email, password: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Error al registrarse'); }
    finally { setEnviando(false); }
  }, [formReg, gymSlug]);

  if (cargando) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#f97316' }} />
    </div>
  );

  if (!gym) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center px-4">
        <Dumbbell className="text-gray-700 mx-auto mb-4" size={48} />
        <p className="text-white text-xl font-bold">Gimnasio no encontrado</p>
        <p className="text-gray-500 mt-2 text-sm">El link no existe o el gimnasio está inactivo.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500">Ir al inicio</button>
      </div>
    </div>
  );

  const color = gym.color_primario || '#f97316';

  // Planes dinámicos del gym
  const planLabel = { '1_dia':'1 día/semana','2_dias':'2 días/semana','3_dias':'3 días/semana','4_dias':'4 días/semana','5_dias':'5 días/semana','libre':'Acceso libre' };
  const planFeatures = {
    '1_dia':['1 clase semanal','Reservas online','Acceso al app'],
    '2_dias':['2 clases semanales','Reservas online','Historial'],
    '3_dias':['3 clases semanales','Reservas online','Historial + rutinas','Prioridad en turnos'],
    '4_dias':['4 clases semanales','Reservas online','Historial + rutinas'],
    '5_dias':['5 clases semanales','Reservas online','Historial + rutinas'],
    'libre':['Clases ilimitadas','Horarios libres','Acceso total'],
  };
  const precioMap = { '1_dia':gym.precio_1dia,'2_dias':gym.precio_2dias,'3_dias':gym.precio_3dias,'4_dias':gym.precio_3dias,'5_dias':gym.precio_3dias,'libre':gym.precio_3dias };
  let planes = [];
  if (gym.plan_libre) {
    planes = [{ key:'libre', label:planLabel['libre'], precio:gym.precio_3dias, features:planFeatures['libre'], destacado:true }];
  } else {
    const activos = Array.isArray(gym.planes_activos) ? gym.planes_activos : ['2_dias','3_dias'];
    planes = activos.map((k, i) => ({ key:k, label:planLabel[k]||k, precio:precioMap[k], features:planFeatures[k]||[], destacado: i===Math.floor(activos.length/2) }));
  }

  const authProps = { modo, setModo, formLogin, setFormLogin, formReg, setFormReg, verPass, setVerPass, enviando, handleLogin, handleRegistro, color, gym };

  const features = [
    { icon: Calendar, title:'Reservas online', desc:'Reservá tu turno desde el celular en segundos' },
    { icon: Dumbbell, title:'Rutinas personalizadas', desc:'Tu profe te arma una rutina a medida' },
    { icon: TrendingUp, title:'Seguí tu progreso', desc:'Registrá tus pesos y mirá cómo mejorás' },
    { icon: Shield, title:'Recupero de clases', desc:'Si faltaste, recuperá en otro horario' },
    { icon: Users, title:'Comunidad activa', desc:'Formá parte de un gym que te cuida' },
    { icon: Zap, title:'Todo desde el celular', desc:'Pagos, turnos y rutinas en un lugar' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {gym.logo_url
              ? <img src={gym.logo_url} alt={gym.nombre} className="h-9 w-9 object-contain rounded-lg" />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color+'25' }}>
                  <Dumbbell size={18} style={{ color }} />
                </div>
            }
            <span className="font-black text-lg">{gym.nombre}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
            {planes.length > 0 && <a href="#planes" className="hover:text-white transition-colors">Planes</a>}
            {gym.instagram && <a href={`https://instagram.com/${gym.instagram}`} target="_blank" rel="noopener" className="hover:text-pink-400 transition-colors">Instagram</a>}
          </div>
          <button onClick={() => { setAuthModal(true); setModo('login'); }}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: color }}>
            Ingresar
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: `radial-gradient(ellipse at 60% 50%, ${color}18 0%, transparent 70%)` }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full z-10 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 text-sm"
                style={{ borderColor:color+'50', backgroundColor:color+'15', color }}>
                <Star size={13} /> Tu gym en el bolsillo
              </div>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
                Bienvenido a<br />
                <span style={{ color }}>{gym.nombre}</span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                {gym.texto_bienvenida || 'Reservá turnos, seguí tus rutinas y controlá tus pagos — todo desde el celular.'}
              </p>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => { setModo('registro'); setAuthModal(true); }}
                  className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: color }}>
                  Empezar ahora
                </button>
                <button onClick={() => { setModo('login'); setAuthModal(true); }}
                  className="px-6 py-3 rounded-xl font-bold text-gray-300 border border-gray-700 hover:border-gray-500 transition-all">
                  Ya tengo cuenta
                </button>
              </div>
              <div className="flex items-center gap-4 mt-8">
                {gym.instagram && (
                  <a href={`https://instagram.com/${gym.instagram}`} target="_blank" rel="noopener"
                    className="flex items-center gap-2 text-gray-500 hover:text-pink-400 transition-colors text-sm">
                    <Instagram size={16} /> @{gym.instagram}
                  </a>
                )}
                {gym.whatsapp && (
                  <a href={`https://wa.me/${gym.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener"
                    className="flex items-center gap-2 text-gray-500 hover:text-green-400 transition-colors text-sm">
                    <Phone size={16} /> WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Auth card desktop */}
            <div className="hidden lg:block" id="auth-section">
              <AuthForm {...authProps} />
              <p className="text-center text-gray-700 text-xs mt-3">Powered by TGB · Tu Gym Bro</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-600 animate-bounce">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="py-20 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">Todo lo que necesitás</h2>
            <p className="text-gray-400">en un solo lugar, desde tu celular</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color+'20' }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-bold text-white mb-1 text-sm">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES */}
      {planes.length > 0 && (
        <section id="planes" className="py-20 border-t border-gray-800/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3">Planes</h2>
              <p className="text-gray-400">Elegí el que mejor se adapte a vos</p>
            </div>
            <div className={`grid gap-6 max-w-4xl mx-auto ${
              planes.length === 1 ? 'max-w-sm' :
              planes.length === 2 ? 'sm:grid-cols-2' :
              planes.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
              'sm:grid-cols-3'
            }`}>
              {planes.map(plan => (
                <div key={plan.key} className="bg-gray-900 rounded-2xl p-6 border-2 relative"
                  style={{ borderColor: plan.destacado ? color : '#1f2937' }}>
                  {plan.destacado && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: color }}>MÁS POPULAR</span>
                  )}
                  <h3 className="font-bold text-white mb-2 text-sm">{plan.label}</h3>
                  {plan.precio
                    ? <p className="text-2xl font-black mb-1" style={{ color }}>${parseInt(plan.precio).toLocaleString('es-AR')}</p>
                    : <p className="text-lg font-bold text-gray-400 mb-1">Consultá</p>
                  }
                  <p className="text-gray-500 text-xs mb-4">por mes</p>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => { setModo('registro'); setAuthModal(true); }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: plan.destacado ? color : '#374151' }}>
                    Empezar
                  </button>
                </div>
              ))}
            </div>
            {(gym.alias_transferencia || gym.nombre_titular) && (
              <div className="max-w-md mx-auto mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">💳 Datos para transferir</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {gym.alias_transferencia && <div><p className="text-gray-600 text-xs">Alias</p><p className="text-white font-bold">{gym.alias_transferencia}</p></div>}
                  {gym.nombre_titular && <div><p className="text-gray-600 text-xs">Titular</p><p className="text-white">{gym.nombre_titular}</p></div>}
                  {gym.banco && <div><p className="text-gray-600 text-xs">Banco</p><p className="text-white">{gym.banco}</p></div>}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell size={16} style={{ color }} />
            <span className="font-bold text-white">{gym.nombre}</span>
          </div>
          <p className="text-gray-600 text-sm">Powered by <span className="text-orange-500 font-semibold">TGB · Tu Gym Bro</span></p>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {authModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end sm:items-center justify-center p-4"
          onClick={() => setAuthModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {gym.logo_url
                  ? <img src={gym.logo_url} alt={gym.nombre} className="h-8 w-8 object-contain rounded-lg" />
                  : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color+'25' }}>
                      <Dumbbell size={15} style={{ color }} />
                    </div>
                }
                <span className="font-bold text-white text-sm">{gym.nombre}</span>
              </div>
              <button onClick={() => setAuthModal(false)} className="text-gray-500 hover:text-white p-1"><X size={20}/></button>
            </div>
            <AuthForm {...authProps} compact />
          </div>
        </div>
      )}
    </div>
  );
}
