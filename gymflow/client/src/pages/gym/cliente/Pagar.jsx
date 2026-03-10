import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Dumbbell, Upload, CheckCircle, AlertTriangle, X, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';
import toast from 'react-hot-toast';

function esColorClaro(hex) {
  if (!hex) return false;
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0,2), 16) / 255;
  const g = parseInt(h.substring(2,4), 16) / 255;
  const b = parseInt(h.substring(4,6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.7;
}


const PLANES_INFO = {
  '1_dia':  { label:'1 día por semana',   features:['1 clase semanal','Reservas online','Acceso al app'] },
  '2_dias': { label:'2 días por semana',  features:['2 clases semanales','Reservas online','Historial de asistencia'] },
  '3_dias': { label:'3 días por semana',  features:['3 clases semanales','Reservas online','Historial + rutinas','Prioridad en turnos'] },
  '4_dias': { label:'4 días por semana',  features:['4 clases semanales','Reservas online','Historial + rutinas'] },
  '5_dias': { label:'5 días por semana',  features:['5 clases semanales','Reservas online','Historial + rutinas'] },
  'libre':  { label:'Acceso libre',       features:['Clases ilimitadas','Sin límite de horarios','Todo el app incluido'] },
};

export default function Pagar() {
  const { gymSlug } = useParams();
  const { gimnasio } = useAuth();
  const [config, setConfig] = useState({});
  const [planesActivos, setPlanesActivos] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get(`/gym/${gymSlug}/cliente/pagos/configuracion`)
      .then(({ data }) => {
        const c = data.config;
        setConfig(c);
        // Construir lista de planes disponibles
        const activos = Array.isArray(c.planes_activos) ? c.planes_activos : ['2_dias','3_dias'];
        let planes = [...activos];
        // Si plan_libre está activo, agregar 'libre' al final si no está ya
        if (c.plan_libre && !planes.includes('libre')) {
          planes = [...planes, 'libre'];
        }
        setPlanesActivos(planes);
      })
      .catch(() => {
        // Fallback
        setPlanesActivos(['2_dias','3_dias']);
      })
      .finally(() => setCargando(false));
  }, [gymSlug]);

  const getPrecio = (key) => {
    const precios = {
      '1_dia': config.precio_1dia || config.precio_1_dia,
      '2_dias': config.precio_2dias || config.precio_2_dias,
      '3_dias': config.precio_3dias || config.precio_3_dias,
      '4_dias': config.precio_3dias || config.precio_3_dias,
      '5_dias': config.precio_3dias || config.precio_3_dias,
      'libre': config.precio_libre || config.precio_3dias || config.precio_3_dias,
    };
    const p = precios[key];
    return p ? `$${parseInt(p).toLocaleString('es-AR')}` : 'Consultá';
  };

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('El archivo no puede superar 5MB'); return; }
    setArchivo(file);
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
  };

  const handleEnviar = async () => {
    if (!planSeleccionado) { toast.error('Elegí un plan primero'); return; }
    if (!archivo) { toast.error('Subí el comprobante'); return; }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('plan', planSeleccionado);
      formData.append('comprobante', archivo);
      await api.post(`/gym/${gymSlug}/cliente/pagos/solicitar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEnviado(true);
      toast.success('✅ Comprobante enviado!');
    } catch (err) { toast.error(err.response?.data?.error || 'Error al enviar'); }
    finally { setEnviando(false); }
  };

  const colorRaw = gimnasio?.color_primario || '#3b82f6';
  const color = esColorClaro(colorRaw) ? '#3b82f6' : colorRaw;

  if (enviado) return (
    <div className="min-h-screen bg-black pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl text-center py-12 px-8 w-full max-w-md">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: color + '20' }}>
            <CheckCircle className="text-green-500" size={36} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">¡Comprobante enviado!</h2>
          <p className="text-neutral-400 text-sm mb-1">El gimnasio revisará tu comprobante y te notificará cuando tu plan esté activo.</p>
          <p className="text-neutral-500 text-xs">Normalmente esto tarda menos de 24 horas.</p>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-1">Contratar plan</h1>
        <p className="text-neutral-500 text-sm mb-6">Elegí tu plan y enviá el comprobante de transferencia</p>

        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-neutral-900 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* Planes */}
            <div className="space-y-3 mb-6">
              {planesActivos.map((key, idx) => {
                const info = PLANES_INFO[key] || { label: key, features: [] };
                const precio = getPrecio(key);
                const esDestacado = idx === Math.floor(planesActivos.length / 2);
                const seleccionado = planSeleccionado === key;
                return (
                  <button key={key} onClick={() => setPlanSeleccionado(key)}
                    className={`w-full text-left rounded-2xl p-4 transition-all border-2 relative ${
                      seleccionado ? 'bg-blue-950/30' : 'bg-neutral-950 hover:bg-neutral-900/70'
                    }`}
                    style={{ borderColor: seleccionado ? color : (esDestacado ? '#4b5563' : '#1f2937') }}>
                    {esDestacado && !seleccionado && (
                      <span className="absolute -top-2.5 left-4 text-white text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: color }}>MÁS POPULAR</span>
                    )}
                    {seleccionado && <CheckCircle className="absolute top-4 right-4" size={18} style={{ color }} />}
                    <div className="flex items-center justify-between pr-6">
                      <div className="flex items-center gap-2">
                        <Dumbbell style={{ color }} size={17} />
                        <span className="font-bold text-white text-sm">{info.label}</span>
                      </div>
                      <span className="text-lg font-black" style={{ color }}>
                        {precio}<span className="text-xs text-neutral-400 font-normal">/mes</span>
                      </span>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {info.features.map(f => (
                        <li key={f} className="text-xs text-neutral-400 flex items-center gap-1">
                          <CheckCircle size={10} className="text-green-500" />{f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Datos transferencia */}
            {(config.alias_transferencia || config.nombre_titular) && (
              <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 mb-6" style={{ borderColor: color + '30' }}>
                <h2 className="font-bold text-white mb-3 text-sm">💳 Datos para transferir</h2>
                <div className="grid grid-cols-3 gap-3">
                  {config.alias_transferencia && <div><p className="text-neutral-500 text-xs mb-0.5">Alias</p><p className="text-white font-bold text-sm">{config.alias_transferencia}</p></div>}
                  {config.nombre_titular && <div><p className="text-neutral-500 text-xs mb-0.5">Titular</p><p className="text-white text-sm">{config.nombre_titular}</p></div>}
                  {config.banco && <div><p className="text-neutral-500 text-xs mb-0.5">Banco</p><p className="text-white text-sm">{config.banco}</p></div>}
                </div>
              </div>
            )}

            {/* Upload */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 mb-6">
              <h2 className="font-bold text-white mb-3 text-sm">📎 Subir comprobante</h2>
              {!archivo ? (
                <label className="border-2 border-dashed border-neutral-800 hover:border-blue-600 rounded-xl p-6 flex flex-col items-center cursor-pointer transition-colors">
                  <Upload className="text-neutral-600 mb-2" size={28} />
                  <p className="text-neutral-400 text-sm">Tocá para subir el comprobante</p>
                  <p className="text-neutral-600 text-xs mt-0.5">JPG, PNG o PDF · Máx 5MB</p>
                  <input type="file" accept="image/*,.pdf" onChange={handleArchivo} className="hidden" />
                </label>
              ) : (
                <div className="border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {preview === 'pdf' ? <FileText className="text-blue-400" size={32} /> : <img src={preview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />}
                    <div>
                      <p className="text-white text-sm font-medium">{archivo.name}</p>
                      <p className="text-neutral-500 text-xs">{(archivo.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => { setArchivo(null); setPreview(null); }} className="text-neutral-500 hover:text-red-400"><X size={18} /></button>
                </div>
              )}
            </div>

            {!planSeleccionado && (
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 mb-4">
                <AlertTriangle size={15} className="text-yellow-500 flex-shrink-0" />
                <p className="text-neutral-400 text-sm">Seleccioná un plan para continuar</p>
              </div>
            )}

            <button onClick={handleEnviar} disabled={!planSeleccionado || !archivo || enviando}
              className="w-full py-4 rounded-xl text-base font-bold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: !planSeleccionado || !archivo ? '#374151' : color }}>
              {enviando ? 'Enviando...' : 'Enviar comprobante'}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
