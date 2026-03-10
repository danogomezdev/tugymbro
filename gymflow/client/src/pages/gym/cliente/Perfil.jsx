import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Save, CheckCircle, LogOut, ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const planLabels = {
  '1_dia': '1 día/semana', '2_dias': '2 días/semana', '3_dias': '3 días/semana',
  '4_dias': '4 días/semana', '5_dias': '5 días/semana', 'libre': 'Acceso libre'
};

// Detecta si un color hex es muy claro (luminosidad > 0.7)
function esColorClaro(hex) {
  if (!hex) return false;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0,2), 16) / 255;
  const g = parseInt(h.substring(2,4), 16) / 255;
  const b = parseInt(h.substring(4,6), 16) / 255;
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 0.7;
}

export default function ClientePerfil() {
  const { gymSlug } = useParams();
  const { usuario, gimnasio, logout } = useAuth();
  const navigate = useNavigate();

  const colorRaw = gimnasio?.color_primario || '#3b82f6';
  // Si el color es muy claro (ej: blanco), usamos azul por defecto
  const color = esColorClaro(colorRaw) ? '#3b82f6' : colorRaw;
  const textColor = 'text-white';

  const [tab, setTab] = useState('perfil');
  const [formPerfil, setFormPerfil] = useState({
    nombre: usuario?.nombre || '',
    apellido: usuario?.apellido || '',
    telefono: usuario?.telefono || '',
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [formPass, setFormPass] = useState({ actual: '', nueva: '', confirmar: '' });
  const [verPass, setVerPass] = useState({ actual: false, nueva: false, confirmar: false });
  const [guardandoPass, setGuardandoPass] = useState(false);

  const guardarPerfil = async () => {
    if (!formPerfil.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setGuardandoPerfil(true);
    try {
      await api.put(`/gym/${gymSlug}/cliente/perfil`, formPerfil);
      toast.success('Perfil actualizado ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setGuardandoPerfil(false); }
  };

  const cambiarPassword = async () => {
    if (!formPass.actual || !formPass.nueva || !formPass.confirmar) { toast.error('Completá todos los campos'); return; }
    if (formPass.nueva.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (formPass.nueva !== formPass.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    setGuardandoPass(true);
    try {
      await api.put(`/auth/cambiar-password`, { password_actual: formPass.actual, password_nueva: formPass.nueva });
      toast.success('Contraseña actualizada ✅');
      setFormPass({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Contraseña actual incorrecta');
    } finally { setGuardandoPass(false); }
  };

  const vencimiento = usuario?.fecha_vencimiento_pago
    ? new Date(usuario.fecha_vencimiento_pago) : null;
  const vencida = vencimiento && vencimiento < new Date();
  const tienePlan = usuario?.plan && usuario.plan !== '';

  return (
    <div className="min-h-screen bg-black pb-8">

      <header className="bg-black/95 backdrop-blur border-b border-neutral-900 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/home`)}
              className="text-neutral-500 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="font-bold text-white">Mi perfil</span>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Avatar + nombre */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
            style={{ backgroundColor: color + '30', color }}>
            {usuario?.nombre?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{usuario?.nombre} {usuario?.apellido}</h2>
            <p className="text-neutral-500 text-sm">{usuario?.email}</p>
          </div>
        </div>

        {/* Info plan */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-neutral-500 text-xs mb-0.5">Plan actual</p>
              <p className="text-white font-bold text-sm">{planLabels[usuario?.plan] || 'Sin plan'}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs mb-0.5">Vencimiento</p>
              {vencimiento ? (
                <p className={`font-bold text-sm ${vencida ? 'text-red-400' : 'text-green-400'}`}>
                  {vencimiento.toLocaleDateString('es-AR')}{vencida && ' · Vencida'}
                </p>
              ) : (
                <p className="text-neutral-600 text-sm">Sin fecha</p>
              )}
            </div>
          </div>
          <button onClick={() => navigate(`/gym/${gymSlug}/pagar`)}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ backgroundColor: color }}>
            <CreditCard size={14} />
            {tienePlan ? 'Renovar plan' : 'Contratar plan'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl p-1 mb-5">
          {[
            { key: 'perfil', label: 'Mis datos', icon: User },
            { key: 'password', label: 'Contraseña', icon: Lock },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* PERFIL */}
        {tab === 'perfil' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white">Mis datos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Nombre *</label>
                <input value={formPerfil.nombre}
                  onChange={e => setFormPerfil(f => ({ ...f, nombre: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Apellido</label>
                <input value={formPerfil.apellido}
                  onChange={e => setFormPerfil(f => ({ ...f, apellido: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Tu apellido" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Email</label>
              <input value={usuario?.email} disabled
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-600 text-sm cursor-not-allowed" />
              <p className="text-neutral-700 text-xs mt-1">El email no se puede modificar</p>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Teléfono</label>
              <input value={formPerfil.telefono}
                onChange={e => setFormPerfil(f => ({ ...f, telefono: e.target.value }))}
                className="input-field w-full"
                placeholder="+54 9 11 1234-5678" />
            </div>
            <button onClick={guardarPerfil} disabled={guardandoPerfil}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: color }}>
              <Save size={15} /> {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* CONTRASEÑA */}
        {tab === 'password' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white">Cambiar contraseña</h3>
            {[
              { key: 'actual', label: 'Contraseña actual', placeholder: '••••••••' },
              { key: 'nueva', label: 'Nueva contraseña', placeholder: 'Mínimo 6 caracteres' },
              { key: 'confirmar', label: 'Confirmar nueva contraseña', placeholder: '••••••••' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
                <div className="relative">
                  <input type={verPass[key] ? 'text' : 'password'} value={formPass[key]}
                    onChange={e => setFormPass(f => ({ ...f, [key]: e.target.value }))}
                    className="input-field w-full pr-11"
                    placeholder={placeholder} />
                  <button type="button" onClick={() => setVerPass(v => ({ ...v, [key]: !v[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                    {verPass[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {key === 'confirmar' && formPass.nueva && formPass.confirmar && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${formPass.nueva === formPass.confirmar ? 'text-green-400' : 'text-red-400'}`}>
                    {formPass.nueva === formPass.confirmar
                      ? <><CheckCircle size={11} /> Las contraseñas coinciden</>
                      : '✗ No coinciden'}
                  </p>
                )}
              </div>
            ))}
            <button onClick={cambiarPassword} disabled={guardandoPass}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: color }}>
              <Lock size={15} /> {guardandoPass ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
        )}

        {/* Cerrar sesión */}
        <div className="mt-4">
          <button onClick={logout}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-red-400 border border-red-900 bg-red-950/20 hover:bg-red-950/40 transition-all">
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>

      </main>
    </div>
  );
}
