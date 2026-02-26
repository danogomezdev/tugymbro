import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ArrowLeft, Check } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function RegistroGym() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    nombre_gym: '', slug_deseado: '', nombre_contacto: '',
    email_contacto: '', telefono: '', plan_solicitado: 'basico', mensaje: ''
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const slugify = (val) => val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await api.post('/public/solicitar-registro', form);
      setEnviado(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setCargando(false);
    }
  };

  if (enviado) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-400" size={40}/>
        </div>
        <h2 className="text-2xl font-black text-white mb-3">¡Solicitud enviada!</h2>
        <p className="text-gray-400 mb-6">Revisamos tu solicitud y te contactamos en menos de 24hs para activar tu gimnasio.</p>
        <button onClick={() => navigate('/')} className="text-orange-400 hover:text-orange-300 text-sm">← Volver al inicio</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition-colors text-sm">
          <ArrowLeft size={16}/> Volver
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center"><Dumbbell size={20} className="text-white"/></div>
          <div>
            <h1 className="text-xl font-black text-white">Registrá tu gimnasio</h1>
            <p className="text-gray-500 text-sm">Completá el formulario y te activamos en 24hs</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1.5">Nombre del gimnasio *</label>
              <input value={form.nombre_gym} onChange={e => { set('nombre_gym', e.target.value); set('slug_deseado', slugify(e.target.value)); }}
                className="input-field w-full" placeholder="Ej: CrossFit Norte" required/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1.5">URL de tu app *</label>
              <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <span className="px-3 text-gray-600 text-sm border-r border-gray-700 py-3 whitespace-nowrap">tugymbro.com/gym/</span>
                <input value={form.slug_deseado} onChange={e => set('slug_deseado', slugify(e.target.value))}
                  className="flex-1 bg-transparent px-3 py-3 text-white text-sm outline-none" placeholder="mi-gimnasio" required/>
              </div>
              <p className="text-gray-600 text-xs mt-1">Solo letras, números y guiones</p>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Tu nombre *</label>
              <input value={form.nombre_contacto} onChange={e => set('nombre_contacto', e.target.value)}
                className="input-field w-full" placeholder="Juan García" required/>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="input-field w-full" placeholder="+54 11 ..."/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1.5">Email de contacto *</label>
              <input type="email" value={form.email_contacto} onChange={e => set('email_contacto', e.target.value)}
                className="input-field w-full" placeholder="tu@email.com" required/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-2">Plan *</label>
              <div className="grid grid-cols-2 gap-3">
                {['basico','premium'].map(p => (
                  <button key={p} type="button" onClick={() => set('plan_solicitado', p)}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${form.plan_solicitado === p ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                    {p === 'basico' ? '📦 Básico' : '⭐ Premium'}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1.5">Mensaje (opcional)</label>
              <textarea value={form.mensaje} onChange={e => set('mensaje', e.target.value)}
                className="input-field w-full resize-none" rows={3} placeholder="Contanos sobre tu gimnasio..."/>
            </div>
          </div>
          <button type="submit" disabled={cargando} className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all">
            {cargando ? 'Enviando...' : 'Enviar solicitud →'}
          </button>
        </form>
      </div>
    </div>
  );
}
