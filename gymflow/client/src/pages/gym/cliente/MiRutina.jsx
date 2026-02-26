import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Dumbbell, CheckCircle, Circle, TrendingUp, Calendar, Award, Play, RotateCcw, BarChart2, List, ChevronDown, ChevronUp, Lock } from 'lucide-react';
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
  if (!datos || datos.length < 2) return <p className="text-gray-600 text-xs">Necesitás al menos 2 sesiones para ver el gráfico</p>;
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

  useEffect(() => { cargarDatos(); }, [gymSlug]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [rutinaRes, historialRes, progresoRes] = await Promise.all([
        api.get(`/gym/${gymSlug}/rutinas/mi-rutina`),
        api.get(`/gym/${gymSlug}/rutinas/mi-historial`),
        api.get(`/gym/${gymSlug}/rutinas/mi-progreso`),
      ]);
      setRutina(rutinaRes.data.rutina);
      setHistorialRutinas(rutinaRes.data.historialRutinas || []);
      setHistorial(historialRes.data.sesiones || []);
      setProgreso(progresoRes.data.progreso || {});
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
      await api.post(`/gym/${gymSlug}/rutinas/sesion/${sesion.id}/ejercicio`, { ejercicio_id: se.ejercicio_id, completado: nuevoEstado, peso_usado: pesoUsado });
      setSesion(prev => ({ ...prev, ejercicios_estado: prev.ejercicios_estado.map(e => e.id === se.id ? { ...e, completado: nuevoEstado, peso_usado: pesoUsado } : e) }));
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

  if (cargando) return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente />
      <main className="flex-1 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Mi Rutina</h1>

        {!rutina ? (
          <div className="card text-center py-16">
            <Dumbbell className="text-gray-700 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">Sin rutina asignada</h2>
            <p className="text-gray-500 text-sm">El admin todavía no te asignó una rutina.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 mb-6 bg-gray-900 p-1 rounded-xl overflow-x-auto">
              {[
                { key:'rutina', label:'Rutina', icon:Dumbbell },
                { key:'sesion', label:'Hoy', icon:Play },
                { key:'historial', label:'Historial', icon:Calendar },
                { key:'rutinas-ant', label:'Anteriores', icon:Award },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === key ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {tab === 'rutina' && (
              <div>
                <div className="card border border-orange-500/20 mb-4">
                  <h2 className="font-bold text-white mb-1">{rutina.nombre}</h2>
                  {rutina.descripcion && <p className="text-gray-400 text-sm">{rutina.descripcion}</p>}
                </div>
                <div className="flex gap-2 mb-4">
                  {Object.keys(rutina.dias || {}).map(d => (
                    <button key={d} onClick={() => setDiaVista(parseInt(d))}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${diaVista === parseInt(d) ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      Día {d}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 mb-4">
                  {rutina.dias?.[diaVista]?.map((ej, i) => (
                    <div key={ej.id} className="card">
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-500/10 text-orange-500 font-bold text-xs w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">{i+1}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-sm">{ej.nombre}</h3>
                          {ej.grupo_muscular && <p className="text-gray-600 text-xs mb-1">{ej.grupo_muscular}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{ej.series} series</span>
                            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{ej.repeticiones} {ej.unidad_reps === 'seg' ? 'seg' : 'reps'}</span>
                            {(ej.peso_kg) && <span className={`text-xs px-2 py-0.5 rounded-full ${ej.peso_fijo ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>{ej.peso_kg}kg {ej.peso_fijo ? '(fijo)' : '(sugerido)'}</span>}
                          </div>
                          {ej.notas && <p className="text-gray-500 text-xs mt-1.5 italic">{ej.notas}</p>}
                          {ej.historial_pesos?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-800">
                              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><TrendingUp size={10}/> Últimos pesos:</p>
                              <div className="flex gap-2 flex-wrap">
                                {ej.historial_pesos.map((h,idx) => (
                                  <div key={idx} className="text-center bg-gray-800 rounded-lg px-2 py-1">
                                    <p className="text-orange-400 font-bold text-xs">{h.peso}kg</p>
                                    <p className="text-gray-600 text-xs">{formatFecha(h.fecha)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={iniciarSesion} disabled={iniciandoSesion} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                  <Play size={18} /> {iniciandoSesion ? 'Iniciando...' : '💪 Iniciar sesión de hoy'}
                </button>
              </div>
            )}

            {tab === 'sesion' && (
              <div>
                {!sesion ? (
                  <div className="card text-center py-12">
                    <Play className="text-gray-600 mx-auto mb-3" size={44} />
                    <p className="text-gray-400 mb-4">No iniciaste la sesión de hoy</p>
                    <button onClick={iniciarSesion} disabled={iniciandoSesion} className="btn-primary">{iniciandoSesion ? 'Iniciando...' : '💪 Iniciar'}</button>
                  </div>
                ) : (
                  <>
                    <div className="card mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-sm">Progreso · Día {sesion.dia_rutina}</span>
                        <span className="text-orange-500 font-bold text-sm">{completados}/{total}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2.5">
                        <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style={{ width:`${pct}%` }} />
                      </div>
                      {pct === 100 && <div className="flex items-center gap-2 mt-3 text-green-400"><Award size={16}/><span className="text-sm font-bold">¡Sesión completada! 🎉</span></div>}
                    </div>
                    <div className="space-y-3">
                      {sesion.ejercicios_estado?.map(se => (
                        <div key={se.id} className={`card transition-all ${se.completado ? 'border border-green-500/30 bg-green-500/5' : ''}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleEjercicio(se)} className="mt-0.5 flex-shrink-0">
                              {se.completado ? <CheckCircle className="text-green-500" size={22}/> : <Circle className="text-gray-600 hover:text-orange-400" size={22}/>}
                            </button>
                            <div className="flex-1">
                              <p className={`font-bold text-sm ${se.completado ? 'text-gray-400 line-through' : 'text-white'}`}>{se.nombre_ejercicio}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{se.series_realizadas} series × {se.repeticiones_realizadas} {(() => { const ej = rutina?.dias?.[sesion.dia_rutina]?.find(e => e.id === se.ejercicio_id); return ej?.unidad_reps === 'seg' ? 'seg' : 'reps'; })()}</p>
                              {(() => {
                                const ej = rutina?.dias?.[sesion.dia_rutina]?.find(e => e.id === se.ejercicio_id);
                                if (se.completado) return se.peso_usado ? <p className="text-green-400 text-xs mt-1">✓ {se.peso_usado}kg</p> : null;
                                if (ej?.peso_fijo && ej?.peso_kg) return (
                                  <div className="flex items-center gap-2 mt-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
                                    <Lock size={12} className="text-orange-400"/>
                                    <span className="text-orange-300 text-sm font-bold">{ej.peso_kg}kg</span>
                                    <span className="text-orange-500/60 text-xs">(fijo)</span>
                                  </div>
                                );
                                return (
                                  <div className="flex items-center gap-2 mt-2">
                                    <input type="number" placeholder={ej?.peso_kg ? `Sugerido: ${ej.peso_kg}kg` : 'Peso (kg)'}
                                      value={pesosTemp[se.id] || ''} onChange={e => setPesosTemp(p => ({...p,[se.id]:e.target.value}))}
                                      className="input-field text-sm py-1.5 w-36" min="0" step="0.5"/>
                                    <span className="text-gray-500 text-sm">kg</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'rutinas-ant' && (
              <div>
                {historialRutinas.length === 0 ? (
                  <div className="card text-center py-12"><Award className="text-gray-700 mx-auto mb-3" size={44}/><p className="text-gray-500">Todavía no tenés rutinas anteriores</p></div>
                ) : (
                  <div className="space-y-3">
                    {historialRutinas.map(r => (
                      <div key={r.id} className="card">
                        <div className="flex items-center justify-between cursor-pointer" onClick={async () => {
                          if (rutinaArchivadaExp === r.id) { setRutinaArchivadaExp(null); return; }
                          if (!rutinaArchivadaData[r.id]) {
                            try {
                              const { data } = await api.get(`/gym/${gymSlug}/rutinas/mi-rutina/archivada/${r.id}`);
                              setRutinaArchivadaData(prev => ({...prev,[r.id]:data.rutina}));
                            } catch { toast.error('Error'); return; }
                          }
                          setRutinaArchivadaExp(r.id);
                        }}>
                          <div>
                            <p className="font-semibold text-white text-sm">{r.nombre}</p>
                            <p className="text-gray-500 text-xs">{formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</p>
                          </div>
                          {rutinaArchivadaExp === r.id ? <ChevronUp size={16} className="text-gray-500"/> : <ChevronDown size={16} className="text-gray-500"/>}
                        </div>
                        {rutinaArchivadaExp === r.id && rutinaArchivadaData[r.id] && (
                          <div className="mt-3 pt-3 border-t border-gray-800">
                            {Object.entries(rutinaArchivadaData[r.id].dias || {}).map(([dia, ejs]) => (
                              <div key={dia} className="mb-3">
                                <p className="text-orange-500 text-xs font-bold mb-2">Día {dia}</p>
                                {ejs.map((e,i) => (
                                  <div key={i} className="flex items-center justify-between py-1 text-sm">
                                    <span className="text-gray-300 text-xs">{e.nombre}</span>
                                    <span className="text-gray-500 text-xs">{e.series}×{e.repeticiones}{e.peso_kg ? ` · ${e.peso_kg}kg` : ''}</span>
                                  </div>
                                ))}
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

            {tab === 'historial' && (
              <div>
                <div className="flex gap-2 mb-4 bg-gray-900 p-1 rounded-xl">
                  <button onClick={() => setModoHistorial('lista')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${modoHistorial==='lista' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}><List size={13}/> Sesiones</button>
                  <button onClick={() => setModoHistorial('grafico')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${modoHistorial==='grafico' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}><BarChart2 size={13}/> Progreso</button>
                </div>

                {modoHistorial === 'lista' ? (
                  historial.length === 0 ? (
                    <div className="card text-center py-12"><Calendar className="text-gray-700 mx-auto mb-3" size={44}/><p className="text-gray-500">Todavía no tenés sesiones</p></div>
                  ) : (
                    <div className="space-y-3">
                      {historial.map(s => {
                        const p = s.total_ejercicios > 0 ? Math.round((parseInt(s.completados)/parseInt(s.total_ejercicios))*100) : 0;
                        return (
                          <div key={s.id} className="card">
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => cargarDetalleSesion(s.id)}>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${s.completada ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                  {s.completada ? <Award className="text-green-500" size={16}/> : <RotateCcw className="text-yellow-500" size={16}/>}
                                </div>
                                <div>
                                  <p className="font-semibold text-white text-sm">{formatFecha(s.fecha)}</p>
                                  <p className="text-gray-500 text-xs">Día {s.dia_rutina} · {s.completados}/{s.total_ejercicios}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-14 bg-gray-800 rounded-full h-1.5">
                                  <div className="bg-orange-500 h-1.5 rounded-full" style={{width:`${p}%`}}/>
                                </div>
                                {verDetalle === s.id ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
                              </div>
                            </div>
                            {verDetalle === s.id && sesionDetalle && (
                              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                                {sesionDetalle.ejercicios?.map((e,i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      {e.completado ? <CheckCircle className="text-green-500" size={12}/> : <Circle className="text-gray-600" size={12}/>}
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
                      <div className="card text-center py-12"><TrendingUp className="text-gray-700 mx-auto mb-3" size={44}/><p className="text-gray-500">Completá sesiones con peso para ver tu progreso</p></div>
                    ) : (
                      <div className="space-y-3">
                        <div className="card">
                          <label className="block text-sm text-gray-300 mb-2">Seleccioná un ejercicio</label>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.keys(progreso).map(nombre => (
                              <button key={nombre} onClick={() => setEjercicioGrafico(nombre)}
                                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${ejercicioGrafico===nombre ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                                {nombre}<span className="block opacity-70">{progreso[nombre].length} registros</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {ejercicioGrafico && progreso[ejercicioGrafico] && (
                          <div className="card">
                            <h3 className="font-bold text-white mb-3 text-sm">{ejercicioGrafico}</h3>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="text-center"><p className="text-xs text-gray-500">Primer</p><p className="text-orange-400 font-bold text-sm">{progreso[ejercicioGrafico][0]?.peso}kg</p></div>
                              <TrendingUp className="text-green-500" size={18}/>
                              <div className="text-center"><p className="text-xs text-gray-500">Último</p><p className="text-green-400 font-bold text-sm">{progreso[ejercicioGrafico][progreso[ejercicioGrafico].length-1]?.peso}kg</p></div>
                            </div>
                            <MiniGrafico datos={progreso[ejercicioGrafico]}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
