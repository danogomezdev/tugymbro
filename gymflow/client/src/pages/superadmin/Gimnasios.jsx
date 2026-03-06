import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Pause, Play, Settings, ExternalLink, Search, Plus, X, Copy, Check } from 'lucide-react';
import { superApi } from '../../services/api';
import toast from 'react-hot-toast';

const formatFecha = (f) => { try { return new Date(f).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '-'; }};
const estadoColor = { activo:'text-green-400 bg-green-500/10', suspendido:'text-red-400 bg-red-500/10', cancelado:'text-gray-500 bg-gray-800', pendiente:'text-yellow-400 bg-yellow-500/10' };

const FORM_VACIO = { nombre: '', slug: '', email_contacto: '', nombre_contacto: '', password_admin: '', plan_id: 1 };

export default function SuperAdminGimnasios() {
  const navigate = useNavigate();
  const [gimnasios, setGimnasios] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalPlan, setModalPlan] = useState(null);
  const [nuevoPlan, setNuevoPlan] = useState(1);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState(FORM_VACIO);
  const [creando, setCreando] = useState(false);
  const [credenciales, setCredenciales] = useState(null); // mostrar al final
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    Promise.all([superApi.get('/gimnasios'), superApi.get('/planes')])
      .then(([g, p]) => { setGimnasios(g.data.gimnasios); setPlanes(p.data.planes); })
      .finally(() => setCargando(false));
  }, []);

  const suspender = async (gym) => {
    if (!window.confirm(`¿Suspender "${gym.nombre}"?`)) return;
    try {
      await superApi.put(`/gimnasios/${gym.id}/suspender`);
      setGimnasios(prev => prev.map(g => g.id === gym.id ? {...g, estado:'suspendido'} : g));
      toast.success('Gimnasio suspendido');
    } catch { toast.error('Error'); }
  };

  const reactivar = async (gym) => {
    try {
      await superApi.put(`/gimnasios/${gym.id}/reactivar`);
      setGimnasios(prev => prev.map(g => g.id === gym.id ? {...g, estado:'activo'} : g));
      toast.success('Gimnasio reactivado');
    } catch { toast.error('Error'); }
  };

  const cambiarPlan = async () => {
    try {
      await superApi.put(`/gimnasios/${modalPlan.id}/plan`, { plan_id: nuevoPlan });
      const planNombre = planes.find(p => p.id === parseInt(nuevoPlan))?.nombre;
      setGimnasios(prev => prev.map(g => g.id === modalPlan.id ? {...g, plan_nombre: planNombre} : g));
      toast.success('Plan actualizado');
      setModalPlan(null);
    } catch { toast.error('Error'); }
  };

  const crearGimnasio = async () => {
    if (!formNuevo.nombre || !formNuevo.slug || !formNuevo.email_contacto) {
      toast.error('Completá nombre, slug y email');
      return;
    }
    setCreando(true);
    try {
      const { data } = await superApi.post('/gimnasios', formNuevo);
      setGimnasios(prev => [...prev, { ...data.gym, total_clientes: 0, plan_nombre: planes.find(p => p.id === formNuevo.plan_id)?.nombre }]);
      setCredenciales(data.credenciales);
      setModalNuevo(false);
      setFormNuevo(FORM_VACIO);
      toast.success('Gimnasio creado ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear');
    } finally { setCreando(false); }
  };

  const copiarCredenciales = () => {
    const texto = `Gym: ${credenciales.url}\nEmail: ${credenciales.email}\nContraseña: ${credenciales.password}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const filtrados = gimnasios.filter(g =>
    g.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.slug.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/superadmin')} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <h1 className="text-xl font-bold text-white flex-1">Gimnasios</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 outline-none w-48"
              placeholder="Buscar..."/>
          </div>
          <button onClick={() => setModalNuevo(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            <Plus size={16}/> Nuevo gym
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16"><Building2 className="text-gray-700 mx-auto mb-4" size={48}/><p className="text-gray-500">No hay gimnasios todavía</p></div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(g => (
              <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold text-white">{g.nombre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColor[g.estado]}`}>{g.estado}</span>
                    <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{g.plan_nombre}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>/{g.slug}</span>
                    <span className="flex items-center gap-1"><Users size={11}/> {g.total_clientes} clientes</span>
                    <span>Desde {formatFecha(g.creado_en)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/gym/${g.slug}`} target="_blank" rel="noreferrer"
                    className="text-gray-500 hover:text-white p-2 transition-colors" title="Ver app">
                    <ExternalLink size={16}/>
                  </a>
                  <button onClick={() => { setModalPlan(g); setNuevoPlan(g.plan_id || 1); }}
                    className="text-gray-500 hover:text-orange-400 p-2 transition-colors" title="Cambiar plan">
                    <Settings size={16}/>
                  </button>
                  {g.estado === 'activo'
                    ? <button onClick={() => suspender(g)} className="text-gray-500 hover:text-red-400 p-2 transition-colors" title="Suspender"><Pause size={16}/></button>
                    : <button onClick={() => reactivar(g)} className="text-gray-500 hover:text-green-400 p-2 transition-colors" title="Reactivar"><Play size={16}/></button>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal cambiar plan */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white mb-4">Cambiar plan: {modalPlan.nombre}</h3>
            <select value={nuevoPlan} onChange={e => setNuevoPlan(parseInt(e.target.value))} className="input-field w-full mb-4">
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setModalPlan(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={cambiarPlan} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear nuevo gym */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">Crear nuevo gimnasio</h3>
              <button onClick={() => setModalNuevo(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">Nombre del gimnasio *</label>
                  <input value={formNuevo.nombre}
                    onChange={e => setFormNuevo(f => ({ ...f, nombre: e.target.value, slug: slugify(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                    placeholder="TwinsFit Centro" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">Slug (URL) *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">/gym/</span>
                    <input value={formNuevo.slug}
                      onChange={e => setFormNuevo(f => ({ ...f, slug: slugify(e.target.value) }))}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                      placeholder="twinsfit-centro" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">Email del admin *</label>
                  <input type="email" value={formNuevo.email_contacto}
                    onChange={e => setFormNuevo(f => ({ ...f, email_contacto: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                    placeholder="admin@twinsfit.com" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Nombre del contacto</label>
                  <input value={formNuevo.nombre_contacto}
                    onChange={e => setFormNuevo(f => ({ ...f, nombre_contacto: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                    placeholder="Juan" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Plan</label>
                  <select value={formNuevo.plan_id}
                    onChange={e => setFormNuevo(f => ({ ...f, plan_id: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Contraseña del admin
                    <span className="text-gray-600 ml-1">(si dejás vacío se usa "Cambiar123!" y deberá cambiarla)</span>
                  </label>
                  <input type="password" value={formNuevo.password_admin}
                    onChange={e => setFormNuevo(f => ({ ...f, password_admin: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                    placeholder="Dejar vacío = contraseña temporal" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
              <button onClick={() => setModalNuevo(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={crearGimnasio} disabled={creando}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm disabled:opacity-50 transition-all">
                {creando ? 'Creando...' : 'Crear gimnasio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal credenciales post-creación */}
      {credenciales && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-green-500/30 rounded-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-green-400" />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">¡Gym creado!</h3>
              <p className="text-gray-500 text-sm mb-5">Estas son las credenciales de acceso</p>

              <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2 mb-4">
                <div>
                  <p className="text-xs text-gray-500">URL del gym</p>
                  <p className="text-orange-400 font-mono text-sm">/gym{credenciales.url.replace('/gym', '') || credenciales.url}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-white font-mono text-sm">{credenciales.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contraseña</p>
                  <p className="text-white font-mono text-sm font-bold">{credenciales.password}</p>
                </div>
                {credenciales.debe_cambiar && (
                  <p className="text-yellow-400 text-xs mt-2">⚠ Debe cambiar la contraseña en el primer login</p>
                )}
              </div>

              <button onClick={copiarCredenciales}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition-all mb-3">
                {copiado ? <><Check size={15} className="text-green-400"/> Copiado</> : <><Copy size={15}/> Copiar credenciales</>}
              </button>
              <button onClick={() => setCredenciales(null)}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
