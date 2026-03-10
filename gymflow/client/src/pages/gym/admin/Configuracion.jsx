import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Clock, Calendar, Settings, CreditCard, Dumbbell, Check, Users, Lock, Eye, EyeOff, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const HORAS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

export default function GymConfiguracion() {
  const { gymSlug } = useParams();
  const { gimnasio, usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const color = gimnasio?.color_primario || '#f97316';

  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'general';
  });

  const [form, setForm] = useState({
    precio_1dia: '', precio_2dias: '', precio_3dias: '', precio_libre: '',
    texto_bienvenida: '', color_primario: '#f97316',
    descripcion: '', instagram: '', whatsapp: '',
    alias_transferencia: '', nombre_titular: '', banco: '',
    modo_acceso: 'horarios', capacidad_default: 20,
    sin_limite_personas: false, planes_activos: ['2_dias', '3_dias'],
    plan_libre: false, abierto_24h: false,
    dias_abierto: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    hora_apertura: '', hora_cierre: '',
  });

  const [capacidadGlobal, setCapacidadGlobal] = useState(20);
  const [guardandoHorarios, setGuardandoHorarios] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Mi cuenta
  const [formCuenta, setFormCuenta] = useState({ nombre: '', apellido: '', email: '' });
  const [formPass, setFormPass] = useState({ actual: '', nueva: '', confirmar: '' });
  const [verPass, setVerPass] = useState({ actual: false, nueva: false, confirmar: false });
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);

  const buildGrid = useCallback((horariosDB) => {
    const grid = {};
    DIAS.forEach(dia => {
      grid[dia] = {};
      HORAS.forEach(hora => { grid[dia][hora] = { activo: false, capacidad: capacidadGlobal, id: null }; });
    });
    horariosDB.forEach(h => {
      const horaKey = h.hora_inicio?.slice(0, 5);
      if (grid[h.dia_semana] && grid[h.dia_semana][horaKey] !== undefined) {
        grid[h.dia_semana][horaKey] = { activo: h.activo !== false, capacidad: h.capacidad_maxima || capacidadGlobal, id: h.id };
      }
    });
    return grid;
  }, [capacidadGlobal]);

  const [grid, setGrid] = useState(() => {
    const g = {};
    DIAS.forEach(dia => { g[dia] = {}; HORAS.forEach(h => { g[dia][h] = { activo: false, capacidad: 20, id: null }; }); });
    return g;
  });

  useEffect(() => {
    api.get(`/gym/${gymSlug}/admin/configuracion`).then(r => {
      const c = r.data.configuracion;
      if (c) setForm({
        precio_1dia: c.precio_1dia || '', precio_2dias: c.precio_2dias || '',
        precio_3dias: c.precio_3dias || '', precio_libre: c.precio_libre || '',
        texto_bienvenida: c.texto_bienvenida || '', color_primario: c.color_primario || '#f97316',
        descripcion: c.descripcion || '', instagram: c.instagram || '', whatsapp: c.whatsapp || '',
        alias_transferencia: c.alias_transferencia || '', nombre_titular: c.nombre_titular || '', banco: c.banco || '',
        modo_acceso: c.modo_acceso || 'horarios', capacidad_default: c.capacidad_default || 20,
        sin_limite_personas: c.sin_limite_personas || false, planes_activos: c.planes_activos || ['2_dias', '3_dias'],
        plan_libre: c.plan_libre || false, abierto_24h: c.abierto_24h || false,
        dias_abierto: c.dias_abierto || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
        hora_apertura: c.hora_apertura || '', hora_cierre: c.hora_cierre || '',
      });
      const h = r.data.horarios || [];
      setGrid(buildGrid(h));
      if (h.length === 0 && (c?.modo_acceso === 'horarios' || !c?.modo_acceso)) setTab('horarios');
    }).catch(() => toast.error('Error al cargar configuración')).finally(() => setCargando(false));
    if (usuario) setFormCuenta({ nombre: usuario.nombre || '', apellido: usuario.apellido || '', email: usuario.email || '' });
  }, [gymSlug]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.put(`/gym/${gymSlug}/admin/configuracion`, form);
      toast.success('Configuración guardada ✅');
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const guardarHorarios = async () => {
    setGuardandoHorarios(true);
    try {
      const slots = [];
      DIAS.forEach(dia => {
        HORAS.forEach(hora => {
          if (grid[dia]?.[hora]?.activo) {
            const [hh] = hora.split(':');
            slots.push({ dia_semana: dia, hora_inicio: hora, hora_fin: `${String(parseInt(hh) + 1).padStart(2, '0')}:00`, capacidad_maxima: capacidadGlobal });
          }
        });
      });
      await api.post(`/gym/${gymSlug}/admin/horarios/bulk`, { slots });
      const { data } = await api.get(`/gym/${gymSlug}/admin/configuracion`);
      setGrid(buildGrid(data.horarios || []));
      toast.success(`${slots.length} turnos guardados ✅`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar horarios');
    } finally { setGuardandoHorarios(false); }
  };

  const guardarCuenta = async () => {
    setGuardandoCuenta(true);
    try {
      await api.put(`/gym/${gymSlug}/admin/configuracion/cuenta`, formCuenta);
      toast.success('Datos actualizados ✅');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
    finally { setGuardandoCuenta(false); }
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
    } catch (err) { toast.error(err.response?.data?.error || 'Contraseña actual incorrecta'); }
    finally { setGuardandoPass(false); }
  };

  const toggleCelda = (dia, hora) => {
    setGrid(prev => ({ ...prev, [dia]: { ...prev[dia], [hora]: { ...prev[dia][hora], activo: !prev[dia][hora].activo } } }));
  };

  const toggleDiaCompleto = (dia) => {
    const algunoActivo = HORAS.some(h => grid[dia][h]?.activo);
    setGrid(prev => ({ ...prev, [dia]: Object.fromEntries(HORAS.map(h => [h, { ...prev[dia][h], activo: !algunoActivo }])) }));
  };

  const toggleDia = (dia) => {
    setForm(f => ({
      ...f,
      dias_abierto: f.dias_abierto.includes(dia) ? f.dias_abierto.filter(d => d !== dia) : [...f.dias_abierto, dia]
    }));
  };

  const togglePlan = (plan) => {
    setForm(f => ({
      ...f,
      planes_activos: f.planes_activos.includes(plan) ? f.planes_activos.filter(p => p !== plan) : [...f.planes_activos, plan]
    }));
  };

  const tabs = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'acceso', label: 'Acceso', icon: Calendar },
    { key: 'horarios', label: 'Horarios', icon: Clock },
    { key: 'pagos', label: 'Pagos', icon: CreditCard },
    { key: 'planes', label: 'Planes', icon: Dumbbell },
    { key: 'cuenta', label: 'Mi cuenta', icon: User },
  ];

  if (cargando) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">Configuración</h1>
          </div>
          {tab !== 'cuenta' && tab !== 'horarios' && (
            <button onClick={guardar} disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: color }}>
              <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          )}
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Apariencia & Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color principal</label>
                  <input type="color" value={form.color_primario}
                    onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))}
                    className="w-14 h-10 rounded-lg cursor-pointer bg-gray-800 border border-gray-700" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Código hex</label>
                  <input value={form.color_primario}
                    onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))}
                    className="input-field w-full font-mono" placeholder="#f97316" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descripción del gym</label>
                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input-field w-full resize-none" rows={2} placeholder="Contá de qué se trata tu gym..." />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mensaje de bienvenida (en la app)</label>
                <textarea value={form.texto_bienvenida} onChange={e => setForm(f => ({ ...f, texto_bienvenida: e.target.value }))}
                  className="input-field w-full resize-none" rows={2} placeholder="Ej: Bienvenido a nuestro gym..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Instagram</label>
                  <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                    className="input-field w-full" placeholder="@tu_gym" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    className="input-field w-full" placeholder="+54 9 11 1234-5678" />
                </div>
              </div>
            </div>
          </div>
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
                  <input type="radio" name="modo_acceso" value={opt.key} checked={form.modo_acceso === opt.key}
                    onChange={e => setForm(f => ({ ...f, modo_acceso: e.target.value }))} className="mt-0.5" />
                  <div>
                    <p className="font-semibold text-white text-sm">{opt.label}</p>
                    <p className="text-gray-500 text-xs">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600">
              <input type="checkbox" checked={form.abierto_24h}
                onChange={e => setForm(f => ({ ...f, abierto_24h: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
              <div>
                <p className="font-semibold text-white text-sm">Abierto 24/7</p>
                <p className="text-gray-500 text-xs">El gym no tiene restricción de días u horarios</p>
              </div>
            </label>
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
            {/* Horario apertura/cierre — visible en modo libre o mixto */}
            {(form.modo_acceso === 'libre' || form.modo_acceso === 'mixto') && (
              <div>
                <p className="text-sm text-gray-400 mb-2 font-medium">Horario de atención</p>
                <p className="text-gray-600 text-xs mb-3">Esto se muestra a los clientes en la app para que sepan cuándo pueden ir.</p>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Apertura</label>
                    <select value={form.hora_apertura}
                      onChange={e => setForm(f => ({ ...f, hora_apertura: e.target.value }))}
                      className="input-field w-28">
                      <option value="">--</option>
                      {Array.from({ length: 18 }, (_, i) => `${String(i + 5).padStart(2,'0')}:00`).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-gray-600 mt-5">—</span>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cierre</label>
                    <select value={form.hora_cierre}
                      onChange={e => setForm(f => ({ ...f, hora_cierre: e.target.value }))}
                      className="input-field w-28">
                      <option value="">--</option>
                      {Array.from({ length: 18 }, (_, i) => `${String(i + 5).padStart(2,'0')}:00`).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600">
              <input type="checkbox" checked={form.sin_limite_personas}
                onChange={e => setForm(f => ({ ...f, sin_limite_personas: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
              <div>
                <p className="font-semibold text-white text-sm">Sin límite de personas por horario</p>
                <p className="text-gray-500 text-xs">Cualquier cantidad puede reservar el mismo turno</p>
              </div>
            </label>
            {!form.sin_limite_personas && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Capacidad por defecto (por horario)</label>
                <input type="number" value={form.capacidad_default}
                  onChange={e => setForm(f => ({ ...f, capacidad_default: parseInt(e.target.value) }))}
                  className="input-field w-32" min={1} />
              </div>
            )}
          </div>
        )}

        {/* HORARIOS */}
        {tab === 'horarios' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <input type="checkbox" id="libre" checked={form.modo_acceso === 'libre'}
                  onChange={e => setForm(f => ({ ...f, modo_acceso: e.target.checked ? 'libre' : 'horarios' }))}
                  className="w-4 h-4 mt-0.5 accent-orange-500" />
                <label htmlFor="libre" className="cursor-pointer">
                  <p className="font-semibold text-white text-sm">Acceso libre (sin turnos)</p>
                  <p className="text-gray-500 text-xs mt-0.5">Los clientes pueden venir cuando quieran.</p>
                </label>
              </div>
            </div>
            {form.modo_acceso !== 'libre' && (
              <>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-semibold">Capacidad por turno</p>
                      <p className="text-gray-500 text-xs">Personas máximas en cada hora</p>
                    </div>
                  </div>
                  <input type="number" min={1} max={200} value={capacidadGlobal}
                    onChange={e => setCapacidadGlobal(parseInt(e.target.value) || 1)}
                    className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-center font-bold text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-gray-800">
                    <p className="font-bold text-white">Seleccioná los horarios disponibles</p>
                    <p className="text-gray-500 text-xs mt-1">Tocá cada hora para habilitarla o deshabilitarla. Podés tildar/destildar un día entero.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-3 py-2.5 text-left">
                            <span className="text-xs text-gray-600 font-medium">Hora</span>
                          </th>
                          {DIAS.map(dia => (
                            <th key={dia} className="px-1 py-2.5 text-center min-w-[64px]">
                              <button onClick={() => toggleDiaCompleto(dia)}
                                className="group flex flex-col items-center gap-0.5 w-full hover:opacity-80 transition-opacity">
                                <span className="text-xs font-bold text-gray-300 capitalize">{dia.slice(0, 3)}</span>
                                <span className="text-[10px] text-gray-600 group-hover:text-orange-400">
                                  {HORAS.filter(h => grid[dia]?.[h]?.activo).length > 0
                                    ? `${HORAS.filter(h => grid[dia]?.[h]?.activo).length}h` : 'todo'}
                                </span>
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HORAS.map((hora, i) => (
                          <tr key={hora} className={i % 2 === 0 ? 'bg-gray-800/20' : ''}>
                            <td className="px-3 py-1.5">
                              <span className="text-xs text-gray-500 font-mono font-medium">{hora}</span>
                            </td>
                            {DIAS.map(dia => {
                              const activo = grid[dia]?.[hora]?.activo;
                              return (
                                <td key={dia} className="px-1 py-1 text-center">
                                  <button onClick={() => toggleCelda(dia, hora)}
                                    className={`w-10 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${activo ? 'text-white shadow-sm' : 'bg-gray-800 border border-gray-700 hover:border-gray-500'}`}
                                    style={activo ? { backgroundColor: color } : {}} title={`${dia} ${hora}`}>
                                    {activo && <Check size={12} strokeWidth={3} />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-5 border-t border-gray-800 flex items-center justify-between gap-4">
                    <p className="text-sm text-gray-400">
                      <span className="text-white font-bold">
                        {DIAS.reduce((acc, dia) => acc + HORAS.filter(h => grid[dia]?.[h]?.activo).length, 0)}
                      </span> turnos seleccionados en total
                    </p>
                    <button onClick={guardarHorarios} disabled={guardandoHorarios}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                      style={{ backgroundColor: color }}>
                      <Save size={15} /> {guardandoHorarios ? 'Guardando...' : 'Guardar horarios'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white">Datos de pago (transferencia)</h3>
            <p className="text-gray-500 text-sm">Estos datos aparecen en la landing de tu gym para que los clientes sepan a dónde transferir.</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Alias CBU/CVU</label>
              <input value={form.alias_transferencia} onChange={e => setForm(f => ({ ...f, alias_transferencia: e.target.value }))}
                className="input-field w-full" placeholder="TU.GYM.ALIAS" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Titular de la cuenta</label>
                <input value={form.nombre_titular} onChange={e => setForm(f => ({ ...f, nombre_titular: e.target.value }))}
                  className="input-field w-full" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Banco / Billetera</label>
                <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                  className="input-field w-full" placeholder="Mercado Pago, Galicia..." />
              </div>
            </div>
          </div>
        )}

        {/* PLANES */}
        {tab === 'planes' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-1">Packs de membresía</h3>
              <p className="text-gray-500 text-xs mb-5">Activá los packs que ofrecés. Cada uno puede tener un precio mensual.</p>
              <div className="space-y-3">
                {[
                  { key: '2_dias', label: '2 días por semana', desc: 'El cliente elige 2 días fijos a la semana', field: 'precio_2dias' },
                  { key: '3_dias', label: '3 días por semana', desc: 'El cliente elige 3 días fijos a la semana', field: 'precio_3dias' },
                ].map(({ key, label, desc, field }) => (
                  <div key={key} className={`rounded-xl border p-4 transition-all ${form.planes_activos?.includes(key) ? 'border-orange-500 bg-orange-500/5' : 'border-gray-700'}`}>
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <input type="checkbox" checked={form.planes_activos?.includes(key) || false}
                        onChange={() => togglePlan(key)} className="w-4 h-4 accent-orange-500" />
                      <div>
                        <p className="font-semibold text-white text-sm">{label}</p>
                        <p className="text-gray-500 text-xs">{desc}</p>
                      </div>
                    </label>
                    {form.planes_activos?.includes(key) && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">$</span>
                        <input type="number" value={form[field]} placeholder="Precio/mes"
                          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 w-40" />
                        <span className="text-gray-500 text-xs">/mes</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className={`rounded-xl border p-4 transition-all ${form.plan_libre ? 'border-orange-500 bg-orange-500/5' : 'border-gray-700'}`}>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={form.plan_libre || false}
                      onChange={e => setForm(f => ({ ...f, plan_libre: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                    <div>
                      <p className="font-semibold text-white text-sm">Pase libre</p>
                      <p className="text-gray-500 text-xs">Sin límite de días, puede venir cuando quiera</p>
                    </div>
                  </label>
                  {form.plan_libre && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">$</span>
                      <input type="number" value={form.precio_libre || ''} placeholder="Precio/mes"
                        onChange={e => setForm(f => ({ ...f, precio_libre: e.target.value }))}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 w-40" />
                      <span className="text-gray-500 text-xs">/mes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MI CUENTA */}
        {tab === 'cuenta' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white">Mis datos</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Nombre</label>
                  <input value={formCuenta.nombre} onChange={e => setFormCuenta(f => ({ ...f, nombre: e.target.value }))}
                    className="input-field w-full" placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Apellido</label>
                  <input value={formCuenta.apellido} onChange={e => setFormCuenta(f => ({ ...f, apellido: e.target.value }))}
                    className="input-field w-full" placeholder="Tu apellido" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                <input value={formCuenta.email} disabled className="input-field w-full opacity-50 cursor-not-allowed" />
                <p className="text-gray-600 text-xs mt-1">El email no se puede modificar</p>
              </div>
              <button onClick={guardarCuenta} disabled={guardandoCuenta}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ backgroundColor: color }}>
                <Save size={15} /> {guardandoCuenta ? 'Guardando...' : 'Guardar datos'}
              </button>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white">Cambiar contraseña</h3>
              {[
                { key: 'actual', label: 'Contraseña actual', placeholder: '••••••••' },
                { key: 'nueva', label: 'Nueva contraseña', placeholder: 'Mínimo 6 caracteres' },
                { key: 'confirmar', label: 'Confirmar nueva contraseña', placeholder: '••••••••' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                  <div className="relative">
                    <input type={verPass[key] ? 'text' : 'password'} value={formPass[key]}
                      onChange={e => setFormPass(f => ({ ...f, [key]: e.target.value }))}
                      className="input-field w-full pr-11" placeholder={placeholder} />
                    <button type="button" onClick={() => setVerPass(v => ({ ...v, [key]: !v[key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      {verPass[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {key === 'confirmar' && formPass.nueva && formPass.confirmar && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${formPass.nueva === formPass.confirmar ? 'text-green-400' : 'text-red-400'}`}>
                      {formPass.nueva === formPass.confirmar ? <><CheckCircle size={11} /> Coinciden</> : '✗ No coinciden'}
                    </p>
                  )}
                </div>
              ))}
              <button onClick={cambiarPassword} disabled={guardandoPass}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ backgroundColor: color }}>
                <Lock size={15} /> {guardandoPass ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        )}

        {/* Botón guardar general */}
        {tab !== 'cuenta' && tab !== 'horarios' && (
          <button onClick={guardar} disabled={guardando}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: color }}>
            <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        )}

      </main>
    </div>
  );
}
