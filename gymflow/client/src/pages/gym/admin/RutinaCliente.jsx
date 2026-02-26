import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, Trash2, Save, ArrowLeft, Lock, Unlock, Calendar, Award, ChevronDown, ChevronUp, Eye, Settings, PlusCircle, BookOpen, X, Timer, LayoutDashboard, Users, UserCheck, CreditCard, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const formatFecha = (f) => {
  if (!f) return '-';
  const s = typeof f === 'string' ? f : f.toString();
  try { return format(new Date(s.includes('T') ? s : s + 'T00:00:00'), "d MMM yyyy", { locale: es }); }
  catch { return '-'; }
};

const ejVacio = (dia) => ({
  catalogo_id: null, nombre: '', series: 3, repeticiones: 10,
  unidad_reps: 'reps', peso_kg: '', peso_fijo: false, notas: '', dia_numero: dia, _key: Math.random()
});

export default function RutinaCliente() {
  const { gymSlug, usuarioId } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [rutinaNombre, setRutinaNombre] = useState('Mi Rutina');
  const [rutinaDesc, setRutinaDesc] = useState('');
  const [dias, setDias] = useState({ 1: [ejVacio(1)], 2: [ejVacio(2)], 3: [ejVacio(3)] });
  const [diaActivo, setDiaActivo] = useState(1);
  const [historialRutinas, setHistorialRutinas] = useState([]);
  const [historialSesiones, setHistorialSesiones] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState('rutina');
  const [buscadorIdx, setBuscadorIdx] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [nuevoEjercicio, setNuevoEjercicio] = useState('');
  const [rutinaExpandida, setRutinaExpandida] = useState(null);
  const [rutinaArchivadaData, setRutinaArchivadaData] = useState({});
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [nuevaPlantillaNombre, setNuevaPlantillaNombre] = useState('');
  const [nuevaPlantillaNivel, setNuevaPlantillaNivel] = useState('intermedio');

  useEffect(() => { cargarDatos(); }, [usuarioId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // ✅ Sin mi-historial — el historial viene dentro de getRutinaCliente
      const [rutinaRes, catalogoRes, plantillasRes] = await Promise.allSettled([
        api.get(`/gym/${gymSlug}/rutinas/cliente/${usuarioId}`),
        api.get(`/gym/${gymSlug}/rutinas/catalogo`),
        api.get(`/gym/${gymSlug}/rutinas/plantillas`),
      ]);

      if (rutinaRes.status === 'fulfilled') {
        const data = rutinaRes.value.data.rutina;
        const clienteData = data?.cliente || rutinaRes.value.data.cliente;
        if (clienteData) setCliente(clienteData);
        setHistorialRutinas(rutinaRes.value.data.historialRutinas || []);
        if (data?.dias) {
          setRutinaNombre(data.nombre || 'Mi Rutina');
          setRutinaDesc(data.descripcion || '');
          const diasCargados = {};
          [1,2,3].forEach(d => {
            diasCargados[d] = data.dias[d]?.length > 0
              ? data.dias[d].map(e => ({ ...e, peso_kg: e.peso_kg ?? '', unidad_reps: e.unidad_reps || 'reps', _key: Math.random() }))
              : [ejVacio(d)];
          });
          setDias(diasCargados);
        }
      }

      if (catalogoRes.status === 'fulfilled') {
        setCatalogo(catalogoRes.value.data.ejercicios || []);
      }

      if (plantillasRes.status === 'fulfilled') {
        setPlantillas(plantillasRes.value.data.plantillas || []);
      }

    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const agregarEjercicio = (dia) => setDias(p => ({ ...p, [dia]: [...p[dia], ejVacio(dia)] }));
  const eliminarEjercicio = (dia, idx) => setDias(p => ({ ...p, [dia]: p[dia].length > 1 ? p[dia].filter((_,i) => i !== idx) : p[dia] }));
  const actualizar = (dia, idx, campo, valor) => setDias(p => ({ ...p, [dia]: p[dia].map((e,i) => i === idx ? {...e,[campo]:valor} : e) }));

  const seleccionarEjercicio = (dia, idx, ej) => {
    setDias(p => ({ ...p, [dia]: p[dia].map((e,i) => i === idx ? {...e, catalogo_id: ej.id, nombre: ej.nombre} : e) }));
    setBuscadorIdx(null); setBusqueda('');
  };

  const crearEnCatalogo = async (dia, idx) => {
    if (!nuevoEjercicio.trim()) return;
    try {
      const { data } = await api.post(`/gym/${gymSlug}/rutinas/catalogo`, { nombre: nuevoEjercicio.trim() });
      setCatalogo(p => [...p, data.ejercicio]);
      seleccionarEjercicio(dia, idx, data.ejercicio);
      setNuevoEjercicio('');
      toast.success('Ejercicio creado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const crearNuevoEnCatalogo = async () => {
    if (!nuevoEjercicio.trim()) return;
    try {
      const { data } = await api.post(`/gym/${gymSlug}/rutinas/catalogo`, { nombre: nuevoEjercicio.trim() });
      setCatalogo(p => [...p, data.ejercicio]);
      setNuevoEjercicio('');
      toast.success('Ejercicio creado');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const toggleCatalogo = async (id) => {
    try {
      const { data } = await api.put(`/gym/${gymSlug}/rutinas/catalogo/${id}/toggle`);
      setCatalogo(p => p.map(e => e.id === id ? data.ejercicio : e));
    } catch { toast.error('Error al actualizar'); }
  };

  const cargarPlantilla = async (plantillaId) => {
    try {
      const { data } = await api.get(`/gym/${gymSlug}/rutinas/plantillas/${plantillaId}`);
      const diasCargados = {};
      [1,2,3].forEach(d => {
        diasCargados[d] = data.plantilla.dias[d]?.length > 0
          ? data.plantilla.dias[d].map(e => ({ ...e, peso_kg: e.peso_kg ?? '', unidad_reps: e.unidad_reps || 'reps', _key: Math.random() }))
          : [ejVacio(d)];
      });
      setDias(diasCargados);
      setRutinaNombre(data.plantilla.nombre);
      setMostrarPlantillas(false);
      toast.success(`Plantilla "${data.plantilla.nombre}" cargada`);
    } catch { toast.error('Error al cargar plantilla'); }
  };

  const eliminarPlantilla = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    try {
      await api.delete(`/gym/${gymSlug}/rutinas/plantillas/${id}`);
      setPlantillas(p => p.filter(x => x.id !== id));
      toast.success('Plantilla eliminada');
    } catch { toast.error('Error'); }
  };

  const guardarComoPlantilla = async () => {
    if (!nuevaPlantillaNombre.trim()) { toast.error('Ponele un nombre'); return; }
    const dp = { '1_dia':1,'2_dias':2,'3_dias':3 }[cliente?.plan] || 3;
    const diasLimpios = {};
    Object.entries(dias).filter(([d]) => parseInt(d) <= dp).forEach(([d, ejs]) => {
      diasLimpios[d] = ejs.filter(e => e.nombre.trim()).map(e => ({
        catalogo_id: e.catalogo_id, nombre: e.nombre,
        series: parseInt(e.series)||3, repeticiones: parseInt(e.repeticiones)||10,
        peso_kg: e.peso_kg ? parseFloat(e.peso_kg) : null,
        unidad_reps: e.unidad_reps||'reps', peso_fijo: e.peso_fijo, notas: e.notas,
      }));
    });
    try {
      await api.post(`/gym/${gymSlug}/rutinas/plantillas`, { nombre: nuevaPlantillaNombre, nivel: nuevaPlantillaNivel, dias: diasLimpios });
      toast.success('Plantilla guardada');
      setModalPlantilla(false); setNuevaPlantillaNombre('');
      const { data } = await api.get(`/gym/${gymSlug}/rutinas/plantillas`);
      setPlantillas(data.plantillas);
    } catch { toast.error('Error al guardar'); }
  };

  const copiarDia = (origen, destino) => {
    setDias(p => ({ ...p, [destino]: p[origen].map(e => ({ ...e, dia_numero: destino, _key: Math.random() })) }));
    toast.success(`Día ${origen} copiado al Día ${destino}`);
  };

  const verRutinaArchivada = async (id) => {
    if (rutinaExpandida === id) { setRutinaExpandida(null); return; }
    if (!rutinaArchivadaData[id]) {
      try {
        const { data } = await api.get(`/gym/${gymSlug}/rutinas/cliente/${usuarioId}/archivada/${id}`);
        setRutinaArchivadaData(p => ({ ...p, [id]: data.rutina }));
      } catch { toast.error('Error'); return; }
    }
    setRutinaExpandida(id);
  };

  const guardarRutina = async (nuevaRutina = false) => {
    const dp = { '1_dia':1,'2_dias':2,'3_dias':3 }[cliente?.plan] || 3;
    for (let d = 1; d <= dp; d++) {
      if (dias[d]?.some(e => !e.nombre.trim())) { toast.error(`Día ${d}: todos los ejercicios necesitan nombre`); return; }
    }
    if (nuevaRutina && !window.confirm('¿Crear nueva rutina? La actual quedará en el historial.')) return;
    setGuardando(true);
    try {
      const diasLimpios = {};
      Object.entries(dias).filter(([d]) => parseInt(d) <= dp).forEach(([d, ejs]) => {
        diasLimpios[d] = ejs.map(e => ({
          catalogo_id: e.catalogo_id, nombre: e.nombre,
          series: parseInt(e.series)||3, repeticiones: parseInt(e.repeticiones)||10,
          peso_kg: e.peso_kg ? parseFloat(e.peso_kg) : null,
          unidad_reps: e.unidad_reps||'reps', peso_fijo: e.peso_fijo, notas: e.notas,
        }));
      });
      await api.post(`/gym/${gymSlug}/rutinas/cliente/${usuarioId}`, {
        nombre: rutinaNombre, descripcion: rutinaDesc, dias: diasLimpios, nueva_rutina: nuevaRutina
      });
      toast.success(nuevaRutina ? 'Nueva rutina creada' : 'Rutina guardada');
      cargarDatos();
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const dp = { '1_dia':1,'2_dias':2,'3_dias':3 }[cliente?.plan] || 3;
  const catalogoFiltrado = catalogo.filter(e => e.activo !== false && e.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const navItems = [
    { path: `/gym/${gymSlug}/admin`, icon: LayoutDashboard, label: 'Dashboard' },
    { path: `/gym/${gymSlug}/admin/clientes`, icon: Users, label: 'Clientes' },
    { path: `/gym/${gymSlug}/admin/rutinas`, icon: Dumbbell, label: 'Rutinas' },
    { path: `/gym/${gymSlug}/admin/turnos`, icon: UserCheck, label: 'Turnos' },
    { path: `/gym/${gymSlug}/admin/pagos`, icon: CreditCard, label: 'Pagos' },
    { path: `/gym/${gymSlug}/admin/recuperos`, icon: RefreshCw, label: 'Recuperos' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 pb-10">

      {/* HEADER CON NAVBAR FIJA */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        {/* Fila 1: info cliente + botones */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin/clientes`)} className="text-gray-400 hover:text-white flex-shrink-0">
              <ArrowLeft size={20}/>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cargando...'}</h1>
              {cliente && <p className="text-gray-500 text-xs truncate">Plan {cliente.plan?.replace('_',' ')}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { setMostrarPlantillas(!mostrarPlantillas); setMostrarCatalogo(false); }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${mostrarPlantillas ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              <BookOpen size={12}/> Plantillas
            </button>
            <button onClick={() => { setMostrarCatalogo(!mostrarCatalogo); setMostrarPlantillas(false); }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${mostrarCatalogo ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              <Settings size={12}/> Catálogo
            </button>
          </div>
        </div>
        {/* Fila 2: navbar */}
        <div className="px-4 pb-2 flex gap-1 overflow-x-auto max-w-4xl mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                path.includes('/rutinas') ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Icon size={12}/> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-4">

        {mostrarPlantillas && (
          <div className="card mb-4 border border-orange-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex items-center gap-2"><BookOpen size={16} className="text-orange-500"/> Plantillas</h3>
              <button onClick={() => setModalPlantilla(true)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg">
                + Guardar rutina actual
              </button>
            </div>
            {plantillas.length === 0
              ? <p className="text-gray-500 text-sm text-center py-4">No tenés plantillas todavía</p>
              : <div className="space-y-2">
                  {plantillas.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-white text-sm font-medium">{p.nombre}</p>
                        <p className="text-gray-500 text-xs capitalize">{p.nivel} · {p.total_ejercicios} ejercicios</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => cargarPlantilla(p.id)} className="text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium">Cargar</button>
                        <button onClick={() => eliminarPlantilla(p.id)} className="text-gray-600 hover:text-red-400 p-1.5"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {mostrarCatalogo && (
          <div className="card mb-4 border border-gray-700">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Settings size={16} className="text-orange-500"/> Catálogo de ejercicios</h3>
            <div className="flex gap-2 mb-3">
              <input value={nuevoEjercicio} onChange={e => setNuevoEjercicio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && crearNuevoEnCatalogo()}
                className="input-field flex-1 text-sm" placeholder="Nuevo ejercicio..."/>
              <button onClick={crearNuevoEnCatalogo} className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-lg text-sm font-bold">+ Crear</button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {catalogo.length === 0
                ? <p className="text-gray-500 text-sm text-center py-4">No hay ejercicios en el catálogo</p>
                : catalogo.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-800">
                    <div>
                      <span className={`text-sm ${e.activo !== false ? 'text-white' : 'text-gray-600 line-through'}`}>{e.nombre}</span>
                      {e.grupo_muscular && <span className="text-xs text-gray-500 ml-2">· {e.grupo_muscular}</span>}
                    </div>
                    <button onClick={() => toggleCatalogo(e.id)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${e.activo !== false ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-gray-700 text-gray-500 hover:bg-green-500/10 hover:text-green-400'}`}>
                      {e.activo !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl">
          {[
            { key:'rutina', label:'Rutina Activa', icon:Dumbbell },
            { key:'historial-rutinas', label:`Historial (${historialRutinas.length})`, icon:Eye },
            { key:'sesiones', label:'Sesiones', icon:Calendar },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${tab === key ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Icon size={13}/> {label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse"/>)}</div>

        ) : tab === 'rutina' ? (
          <div>
            <div className="card mb-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Nombre de la rutina</label>
                <input value={rutinaNombre} onChange={e => setRutinaNombre(e.target.value)} className="input-field"/>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Descripción (opcional)</label>
                <textarea value={rutinaDesc} onChange={e => setRutinaDesc(e.target.value)} className="input-field resize-none" rows={2}/>
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              {[1,2,3].slice(0,dp).map(d => (
                <button key={d} onClick={() => setDiaActivo(d)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${diaActivo === d ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  Día {d}
                </button>
              ))}
            </div>

            {dp > 1 && (
              <div className="flex gap-3 mb-4">
                {[1,2,3].slice(0,dp).filter(d => d !== diaActivo).map(d => (
                  <button key={d} onClick={() => copiarDia(diaActivo, d)}
                    className="text-xs text-gray-500 hover:text-orange-400 transition-colors underline">
                    Copiar Día {diaActivo} → Día {d}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {dias[diaActivo]?.map((ej, idx) => (
                <div key={ej._key} className="card border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-orange-500 font-bold text-sm">Ejercicio {idx+1}</span>
                    <button onClick={() => eliminarEjercicio(diaActivo, idx)} disabled={dias[diaActivo].length === 1}
                      className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30">
                      <Trash2 size={16}/>
                    </button>
                  </div>

                  <div className="mb-3 relative">
                    <label className="block text-xs text-gray-400 mb-1">Ejercicio *</label>
                    <button onClick={() => { setBuscadorIdx(buscadorIdx === `${diaActivo}-${idx}` ? null : `${diaActivo}-${idx}`); setBusqueda(''); }}
                      className="input-field w-full text-left flex items-center justify-between">
                      <span className={ej.nombre ? 'text-white' : 'text-gray-500'}>{ej.nombre || 'Seleccionar ejercicio...'}</span>
                      <ChevronDown size={16} className="text-gray-500 flex-shrink-0"/>
                    </button>
                    {buscadorIdx === `${diaActivo}-${idx}` && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-gray-800 border border-gray-600 rounded-xl mt-1 shadow-2xl">
                        <div className="p-2">
                          <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            className="input-field text-sm py-2 w-full" placeholder="Buscar ejercicio..."/>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {catalogoFiltrado.map(e => (
                            <button key={e.id} onClick={() => seleccionarEjercicio(diaActivo, idx, e)}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors">
                              <p className="text-white text-sm">{e.nombre}</p>
                              {e.grupo_muscular && <p className="text-gray-500 text-xs">{e.grupo_muscular}</p>}
                            </button>
                          ))}
                          {catalogoFiltrado.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">No encontrado</p>
                          )}
                        </div>
                        <div className="p-2 border-t border-gray-700">
                          <div className="flex gap-2">
                            <input value={nuevoEjercicio} onChange={e => setNuevoEjercicio(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && crearEnCatalogo(diaActivo, idx)}
                              className="input-field text-sm py-1.5 flex-1" placeholder="Nuevo ejercicio..."/>
                            <button onClick={() => crearEnCatalogo(diaActivo, idx)}
                              className="bg-orange-500 text-white text-xs px-3 rounded-lg font-bold">+ Crear</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Series</label>
                      <input type="number" value={ej.series} onChange={e => actualizar(diaActivo,idx,'series',e.target.value)} className="input-field" min="1" max="20"/>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{ej.unidad_reps === 'seg' ? 'Segundos' : 'Reps'}</label>
                      <input type="number" value={ej.repeticiones} onChange={e => actualizar(diaActivo,idx,'repeticiones',e.target.value)} className="input-field" min="1"/>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unidad</label>
                      <button onClick={() => actualizar(diaActivo,idx,'unidad_reps', ej.unidad_reps==='reps'?'seg':'reps')}
                        className={`w-full h-[42px] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${ej.unidad_reps==='seg' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                        {ej.unidad_reps==='seg' ? <><Timer size={12}/> seg</> : '× reps'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Kg extra</label>
                      <input type="number" value={ej.peso_kg} onChange={e => actualizar(diaActivo,idx,'peso_kg',e.target.value)} className="input-field" min="0" step="0.5" placeholder="—"/>
                    </div>
                  </div>

                  {ej.peso_kg && (
                    <button onClick={() => actualizar(diaActivo,idx,'peso_fijo',!ej.peso_fijo)}
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors w-full mb-3 ${ej.peso_fijo ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {ej.peso_fijo ? <Lock size={14}/> : <Unlock size={14}/>}
                      {ej.peso_fijo ? 'Kg fijo — cliente no puede modificarlo' : 'Kg sugerido — cliente puede modificarlo'}
                    </button>
                  )}

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Notas</label>
                    <input value={ej.notas} onChange={e => actualizar(diaActivo,idx,'notas',e.target.value)} className="input-field" placeholder="Ej: Espalda recta"/>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => agregarEjercicio(diaActivo)} className="btn-secondary w-full flex items-center justify-center gap-2 mb-4">
              <Plus size={16}/> Agregar ejercicio al Día {diaActivo}
            </button>

            <div className="flex gap-3">
              <button onClick={() => guardarRutina(false)} disabled={guardando}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                <Save size={16}/> {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button onClick={() => guardarRutina(true)} disabled={guardando}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition-colors text-sm font-medium">
                <PlusCircle size={16}/> Nueva rutina
              </button>
            </div>
          </div>

        ) : tab === 'historial-rutinas' ? (
          <div>
            {historialRutinas.length === 0
              ? <div className="card text-center py-12"><Eye className="text-gray-700 mx-auto mb-3" size={48}/><p className="text-gray-500">No hay rutinas anteriores</p></div>
              : <div className="space-y-3">
                  {historialRutinas.map(r => (
                    <div key={r.id} className="card">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => verRutinaArchivada(r.id)}>
                        <div>
                          <p className="font-semibold text-white">{r.nombre}</p>
                          <p className="text-gray-500 text-xs">{formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</p>
                        </div>
                        {rutinaExpandida === r.id ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
                      </div>
                      {rutinaExpandida === r.id && rutinaArchivadaData[r.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-800">
                          {Object.entries(rutinaArchivadaData[r.id].dias || {}).map(([dia, ejs]) => (
                            <div key={dia} className="mb-3">
                              <p className="text-orange-500 text-xs font-bold mb-2">Día {dia}</p>
                              {ejs.map((e,i) => (
                                <div key={i} className="flex items-center justify-between py-1 text-sm">
                                  <span className="text-gray-300">{e.nombre}</span>
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
            }
          </div>

        ) : (
          <div>
            {historialSesiones.length === 0
              ? <div className="card text-center py-12"><Calendar className="text-gray-700 mx-auto mb-3" size={48}/><p className="text-gray-500">El cliente no registró sesiones todavía</p></div>
              : <div className="space-y-3">
                  {historialSesiones.map(s => {
                    const pct = s.total_ejercicios > 0 ? Math.round((parseInt(s.completados)/parseInt(s.total_ejercicios))*100) : 0;
                    return (
                      <div key={s.id} className="card flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${s.completada ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                            <Award className={s.completada ? 'text-green-500' : 'text-yellow-500'} size={18}/>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{formatFecha(s.fecha)}</p>
                            <p className="text-gray-500 text-xs">Día {s.dia_rutina} · {s.completados}/{s.total_ejercicios} ejercicios</p>
                          </div>
                        </div>
                        <div className="w-20 bg-gray-800 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}
      </div>

      {modalPlantilla && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Guardar como plantilla</h3>
              <button onClick={() => setModalPlantilla(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Nombre *</label>
                <input value={nuevaPlantillaNombre} onChange={e => setNuevaPlantillaNombre(e.target.value)} className="input-field" placeholder="Ej: Fullbody Principiante"/>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Nivel</label>
                <select value={nuevaPlantillaNivel} onChange={e => setNuevaPlantillaNivel(e.target.value)} className="input-field">
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalPlantilla(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={guardarComoPlantilla} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

