import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Clock, Calendar, Settings, CreditCard, Dumbbell } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const PLANES_OPCIONES = [
  { key: '1_dia', label: '1 día/semana' },
  { key: '2_dias', label: '2 días/semana' },
  { key: '3_dias', label: '3 días/semana' },
  { key: '4_dias', label: '4 días/semana' },
  { key: '5_dias', label: '5 días/semana' },
  { key: 'libre', label: 'Libre (sin límite)' },
];

export default function GymConfiguracion() {
  const { gymSlug } = useParams();
  const { gimnasio } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const color = gimnasio?.color_primario || '#f97316';

  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'general';
  });
  const [form, setForm] = useState({
    precio_1dia: '', precio_2dias: '', precio_3dias: '',
    texto_bienvenida: '', color_primario: '#f97316',
    descripcion: '', instagram: '', whatsapp: '',
    alias_transferencia: '', nombre_titular: '', banco: '',
    modo_acceso: 'horarios',
    capacidad_default: 20,
    sin_limite_personas: false,
    planes_activos: ['2_dias', '3_dias'],
    plan_libre: false,
    abierto_24h: false,
    dias_abierto: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  });
  const [horarios, setHorarios] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState({ dia_semana: 'lunes', hora_inicio: '09:00', hora_fin: '10:00', capacidad_maxima: 20 });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get(`/gym/${gymSlug}/admin/configuracion`).then(r => {
      const c = r.data.configuracion;
      if (c) setForm({
        precio_1dia: c.precio_1dia || '',
        precio_2dias: c.precio_2dias || '',
        precio_3dias: c.precio_3dias || '',
        texto_bienvenida: c.texto_bienvenida || '',
        color_primario: c.color_primario || '#f97316',
        descripcion: c.descripcion || '',
        instagram: c.instagram || '',
        whatsapp: c.whatsapp || '',
        alias_transferencia: c.alias_transferencia || '',
        nombre_titular: c.nombre_titular || '',
        banco: c.banco || '',
        modo_acceso: c.modo_acceso || 'horarios',
        capacidad_default: c.capacidad_default || 20,
        sin_limite_personas: c.sin_limite_personas || false,
        planes_activos: c.planes_activos || ['2_dias', '3_dias'],
        plan_libre: c.plan_libre || false,
        abierto_24h: c.abierto_24h || false,
        dias_abierto: c.dias_abierto || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
      });
      const h = r.data.horarios || [];
      setHorarios(h);
      // Si no tiene horarios configurados y usa modo horarios, mostrar pestaña horarios primero
      if (h.length === 0 && (c?.modo_acceso === 'horarios' || !c?.modo_acceso)) {
        setTab('horarios');
      }
    }).catch(() => toast.error('Error al cargar configuración')).finally(() => setCargando(false));
  }, [gymSlug]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.put(`/gym/${gymSlug}/admin/configuracion`, form);
      toast.success('Configuración guardada ✅');
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const agregarHorario = async () => {
    try {
      const { data } = await api.post(`/gym/${gymSlug}/admin/horarios`, nuevoHorario);
      setHorarios(h => [...h, data.horario]);
      toast.success('Horario agregado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al agregar horario'); }
  };

  const toggleHorario = async (id, activo) => {
    const h = horarios.find(h => h.id === id);
    try {
      await api.put(`/gym/${gymSlug}/admin/horarios/${id}`, { ...h, activo: !activo });
      setHorarios(prev => prev.map(h => h.id === id ? { ...h, activo: !activo } : h));
    } catch { toast.error('Error'); }
  };

  const eliminarHorario = async (id) => {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await api.delete(`/gym/${gymSlug}/admin/horarios/${id}`);
      setHorarios(h => h.filter(h => h.id !== id));
      toast.success('Horario eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const toggleDia = (dia) => {
    setForm(f => ({
      ...f,
      dias_abierto: f.dias_abierto.includes(dia)
        ? f.dias_abierto.filter(d => d !== dia)
        : [...f.dias_abierto, dia]
    }));
  };

  const togglePlan = (plan) => {
    setForm(f => ({
      ...f,
      planes_activos: f.planes_activos.includes(plan)
        ? f.planes_activos.filter(p => p !== plan)
        : [...f.planes_activos, plan]
    }));
  };

  const tabs = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'acceso', label: 'Acceso', icon: Calendar },
    { key: 'horarios', label: 'Horarios', icon: Clock },
    { key: 'pagos', label: 'Pagos', icon: CreditCard },
    { key: 'planes', label: 'Planes', icon: Dumbbell },
  ];

  if (cargando) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-bold text-white">Configuración</h1>
          </div>
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: color }}>
            <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === key ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
              style={tab === key ? { backgroundColor: color + '25', color } : {}}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* GENERAL */}
        {tab === 'general' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Apariencia & Info</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color principal</label>
                    <input type="color" value={form.color_primario} onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))} className="w-14 h-10 rounded-lg cursor-pointer bg-gray-800 border border-gray-700" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Código hex</label>
                    <input value={form.color_primario} onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))} className="input-field w-full font-mono" placeholder="#f97316" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Descripción del gym</label>
                  <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className="input-field w-full resize-none" rows={2} placeholder="Contá de qué se trata tu gym..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mensaje de bienvenida (en la app)</label>
                  <textarea value={form.texto_bienvenida} onChange={e => setForm(f => ({ ...f, texto_bienvenida: e.target.value }))} className="input-field w-full resize-none" rows={2} placeholder="Ej: Bienvenido a nuestro gym..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Instagram</label>
                    <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} className="input-field w-full" placeholder="@tu_gym" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">WhatsApp</label>
                    <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className="input-field w-full" placeholder="+54 9 11 1234-5678" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ACCESO */}
        {tab === 'acceso' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-white">Modo de acceso</h3>

            <div className="space-y-3">
              {[
                { key: 'horarios', label: 'Con horarios', desc: 'Los clientes reservan turnos en horarios específicos' },
                { key: 'libre', label: 'Acceso libre', desc: 'Sin turnos — los clientes van cuando quieran' },
                { key: 'mixto', label: 'Mixto', desc: 'Algunos servicios con turno, otros libres' },
              ].map(opt => (
                <label key={opt.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.modo_acceso === opt.key ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                  <input type="radio" name="modo_acceso" value={opt.key} checked={form.modo_acceso === opt.key} onChange={e => setForm(f => ({ ...f, modo_acceso: e.target.value }))} className="mt-0.5" />
                  <div>
                    <p className="font-semibold text-white text-sm">{opt.label}</p>
                    <p className="text-gray-500 text-xs">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600">
                <input type="checkbox" checked={form.abierto_24h} onChange={e => setForm(f => ({ ...f, abierto_24h: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <div>
                  <p className="font-semibold text-white text-sm">Abierto 24/7</p>
                  <p className="text-gray-500 text-xs">El gym no tiene restricción de días u horarios</p>
                </div>
              </label>
            </div>

            {!form.abierto_24h && (
              <div>
                <p className="text-sm text-gray-400 mb-2 font-medium">Días de atención</p>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(dia => (
                    <button key={dia} type="button" onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${form.dias_abierto.includes(dia) ? 'text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                      style={form.dias_abierto.includes(dia) ? { backgroundColor: color } : {}}>
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600">
                <input type="checkbox" checked={form.sin_limite_personas} onChange={e => setForm(f => ({ ...f, sin_limite_personas: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <div>
                  <p className="font-semibold text-white text-sm">Sin límite de personas por horario</p>
                  <p className="text-gray-500 text-xs">Cualquier cantidad puede reservar el mismo turno</p>
                </div>
              </label>
            </div>

            {!form.sin_limite_personas && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Capacidad por defecto (por horario)</label>
                <input type="number" value={form.capacidad_default} onChange={e => setForm(f => ({ ...f, capacidad_default: parseInt(e.target.value) }))} className="input-field w-32" min={1} />
              </div>
            )}
          </div>
        )}

        {/* HORARIOS */}
        {tab === 'horarios' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Agregar horario</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Día</label>
                  <select value={nuevoHorario.dia_semana} onChange={e => setNuevoHorario(h => ({ ...h, dia_semana: e.target.value }))} className="input-field w-full capitalize">
                    {DIAS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Desde</label>
                  <input type="time" value={nuevoHorario.hora_inicio} onChange={e => setNuevoHorario(h => ({ ...h, hora_inicio: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                  <input type="time" value={nuevoHorario.hora_fin} onChange={e => setNuevoHorario(h => ({ ...h, hora_fin: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Capacidad</label>
                  <input type="number" value={nuevoHorario.capacidad_maxima} onChange={e => setNuevoHorario(h => ({ ...h, capacidad_maxima: parseInt(e.target.value) }))} className="input-field w-full" min={1} />
                </div>
              </div>
              <button onClick={agregarHorario} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: color }}>
                <Plus size={16} /> Agregar horario
              </button>
            </div>

            {/* Lista por día */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Horarios configurados ({horarios.length})</h3>
              {horarios.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No hay horarios configurados. Agregá uno arriba.</p>
              ) : (
                <div className="space-y-2">
                  {DIAS.map(dia => {
                    const diaHorarios = horarios.filter(h => h.dia_semana === dia);
                    if (diaHorarios.length === 0) return null;
                    return (
                      <div key={dia}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 capitalize">{dia}</p>
                        {diaHorarios.map(h => (
                          <div key={h.id} className={`flex items-center justify-between p-3 rounded-xl border mb-1.5 transition-all ${h.activo ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 opacity-50'}`}>
                            <div className="flex items-center gap-3">
                              <Clock size={14} className="text-orange-500" />
                              <span className="text-white font-medium text-sm">{h.hora_inicio?.slice(0,5)} - {h.hora_fin?.slice(0,5)}</span>
                              <span className="text-gray-500 text-xs">{h.capacidad_maxima} personas</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleHorario(h.id, h.activo)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${h.activo ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                {h.activo ? 'Activo' : 'Inactivo'}
                              </button>
                              <button onClick={() => eliminarHorario(h.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white">Datos de pago (transferencia)</h3>
            <p className="text-gray-500 text-sm">Estos datos aparecen en la landing de tu gym para que los clientes sepan a dónde transferir.</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Alias CBU/CVU</label>
              <input value={form.alias_transferencia} onChange={e => setForm(f => ({ ...f, alias_transferencia: e.target.value }))} className="input-field w-full" placeholder="TU.GYM.ALIAS" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Titular de la cuenta</label>
                <input value={form.nombre_titular} onChange={e => setForm(f => ({ ...f, nombre_titular: e.target.value }))} className="input-field w-full" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Banco / Billetera</label>
                <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} className="input-field w-full" placeholder="Mercado Pago, Galicia..." />
              </div>
            </div>
          </div>
        )}

        {/* PLANES */}
        {tab === 'planes' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-white">Planes disponibles</h3>

            <div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600 mb-3">
                <input type="checkbox" checked={form.plan_libre} onChange={e => setForm(f => ({ ...f, plan_libre: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <div>
                  <p className="font-semibold text-white text-sm">Acceso libre (sin plan por días)</p>
                  <p className="text-gray-500 text-xs">El gym cobra mensualidad fija sin límite de días</p>
                </div>
              </label>
            </div>

            {!form.plan_libre && (
              <>
                <p className="text-sm text-gray-400">Seleccioná qué planes ofrecés:</p>
                <div className="space-y-2">
                  {PLANES_OPCIONES.filter(p => p.key !== 'libre').map(p => (
                    <label key={p.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.planes_activos.includes(p.key) ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                      <input type="checkbox" checked={form.planes_activos.includes(p.key)} onChange={() => togglePlan(p.key)} className="w-4 h-4 accent-orange-500" />
                      <span className="text-white text-sm font-medium">{p.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Precios por plan ($/mes)</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'precio_1dia', label: '1 día' },
                  { key: 'precio_2dias', label: '2 días' },
                  { key: 'precio_3dias', label: '3 días' },
                ].map(p => (
                  <div key={p.key}>
                    <label className="block text-xs text-gray-400 mb-1">{p.label} ($)</label>
                    <input type="number" value={form[p.key]} onChange={e => setForm(f => ({ ...f, [p.key]: e.target.value }))} className="input-field w-full" placeholder="0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={guardar} disabled={guardando}
          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: color }}>
          <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </main>
    </div>
  );
}
