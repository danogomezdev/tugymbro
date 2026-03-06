import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Dumbbell, CheckCircle, Circle, Play, Award, ChevronDown, ChevronUp, TrendingUp, RotateCcw, Calendar, Lock, BarChart2, List, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const formatFecha = (f) => {
  if (!f) return '';
  const s = typeof f === 'string' ? f : f.toString();
  try { return format(new Date(s.includes('T') ? s : s + 'T00:00:00'), "d MMM", { locale: es }); }
  catch { return ''; }
};

const MiniGrafico = ({ datos }) => {
  if (!datos || datos.length < 2) return <p className="text-gray-600 text-xs text-center py-2">Necesitás al menos 2 sesiones para ver el gráfico</p>;
  const pesos = datos.map(d => parseFloat(d.peso) || 0);
  const max = Math.max(...pesos), min = Math.min(...pesos);
  const rango = max - min || 1;
  const W = 300, H = 80, pad = 20;
  const pts = datos.map((d, i) => ({
    x: pad + (i / (datos.length - 1)) * (W - pad * 2),
    y: H - pad - ((parseFloat(d.peso) - min) / rango) * (H - pad * 2),
    peso: d.peso, fecha: d.fecha
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 200 }}>
        <path d={path} stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#f97316" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#9ca3af" fontSize="9">{p.peso}kg</text>
            <text x={p.x} y={H - 4} textAnchor="middle" fill="#6b7280" fontSize="8">{formatFecha(p.fecha)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Vista compacta de rutina (como historial)
const RutinaCompacta = ({ rutina, expandida, onToggle }) => {
  const diasKeys = rutina ? Object.keys(rutina.dias || {}).map(Number).sort((a, b) => a - b) : [];
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div>
          <p className="font-semibold text-white text-sm">{rutina.nombre}</p>
          {rutina.descripcion && <p className="text-gray-500 text-xs mt-0.5">{rutina.descripcion}</p>}
        </div>
        {expandida
          ? <ChevronUp size={15} className="text-gray-500 flex-shrink-0" />
          : <ChevronDown size={15} className="text-gray-500 flex-shrink-0" />}
      </div>
      {expandida && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-4">
          {diasKeys.map(dia => (
            <div key={dia}>
              <p className="text-orange-500 text-xs font-bold mb-2">Día {dia}</p>
              <div className="space-y-1">
                {rutina.dias[dia].map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{e.nombre}</span>
                    <span className="text-gray-600">
                      {e.series}×{e.repeticiones}{e.unidad_reps === 'seg' ? 'seg' : ''}{e.peso_kg ? ` · ${e.peso_kg}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function MiRutina() {
  const { gymSlug } = useParams();
  const [rutina, setRutina] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [progreso, setProgreso] = useState({});
  const [historialRutinas, setHistorialRutinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [tab, setTab] = useState('rutina');
  const [diaVista, setDiaVista] = useState(1);
  const [pesosTemp, setPesosTemp] = useState({});
  const [sesionDetalle, setSesionDetalle] = useState(null);
  const [verDetalle, setVerDetalle] = useState(null);
  const [modoHistorial, setModoHistorial] = useState('lista');
  const [ejercicioGrafico, setEjercicioGrafico] = useState(null);
  const [rutinaArchivadaExp, setRutinaArchivadaExp] = useState(null);
  const [rutinaArchivadaData, setRutinaArchivadaData] = useState({});
  const [tieneClaseHoy, setTieneClaseHoy] = useState(false);
  const [rutinaExpandida, setRutinaExpandida] = useState(false);

  useEffect(() => { cargarDatos(); }, [gymSlug]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const anio = hoy.getFullYear();
      const fechaHoy = hoy.toISOString().split('T')[0];

      const [rutinaRes, historialRes, progresoRes, reservasRes] = await Promise.all([
        api.get(`/gym/${gymSlug}/rutinas/mi-rutina`),
        api.get(`/gym/${gymSlug}/rutinas/mi-historial`),
        api.get(`/gym/${gymSlug}/rutinas/mi-progreso`),
        api.get(`/gym/${gymSlug}/cliente/reservas?mes=${mes}&anio=${anio}`),
      ]);

      setRutina(rutinaRes.data.rutina);
      setHistorialRutinas(rutinaRes.data.historialRutinas || []);
      setHistorial(historialRes.data.sesiones || []);
      setProgreso(progresoRes.data.progreso || {});

      // Verificar si tiene reserva activa hoy
      const reservas = reservasRes.data.reservas || [];
      const claseHoy = reservas.some(r => {
        const fechaReserva = r.fecha?.split('T')[0];
        return fechaReserva === fechaHoy && r.estado !== 'cancelada';
      });
      setTieneClaseHoy(claseHoy);

    } catch (err) { console.error(err); }
    finally { setCargando(false); }
  };

  const iniciarSesion = async () => {
    setIniciandoSesion(true);
    try {
      const { data } = await api.post(`/gym/${gymSlug}/rutinas/sesion/iniciar`);
      setSesion(data.sesion);
      setTab('sesion');
      toast.success(`💪 Sesión iniciada — Día ${data.sesion?.dia_rutina}!`);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al iniciar sesión'); }
    finally { setIniciandoSesion(false); }
  };

  const toggleEjercicio = async (se) => {
    const ej = rutina?.dias?.[sesion.dia_rutina]?.find(e => e.id === se.ejercicio_id);
    const nuevoEstado = !se.completado;
    const pesoUsado = ej?.peso_fijo ? ej.peso_kg : (pesosTemp[se.id] || null);
    try {
await api.post(`/gym/${gymSlug}/rutinas/sesion/${se.id}/ejercicio`, { completado: nuevoEstado, peso_usado: pesoUsado });      setSesion(prev => ({ ...prev, ejercicios_estado: prev.ejercicios_estado.map(e => e.id === se.id ? { ...e, completado: nuevoEstado, peso_usado: pesoUsado } : e) }));
      if (nuevoEstado) toast.success('✅ Ejercicio completado!');
    } catch { toast.error('Error al actualizar'); }
  };

  const cargarDetalleSesion = async (sesionId) => {
    if (verDetalle === sesionId) { setVerDetalle(null); setSesionDetalle(null); return; }
    try {
      const { data } = await api.get(`/gym/${gymSlug}/rutinas/sesion/${sesionId}`);
      setSesionDetalle(data);
      setVerDetalle(sesionId);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const completados = sesion?.ejercicios_estado?.filter(e => e.completado).length || 0;
  const total = sesion?.ejercicios_estado?.length || 0;
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  const diasKeys = rutina ? Object.keys(rutina.dias || {}).map(Number).sort((a, b) => a - b) : [];

  if (cargando) return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 pt-8 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse" />)}
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">

        <h1 className="text-xl font-bold text-white mb-5">Mi Rutina</h1>

        {!rutina ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-16 px-6">
            <Dumbbell className="text-gray-700 mx-auto mb-3" size={40} />
            <h2 className="text-lg font-bold text-white mb-1">Sin rutina asignada</h2>
            <p className="text-gray-500 text-sm">El entrenador todavía no te asignó una rutina.</p>
          </div>
        ) : (
          <>
            {/* Si NO tiene clase hoy: vista compacta */}
            {!tieneClaseHoy ? (
              <div className="space-y-4">
                {/* Banner informativo */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Hoy no tenés clase</p>
                    <p className="text-gray-500 text-xs">Reservá un turno para poder iniciar tu sesión de entrenamiento.</p>
                  </div>
                </div>

                {/* Rutina compacta con toggle */}
                <RutinaCompacta
                  rutina={rutina}
                  expandida={rutinaExpandida}
                  onToggle={() => setRutinaExpandida(v => !v)}
                />

                {/* Historial reciente compacto */}
                {historial.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Últimas sesiones</p>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                      {historial.slice(0, 3).map((s, i) => {
                        const p = s.total_ejercicios > 0 ? Math.round((parseInt(s.completados) / parseInt(s.total_ejercicios)) * 100) : 0;
                        return (
                          <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(historial.length, 3) - 1 ? 'border-b border-gray-800' : ''}`}>
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${s.completada ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                              {s.completada ? <Award className="text-green-500" size={13} /> : <RotateCcw className="text-yellow-500" size={13} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-xs font-medium">Día {s.dia_rutina} · {formatFecha(s.fecha)}</p>
                              <p className="text-gray-600 text-xs">{s.completados}/{s.total_ejercicios} ejercicios</p>
                            </div>
                            <div className="w-12 bg-gray-800 rounded-full h-1.5">
                              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${p}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Si TIENE clase hoy: vista completa con tabs */
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-5 bg-gray-900 p-1 rounded-xl">
                  {[
                    { key: 'rutina', label: 'Rutina', icon: Dumbbell },
                    { key: 'sesion', label: 'Hoy', icon: Play },
                    { key: 'historial', label: 'Historial', icon: Calendar },
                    { key: 'rutinas-ant', label: 'Anteriores', icon: Award },
                  ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === key ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>

                {/* TAB: RUTINA */}
                {tab === 'rutina' && (
                  <div>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
                      <h2 className="font-bold text-white text-sm">{rutina.nombre}</h2>
                      {rutina.descripcion && <p className="text-gray-500 text-xs mt-0.5">{rutina.descripcion}</p>}
                    </div>

                    {/* Selector de días — Día 1, Día 2... */}
                    <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                      {diasKeys.map(d => (
                        <button key={d} onClick={() => setDiaVista(d)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${diaVista === d ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
                          Día {d}
                        </button>
                      ))}
                    </div>

                    {/* Ejercicios del día */}
                    <div className="space-y-2 mb-5">
                      {rutina.dias?.[diaVista]?.map((ej, i) => (
                        <div key={ej.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-orange-500 font-bold text-xs">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm leading-tight">{ej.nombre}</p>
                            {ej.grupo_muscular && <p className="text-gray-600 text-xs mb-1">{ej.grupo_muscular}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-xs text-gray-300 bg-gray-800 px-2 py-0.5 rounded-lg">{ej.series} series × {ej.repeticiones} {ej.unidad_reps === 'seg' ? 'seg' : 'reps'}</span>
                              {ej.peso_kg && (
                                <span className={`text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 ${ej.peso_fijo ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                  {ej.peso_fijo && <Lock size={9} />}{ej.peso_kg}kg
                                </span>
                              )}
                              {ej.descanso_seg && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-lg">{ej.descanso_seg}s desc.</span>}
                            </div>
                            {ej.notas && <p className="text-gray-500 text-xs mt-1.5 italic">{ej.notas}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={iniciarSesion} disabled={iniciandoSesion}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 transition-colors active:scale-95 disabled:opacity-50">
                      <Play size={16} /> {iniciandoSesion ? 'Iniciando...' : '💪 Iniciar sesión de hoy'}
                    </button>
                  </div>
                )}

                {/* TAB: SESION */}
                {tab === 'sesion' && (
                  <div>
                    {!sesion ? (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-12 px-6">
                        <Play className="text-gray-700 mx-auto mb-3" size={36} />
                        <p className="text-gray-400 text-sm mb-4">No iniciaste la sesión de hoy</p>
                        <button onClick={iniciarSesion} disabled={iniciandoSesion}
                          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors">
                          {iniciandoSesion ? 'Iniciando...' : '💪 Iniciar'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold text-sm">Día {sesion.dia_rutina}</span>
                            <span className="text-orange-500 font-bold text-sm">{completados}/{total}</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          {pct === 100 && (
                            <div className="flex items-center gap-2 mt-3 text-green-400">
                              <Award size={14} /><span className="text-xs font-bold">¡Sesión completada! 🎉</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {sesion.ejercicios_estado?.map(se => {
                            const ej = rutina?.dias?.[sesion.dia_rutina]?.find(e => e.id === se.ejercicio_id);
                            return (
                              <div key={se.id} className={`bg-gray-900 border rounded-2xl p-3 transition-all ${se.completado ? 'border-green-500/30 bg-green-500/5' : 'border-gray-800'}`}>
                                <div className="flex items-start gap-3">
                                  <button onClick={() => toggleEjercicio(se)} className="mt-0.5 flex-shrink-0">
                                    {se.completado
                                      ? <CheckCircle className="text-green-500" size={20} />
                                      : <Circle className="text-gray-600 hover:text-orange-400" size={20} />}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`font-semibold text-sm ${se.completado ? 'text-gray-500 line-through' : 'text-white'}`}>{se.nombre_ejercicio}</p>
                                    <p className="text-gray-600 text-xs mt-0.5">{se.series_realizadas} × {se.repeticiones_realizadas} {ej?.unidad_reps === 'seg' ? 'seg' : 'reps'}</p>
                                    {!se.completado && (
                                      ej?.peso_fijo && ej?.peso_kg ? (
                                        <div className="flex items-center gap-1.5 mt-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1 w-fit">
                                          <Lock size={10} className="text-orange-400" />
                                          <span className="text-orange-300 text-xs font-bold">{ej.peso_kg}kg fijo</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                          <input type="number"
                                            placeholder={ej?.peso_kg ? `Sug. ${ej.peso_kg}kg` : 'Peso kg'}
                                            value={pesosTemp[se.id] || ''}
                                            onChange={e => setPesosTemp(p => ({ ...p, [se.id]: e.target.value }))}
                                            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white w-28 outline-none focus:border-orange-500" min="0" step="0.5" />
                                        </div>
                                      )
                                    )}
                                    {se.completado && se.peso_usado && (
                                      <p className="text-green-400 text-xs mt-1">✓ {se.peso_usado}kg</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB: HISTORIAL */}
                {tab === 'historial' && (
                  <div>
                    <div className="flex gap-1 mb-4 bg-gray-900 p-1 rounded-xl">
                      <button onClick={() => setModoHistorial('lista')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${modoHistorial === 'lista' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}><List size={12} /> Sesiones</button>
                      <button onClick={() => setModoHistorial('grafico')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${modoHistorial === 'grafico' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}><BarChart2 size={12} /> Progreso</button>
                    </div>

                    {modoHistorial === 'lista' ? (
                      historial.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-12">
                          <Calendar className="text-gray-700 mx-auto mb-3" size={36} />
                          <p className="text-gray-500 text-sm">Todavía no tenés sesiones</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {historial.map(s => {
                            const p = s.total_ejercicios > 0 ? Math.round((parseInt(s.completados) / parseInt(s.total_ejercicios)) * 100) : 0;
                            return (
                              <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => cargarDetalleSesion(s.id)}>
                                  <div className={`p-2 rounded-xl flex-shrink-0 ${s.completada ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                    {s.completada ? <Award className="text-green-500" size={14} /> : <RotateCcw className="text-yellow-500" size={14} />}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-white text-sm font-semibold">{formatFecha(s.fecha)}</p>
                                    <p className="text-gray-500 text-xs">Día {s.dia_rutina} · {s.completados}/{s.total_ejercicios}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 bg-gray-800 rounded-full h-1.5">
                                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${p}%` }} />
                                    </div>
                                    {verDetalle === s.id ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                                  </div>
                                </div>
                                {verDetalle === s.id && sesionDetalle && (
                                  <div className="border-t border-gray-800 px-3 py-2.5 space-y-1.5">
                                    {sesionDetalle.ejercicios?.map((e, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          {e.completado ? <CheckCircle className="text-green-500" size={11} /> : <Circle className="text-gray-700" size={11} />}
                                          <span className={e.completado ? 'text-gray-300' : 'text-gray-600'}>{e.nombre_ejercicio}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">{e.series_realizadas}×{e.repeticiones_realizadas}</span>
                                          {e.peso_usado && <span className="text-orange-400 ml-2">{e.peso_usado}kg</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <div>
                        {Object.keys(progreso).length === 0 ? (
                          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-12">
                            <TrendingUp className="text-gray-700 mx-auto mb-3" size={36} />
                            <p className="text-gray-500 text-sm">Completá sesiones con peso para ver tu progreso</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              {Object.keys(progreso).map(nombre => (
                                <button key={nombre} onClick={() => setEjercicioGrafico(nombre)}
                                  className={`text-left px-3 py-2.5 rounded-xl text-xs transition-colors border ${ejercicioGrafico === nombre ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}>
                                  <p className="font-semibold">{nombre}</p>
                                  <p className="opacity-70 mt-0.5">{progreso[nombre].length} registros</p>
                                </button>
                              ))}
                            </div>
                            {ejercicioGrafico && progreso[ejercicioGrafico] && (
                              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <h3 className="font-bold text-white text-sm mb-3">{ejercicioGrafico}</h3>
                                <div className="flex items-center gap-4 mb-4">
                                  <div className="text-center"><p className="text-xs text-gray-500">Primer</p><p className="text-orange-400 font-bold text-sm">{progreso[ejercicioGrafico][0]?.peso}kg</p></div>
                                  <TrendingUp className="text-green-500 flex-1" size={16} />
                                  <div className="text-center"><p className="text-xs text-gray-500">Último</p><p className="text-green-400 font-bold text-sm">{progreso[ejercicioGrafico][progreso[ejercicioGrafico].length - 1]?.peso}kg</p></div>
                                </div>
                                <MiniGrafico datos={progreso[ejercicioGrafico]} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: RUTINAS ANTERIORES */}
                {tab === 'rutinas-ant' && (
                  <div>
                    {historialRutinas.length === 0 ? (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-12">
                        <Award className="text-gray-700 mx-auto mb-3" size={36} />
                        <p className="text-gray-500 text-sm">Todavía no tenés rutinas anteriores</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {historialRutinas.map(r => (
                          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between p-3 cursor-pointer" onClick={async () => {
                              if (rutinaArchivadaExp === r.id) { setRutinaArchivadaExp(null); return; }
                              if (!rutinaArchivadaData[r.id]) {
                                try {
                                  const { data } = await api.get(`/gym/${gymSlug}/rutinas/mi-rutina/archivada/${r.id}`);
                                  setRutinaArchivadaData(prev => ({ ...prev, [r.id]: data.rutina }));
                                } catch { toast.error('Error'); return; }
                              }
                              setRutinaArchivadaExp(r.id);
                            }}>
                              <div>
                                <p className="font-semibold text-white text-sm">{r.nombre}</p>
                                <p className="text-gray-500 text-xs">{formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</p>
                              </div>
                              {rutinaArchivadaExp === r.id ? <ChevronUp size={15} className="text-gray-600" /> : <ChevronDown size={15} className="text-gray-600" />}
                            </div>
                            {rutinaArchivadaExp === r.id && rutinaArchivadaData[r.id] && (
                              <div className="border-t border-gray-800 px-3 py-3 space-y-3">
                                {Object.entries(rutinaArchivadaData[r.id].dias || {}).map(([dia, ejs]) => (
                                  <div key={dia}>
                                    <p className="text-orange-500 text-xs font-bold mb-1.5">Día {dia}</p>
                                    <div className="space-y-1">
                                      {ejs.map((e, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                          <span className="text-gray-400">{e.nombre}</span>
                                          <span className="text-gray-600">{e.series}×{e.repeticiones}{e.peso_kg ? ` · ${e.peso_kg}kg` : ''}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
