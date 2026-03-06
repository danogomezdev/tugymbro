import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, Trash2, Save, ArrowLeft, Lock, Unlock, ChevronDown, Eye, PlusCircle, BookOpen, X, Timer, Settings, ChevronUp, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const DIAS_LABEL = { 1:'Día 1', 2:'Día 2', 3:'Día 3' };

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

// Modal para editar un ejercicio
function ModalEjercicio({ ej, onSave, onClose, catalogo }) {
  const [form, setForm] = useState({ ...ej });
  const [busqueda, setBusqueda] = useState('');
  const [showCatalogo, setShowCatalogo] = useState(false);

  const catalogoFiltrado = catalogo.filter(e => e.activo !== false && e.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const set = (campo, val) => setForm(p => ({ ...p, [campo]: val }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h3 className="font-bold text-white text-sm">{form.nombre || 'Nuevo ejercicio'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Selector ejercicio */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Ejercicio *</label>
            <button onClick={() => setShowCatalogo(!showCatalogo)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-left flex items-center justify-between hover:border-gray-600 transition-colors">
              <span className={form.nombre ? 'text-white text-sm' : 'text-gray-500 text-sm'}>{form.nombre || 'Seleccionar ejercicio...'}</span>
              <ChevronDown size={15} className="text-gray-500" />
            </button>
            {showCatalogo && (
              <div className="mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-2">
                  <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                    placeholder="Buscar..." />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {catalogoFiltrado.map(e => (
                    <button key={e.id} onClick={() => { set('catalogo_id', e.id); set('nombre', e.nombre); setShowCatalogo(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors">
                      <p className="text-white text-sm">{e.nombre}</p>
                      {e.grupo_muscular && <p className="text-gray-500 text-xs">{e.grupo_muscular}</p>}
                    </button>
                  ))}
                  {catalogoFiltrado.length === 0 && <p className="text-gray-500 text-xs text-center py-3">Sin resultados</p>}
                </div>
              </div>
            )}
          </div>

          {/* Series y reps */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Series</label>
              <input type="number" value={form.series} onChange={e => set('series', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
                min="1" max="20" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">{form.unidad_reps === 'seg' ? 'Segundos' : 'Repeticiones'}</label>
              <input type="number" value={form.repeticiones} onChange={e => set('repeticiones', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
                min="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Unidad</label>
              <button onClick={() => set('unidad_reps', form.unidad_reps === 'reps' ? 'seg' : 'reps')}
                className={`w-full h-[38px] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border ${form.unidad_reps === 'seg' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                {form.unidad_reps === 'seg' ? <><Timer size={11} /> seg</> : '× reps'}
              </button>
            </div>
          </div>

          {/* Peso */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Peso (kg) — opcional</label>
            <input type="number" value={form.peso_kg} onChange={e => set('peso_kg', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
              min="0" step="0.5" placeholder="Sin peso" />
          </div>

          {form.peso_kg && (
            <button onClick={() => set('peso_fijo', !form.peso_fijo)}
              className={`w-full flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl transition-colors border ${form.peso_fijo ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              {form.peso_fijo ? <Lock size={13} /> : <Unlock size={13} />}
              {form.peso_fijo ? 'Kg fijo — cliente no puede modificarlo' : 'Kg sugerido — cliente puede modificarlo'}
            </button>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Notas</label>
            <input value={form.notas} onChange={e => set('notas', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
              placeholder="Ej: Espalda recta, codos pegados..." />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-medium hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={() => { if (!form.nombre.trim()) { toast.error('Falta el ejercicio'); return; } onSave(form); }}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para copiar día
function ModalCopiarDia({ diaOrigen, dp, onCopiar, onClose }) {
  const destinos = [1, 2, 3].slice(0, dp).filter(d => d !== diaOrigen);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm">Copiar {DIAS_LABEL[diaOrigen]} a...</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-2">
          {destinos.map(d => (
            <button key={d} onClick={() => onCopiar(d)}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-orange-500 text-white text-sm font-medium transition-colors">
              {DIAS_LABEL[d]}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function RutinaCliente() {
  const { gymSlug, usuarioId } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [rutinaNombre, setRutinaNombre] = useState('Mi Rutina');
  const [rutinaDesc, setRutinaDesc] = useState('');
  const [dias, setDias] = useState({ 1: [ejVacio(1)], 2: [ejVacio(2)], 3: [ejVacio(3)] });
  const [diaActivo, setDiaActivo] = useState(1);
  const [historialRutinas, setHistorialRutinas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState('rutina');
  const [modalEj, setModalEj] = useState(null);
  const [nuevoEjercicio, setNuevoEjercicio] = useState('');
  const [rutinaExpandida, setRutinaExpandida] = useState(null);
  const [rutinaArchivadaData, setRutinaArchivadaData] = useState({});
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [nuevaPlantillaNombre, setNuevaPlantillaNombre] = useState('');
  const [nuevaPlantillaNivel, setNuevaPlantillaNivel] = useState('intermedio');
  const [modalCopiar, setModalCopiar] = useState(false); // ← nuevo

  useEffect(() => { cargarDatos(); }, [usuarioId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
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
          [1, 2, 3].forEach(d => {
            diasCargados[d] = data.dias[d]?.length > 0
              ? data.dias[d].map(e => ({ ...e, peso_kg: e.peso_kg ?? '', unidad_reps: e.unidad_reps || 'reps', _key: Math.random() }))
              : [ejVacio(d)];
          });
          setDias(diasCargados);
        }
      }
      if (catalogoRes.status === 'fulfilled') setCatalogo(catalogoRes.value.data.ejercicios || []);
      if (plantillasRes.status === 'fulfilled') setPlantillas(plantillasRes.value.data.plantillas || []);
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const agregarEjercicio = (dia) => {
    const nuevo = ejVacio(dia);
    setDias(p => ({ ...p, [dia]: [...p[dia], nuevo] }));
    setTimeout(() => setModalEj({ dia, idx: (dias[dia]?.length || 0), ej: nuevo }), 50);
  };

  const eliminarEjercicio = (dia, idx) => {
    if (dias[dia].length === 1) return;
    if (!window.confirm('¿Eliminar este ejercicio?')) return;
    setDias(p => ({ ...p, [dia]: p[dia].filter((_, i) => i !== idx) }));
  };

  const guardarEjercicio = (form) => {
    const { dia, idx } = modalEj;
    setDias(p => ({ ...p, [dia]: p[dia].map((e, i) => i === idx ? { ...e, ...form } : e) }));
    setModalEj(null);
  };

  // ← Copiar ejercicios de diaActivo al dia destino
  const copiarDia = (diaDestino) => {
    const ejerciciosOrigen = dias[diaActivo].map(e => ({ ...e, dia_numero: diaDestino, _key: Math.random() }));
    setDias(p => ({ ...p, [diaDestino]: ejerciciosOrigen }));
    setModalCopiar(false);
    toast.success(`${DIAS_LABEL[diaActivo]} copiado a ${DIAS_LABEL[diaDestino]}`);
  };

  const crearEnCatalogo = async () => {
    if (!nuevoEjercicio.trim()) return;
    try {
      const { data } = await api.post(`/gym/${gymSlug}/rutinas/catalogo`, { nombre: nuevoEjercicio.trim() });
      setCatalogo(p => [...p, data.ejercicio]);
      setNuevoEjercicio('');
      toast.success('Ejercicio creado en catálogo');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const toggleCatalogo = async (id) => {
    try {
      const { data } = await api.put(`/gym/${gymSlug}/rutinas/catalogo/${id}/toggle`);
      setCatalogo(p => p.map(e => e.id === id ? data.ejercicio : e));
    } catch { toast.error('Error'); }
  };

  const cargarPlantilla = async (plantillaId) => {
    try {
      const { data } = await api.get(`/gym/${gymSlug}/rutinas/plantillas/${plantillaId}`);
      const diasCargados = {};
      [1, 2, 3].forEach(d => {
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
    const dp = { '1_dia': 1, '2_dias': 2, '3_dias': 3 }[cliente?.plan] || 3;
    const diasLimpios = {};
    Object.entries(dias).filter(([d]) => parseInt(d) <= dp).forEach(([d, ejs]) => {
      diasLimpios[d] = ejs.filter(e => e.nombre.trim()).map(e => ({
        catalogo_id: e.catalogo_id, nombre: e.nombre,
        series: parseInt(e.series) || 3, repeticiones: parseInt(e.repeticiones) || 10,
        peso_kg: e.peso_kg ? parseFloat(e.peso_kg) : null,
        unidad_reps: e.unidad_reps || 'reps', peso_fijo: e.peso_fijo, notas: e.notas,
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
    const dp = { '1_dia': 1, '2_dias': 2, '3_dias': 3 }[cliente?.plan] || 3;
    for (let d = 1; d <= dp; d++) {
      if (dias[d]?.some(e => !e.nombre.trim())) { toast.error(`${DIAS_LABEL[d]}: todos los ejercicios necesitan nombre`); return; }
    }
    if (nuevaRutina && !window.confirm('¿Crear nueva rutina? La actual quedará en el historial.')) return;
    setGuardando(true);
    try {
      const diasLimpios = {};
      Object.entries(dias).filter(([d]) => parseInt(d) <= dp).forEach(([d, ejs]) => {
        diasLimpios[d] = ejs.map(e => ({
          catalogo_id: e.catalogo_id, nombre: e.nombre,
          series: parseInt(e.series) || 3, repeticiones: parseInt(e.repeticiones) || 10,
          peso_kg: e.peso_kg ? parseFloat(e.peso_kg) : null,
          unidad_reps: e.unidad_reps || 'reps', peso_fijo: e.peso_fijo, notas: e.notas,
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

  const dp = { '1_dia': 1, '2_dias': 2, '3_dias': 3 }[cliente?.plan] || 3;

  return (
    <div className="min-h-screen bg-gray-950 pb-10">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="px-4 py-3 max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin/rutinas`)} className="text-gray-400 hover:text-white">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cargando...'}</p>
              {cliente && <p className="text-gray-500 text-xs">Plan {cliente.plan?.replace('_', ' ')}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => { setMostrarPlantillas(!mostrarPlantillas); setMostrarCatalogo(false); }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${mostrarPlantillas ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              <BookOpen size={11} /> Plantillas
            </button>
            <button onClick={() => { setMostrarCatalogo(!mostrarCatalogo); setMostrarPlantillas(false); }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${mostrarCatalogo ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              <Settings size={11} /> Catálogo
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">

        {/* Panel plantillas */}
        {mostrarPlantillas && (
          <div className="bg-gray-900 border border-orange-500/20 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2"><BookOpen size={14} className="text-orange-500" /> Plantillas</h3>
              <button onClick={() => setModalPlantilla(true)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                + Guardar actual
              </button>
            </div>
            {plantillas.length === 0
              ? <p className="text-gray-500 text-xs text-center py-3">No tenés plantillas todavía</p>
              : <div className="space-y-2">
                {plantillas.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-white text-sm font-medium">{p.nombre}</p>
                      <p className="text-gray-500 text-xs capitalize">{p.nivel} · {p.total_ejercicios} ejercicios</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => cargarPlantilla(p.id)} className="text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium">Cargar</button>
                      <button onClick={() => eliminarPlantilla(p.id)} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* Panel catálogo */}
        {mostrarCatalogo && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2"><Settings size={14} className="text-orange-500" /> Catálogo de ejercicios</h3>
            <div className="flex gap-2 mb-3">
              <input value={nuevoEjercicio} onChange={e => setNuevoEjercicio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && crearEnCatalogo()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                placeholder="Nuevo ejercicio..." />
              <button onClick={crearEnCatalogo} className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-xl text-sm font-bold transition-colors">+ Crear</button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {catalogo.map(e => (
                <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-800">
                  <span className={`text-sm ${e.activo !== false ? 'text-white' : 'text-gray-600 line-through'}`}>{e.nombre}</span>
                  <button onClick={() => toggleCatalogo(e.id)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${e.activo !== false ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                    {e.activo !== false ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-900 p-1 rounded-xl">
          {[
            { key: 'rutina', label: 'Rutina activa', icon: Dumbbell },
            { key: 'historial', label: `Historial (${historialRutinas.length})`, icon: Eye },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${tab === key ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}</div>

        ) : tab === 'rutina' ? (
          <div>
            {/* Nombre rutina */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input value={rutinaNombre} onChange={e => setRutinaNombre(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descripción (opcional)</label>
                <input value={rutinaDesc} onChange={e => setRutinaDesc(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-orange-500"
                  placeholder="Ej: Fuerza + hipertrofia 3 días" />
              </div>
            </div>

            {/* Selector días */}
            <div className="flex gap-1.5 mb-1">
              {[1, 2, 3].slice(0, dp).map(d => (
                <button key={d} onClick={() => setDiaActivo(d)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${diaActivo === d ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
                  {DIAS_LABEL[d]}
                </button>
              ))}
            </div>

            {/* Botón copiar día — solo si hay más de 1 día */}
            {dp > 1 && (
              <div className="flex justify-end mb-3 mt-1.5">
                <button onClick={() => setModalCopiar(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 transition-colors">
                  <Copy size={12} /> Copiar {DIAS_LABEL[diaActivo]} a otro día
                </button>
              </div>
            )}

            {/* Lista ejercicios */}
            <div className="space-y-2 mb-3">
              {dias[diaActivo]?.map((ej, idx) => (
                <div key={ej._key} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-500 text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${ej.nombre ? 'text-white' : 'text-gray-600 italic'}`}>
                      {ej.nombre || 'Sin nombre'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {ej.series}×{ej.repeticiones} {ej.unidad_reps === 'seg' ? 'seg' : 'reps'}
                      {ej.peso_kg ? ` · ${ej.peso_kg}kg` : ''}
                      {ej.notas ? ` · ${ej.notas}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setModalEj({ dia: diaActivo, idx, ej })}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors">
                      Editar
                    </button>
                    <button onClick={() => eliminarEjercicio(diaActivo, idx)}
                      disabled={dias[diaActivo].length === 1}
                      className="text-gray-700 hover:text-red-400 p-1.5 transition-colors disabled:opacity-30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => agregarEjercicio(diaActivo)}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-orange-500 text-gray-500 hover:text-orange-400 text-sm flex items-center justify-center gap-2 transition-colors mb-5">
              <Plus size={15} /> Agregar ejercicio
            </button>

            <div className="flex gap-3">
              <button onClick={() => guardarRutina(false)} disabled={guardando}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar rutina'}
              </button>
              <button onClick={() => guardarRutina(true)} disabled={guardando}
                className="py-3 px-4 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm font-medium flex items-center gap-2 transition-colors">
                <PlusCircle size={15} /> Nueva
              </button>
            </div>
          </div>

        ) : (
          <div>
            {historialRutinas.length === 0
              ? <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-12">
                <Eye className="text-gray-700 mx-auto mb-3" size={36} />
                <p className="text-gray-500 text-sm">No hay rutinas anteriores</p>
              </div>
              : <div className="space-y-2">
                {historialRutinas.map(r => (
                  <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => verRutinaArchivada(r.id)}>
                      <div>
                        <p className="font-semibold text-white text-sm">{r.nombre}</p>
                        <p className="text-gray-500 text-xs">{formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</p>
                      </div>
                      {rutinaExpandida === r.id ? <ChevronUp size={15} className="text-gray-600" /> : <ChevronDown size={15} className="text-gray-600" />}
                    </div>
                    {rutinaExpandida === r.id && rutinaArchivadaData[r.id] && (
                      <div className="border-t border-gray-800 px-3 py-3 space-y-3">
                        {Object.entries(rutinaArchivadaData[r.id].dias || {}).map(([dia, ejs]) => (
                          <div key={dia}>
                            <p className="text-orange-500 text-xs font-bold mb-1.5">{DIAS_LABEL[dia] || `Día ${dia}`}</p>
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
            }
          </div>
        )}
      </div>

      {/* Modal editar ejercicio */}
      {modalEj && (
        <ModalEjercicio
          ej={modalEj.ej}
          catalogo={catalogo}
          onSave={guardarEjercicio}
          onClose={() => setModalEj(null)}
        />
      )}

      {/* Modal copiar día */}
      {modalCopiar && (
        <ModalCopiarDia
          diaOrigen={diaActivo}
          dp={dp}
          onCopiar={copiarDia}
          onClose={() => setModalCopiar(false)}
        />
      )}

      {/* Modal guardar plantilla */}
      {modalPlantilla && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm">Guardar como plantilla</h3>
              <button onClick={() => setModalPlantilla(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={nuevaPlantillaNombre} onChange={e => setNuevaPlantillaNombre(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500"
                placeholder="Nombre de la plantilla..." />
              <select value={nuevaPlantillaNivel} onChange={e => setNuevaPlantillaNivel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500">
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModalPlantilla(false)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={guardarComoPlantilla} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
