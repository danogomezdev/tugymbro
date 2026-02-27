import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, ChevronDown, ChevronUp, Save, Zap, Shield } from 'lucide-react';
import { superApi } from '../../services/api';
import toast from 'react-hot-toast';

// TODAS las features posibles del sistema — editá este array para agregar más
const FEATURE_GROUPS = [
  {
    grupo: 'Módulos principales',
    features: [
      { key: 'feature_reservas',       label: 'Reserva de turnos',          desc: 'Los clientes pueden reservar horarios' },
      { key: 'feature_pagos',          label: 'Gestión de pagos',           desc: 'Comprobantes y solicitudes de pago' },
      { key: 'feature_notificaciones', label: 'Notificaciones',             desc: 'Push y alertas dentro de la app' },
      { key: 'feature_rutinas',        label: 'Rutinas personalizadas',     desc: 'El admin puede armar rutinas por cliente' },
      { key: 'feature_profesores',     label: 'Múltiples profesores',       desc: 'Asignar clientes a profesores' },
    ],
  },
  {
    grupo: 'Packs de membresía',
    desc: 'Qué opciones de plan puede configurar el gym admin',
    features: [
      { key: 'feature_pack_2dias',  label: 'Pack 2 días/semana',  desc: 'Ofrecer plan de 2 días' },
      { key: 'feature_pack_3dias',  label: 'Pack 3 días/semana',  desc: 'Ofrecer plan de 3 días' },
      { key: 'feature_pack_libre',  label: 'Pase libre',          desc: 'Membresía sin límite de días' },
    ],
  },
  {
    grupo: 'Personalización',
    features: [
      { key: 'feature_logo_propio',    label: 'Logo y colores propios',     desc: 'Branding personalizado' },
      { key: 'feature_estadisticas',   label: 'Estadísticas avanzadas',     desc: 'Gráficos y métricas detalladas' },
      { key: 'feature_recuperos',      label: 'Recupero de clases',         desc: 'Solicitudes de recupero' },
      { key: 'feature_ausencias',      label: 'Gestión de ausencias',       desc: 'Registro de faltas' },
    ],
  },
];

const ALL_FEATURES = FEATURE_GROUPS.flatMap(g => g.features);

const PLAN_ICONS = { 1: Shield, 2: Zap };
const PLAN_COLORS = { 1: '#6366f1', 2: '#f97316' };

export default function SuperAdminPlanes() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    superApi.get('/planes').then(r => setPlanes(r.data.planes)).finally(() => setCargando(false));
  }, []);

  const guardar = async () => {
    setGuardando(true);
    try {
      await superApi.put(`/planes/${editando.id}`, editando);
      setPlanes(prev => prev.map(p => p.id === editando.id ? editando : p));
      toast.success('Plan actualizado ✅');
      setEditando(null);
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const toggleFeature = (key) => {
    setEditando(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activarTodas = () => {
    const update = {};
    ALL_FEATURES.forEach(f => { update[f.key] = true; });
    setEditando(prev => ({ ...prev, ...update }));
  };

  const desactivarTodas = () => {
    const update = {};
    ALL_FEATURES.forEach(f => { update[f.key] = false; });
    setEditando(prev => ({ ...prev, ...update }));
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/superadmin')} className="text-gray-400 hover:text-white p-1">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Planes de la plataforma</h1>
            <p className="text-gray-500 text-xs">Configurá qué puede hacer cada tipo de gimnasio</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="h-80 bg-gray-800 rounded-2xl animate-pulse"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {planes.map((plan, idx) => {
              const Icon = PLAN_ICONS[plan.id] || Shield;
              const planColor = PLAN_COLORS[plan.id] || '#6366f1';
              const featuresActivas = ALL_FEATURES.filter(f => plan[f.key]).length;

              return (
                <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  {/* Header del plan */}
                  <div className="p-6 border-b border-gray-800" style={{ background: `linear-gradient(135deg, ${planColor}15 0%, transparent 100%)` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${planColor}25` }}>
                          <Icon size={20} style={{ color: planColor }} />
                        </div>
                        <div>
                          <h3 className="font-black text-white text-xl capitalize">{plan.nombre}</h3>
                          <p className="text-gray-500 text-xs">{featuresActivas}/{ALL_FEATURES.length} features activas</p>
                        </div>
                      </div>
                      <button onClick={() => setEditando({...plan})}
                        className="text-sm px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-80"
                        style={{ backgroundColor: `${planColor}20`, color: planColor }}>
                        Editar
                      </button>
                    </div>

                    {/* Precios */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-center">
                        <p className="text-white font-bold text-sm">USD {plan.precio_inicial || 0}</p>
                        <p className="text-gray-500 text-[10px]">Setup</p>
                      </div>
                      <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-center">
                        <p className="text-white font-bold text-sm">USD {plan.precio_mensual || 0}</p>
                        <p className="text-gray-500 text-[10px]">Mensual</p>
                      </div>
                      <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-center">
                        <p className="text-white font-bold text-sm">{plan.max_clientes || '∞'}</p>
                        <p className="text-gray-500 text-[10px]">Clientes</p>
                      </div>
                    </div>
                  </div>

                  {/* Features por grupo */}
                  <div className="p-4 space-y-4">
                    {FEATURE_GROUPS.map(grupo => (
                      <div key={grupo.grupo}>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{grupo.grupo}</p>
                        <div className="space-y-1">
                          {grupo.features.map(f => (
                            <div key={f.key} className="flex items-center gap-2.5 py-1">
                              {plan[f.key]
                                ? <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${planColor}25` }}>
                                    <Check size={11} style={{ color: planColor }} strokeWidth={3} />
                                  </div>
                                : <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    <X size={11} className="text-gray-600" strokeWidth={2} />
                                  </div>
                              }
                              <span className={`text-sm ${plan[f.key] ? 'text-gray-200' : 'text-gray-600'}`}>{f.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-8">
          Los cambios en planes afectan a todos los gimnasios de ese plan automáticamente.
        </p>
      </main>

      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold text-white text-lg capitalize">Editar: {editando.nombre}</h3>
                <p className="text-gray-500 text-xs">{ALL_FEATURES.filter(f => editando[f.key]).length} features activas</p>
              </div>
              <button onClick={() => setEditando(null)} className="text-gray-500 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* Precios y límites */}
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-3">Precios y límites</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Setup (USD)</label>
                    <input type="number" value={editando.precio_inicial || ''}
                      onChange={e => setEditando(p => ({...p, precio_inicial: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Mensual (USD)</label>
                    <input type="number" value={editando.precio_mensual || ''}
                      onChange={e => setEditando(p => ({...p, precio_mensual: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Máx. clientes</label>
                    <input type="number" value={editando.max_clientes || ''}
                      onChange={e => setEditando(p => ({...p, max_clientes: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-300">Features habilitadas</p>
                  <div className="flex gap-2">
                    <button onClick={desactivarTodas} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Ninguna</button>
                    <span className="text-gray-700">·</span>
                    <button onClick={activarTodas} className="text-xs text-gray-500 hover:text-green-400 transition-colors">Todas</button>
                  </div>
                </div>

                <div className="space-y-5">
                  {FEATURE_GROUPS.map(grupo => (
                    <div key={grupo.grupo}>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{grupo.grupo}</p>
                      <div className="space-y-1">
                        {grupo.features.map(f => (
                          <label key={f.key}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editando[f.key] ? 'border-orange-500/60 bg-orange-500/8' : 'border-gray-800 hover:border-gray-700'}`}>
                            <input type="checkbox" checked={!!editando[f.key]}
                              onChange={() => toggleFeature(f.key)}
                              className="w-4 h-4 accent-orange-500 flex-shrink-0" />
                            <div>
                              <p className={`text-sm font-medium ${editando[f.key] ? 'text-white' : 'text-gray-400'}`}>{f.label}</p>
                              <p className="text-gray-600 text-xs">{f.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex gap-3">
              <button onClick={() => setEditando(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm font-medium">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
