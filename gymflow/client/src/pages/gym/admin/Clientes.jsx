import { useState, useEffect, useRef } from 'react';
import { Search, Lock, Unlock, Edit2, Dumbbell, ArrowLeft, LogOut, UserPlus, Upload, X, FileSpreadsheet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const planLabels = {
  '1_dia': '1 día', '2_dias': '2 días', '3_dias': '3 días',
  '4_dias': '4 días', '5_dias': '5 días', 'libre': 'Libre'
};
const PLANES = ['1_dia','2_dias','3_dias','4_dias','5_dias','libre'];

export default function GymClientes() {
  const { gymSlug } = useParams();
  const { gimnasio, logout } = useAuth();
  const navigate = useNavigate();
  const color = gimnasio?.color_primario || '#f97316';
  const fileInputRef = useRef();

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalBloqueo, setModalBloqueo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [modalPlan, setModalPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: '', fecha_vencimiento_pago: '' });
  const [modalNuevo, setModalNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', plan: '', fecha_vencimiento_pago: '' });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [archivoImport, setArchivoImport] = useState(null);
  const [previstaImport, setPrevistaImport] = useState([]);
  const [importando, setImportando] = useState(false);

  useEffect(() => { cargarClientes(); }, [buscar, filtroEstado]);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (buscar) params.append('buscar', buscar);
      if (filtroEstado) params.append('estado', filtroEstado);
      const { data } = await api.get(`/gym/${gymSlug}/admin/clientes?${params}`);
      setClientes(data.clientes);
    } catch { toast.error('Error al cargar clientes'); }
    finally { setCargando(false); }
  };

  const confirmarBloqueo = async () => {
    try {
      await api.put(`/gym/${gymSlug}/admin/clientes/${modalBloqueo.id}/bloqueo`, { bloqueado: !modalBloqueo.bloqueado, motivo });
      toast.success(`Cliente ${modalBloqueo.bloqueado ? 'desbloqueado' : 'bloqueado'}`);
      setModalBloqueo(null); setMotivo(''); cargarClientes();
    } catch { toast.error('Error al actualizar cliente'); }
  };

  const guardarPlan = async () => {
    try {
      await api.put(`/gym/${gymSlug}/admin/clientes/${modalPlan.id}/plan`, planForm);
      toast.success('Plan actualizado');
      setModalPlan(null); cargarClientes();
    } catch { toast.error('Error al actualizar plan'); }
  };

  const crearCliente = async () => {
    if (!formNuevo.nombre || !formNuevo.email) {
      toast.error('Nombre y email son obligatorios'); return;
    }
    const passwordFinal = formNuevo.password || 'Cambiar123!';
    const debeCambiar = !formNuevo.password;
    setGuardandoNuevo(true);
    try {
      await api.post(`/gym/${gymSlug}/admin/clientes`, {
        ...formNuevo,
        password: passwordFinal,
        debe_cambiar_password: debeCambiar,
      });
      toast.success('Cliente creado ✅');
      setModalNuevo(false);
      setFormNuevo({ nombre: '', apellido: '', email: '', password: '', telefono: '', plan: '', fecha_vencimiento_pago: '' });
      cargarClientes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cliente');
    } finally { setGuardandoNuevo(false); }
  };

  const leerArchivo = (file) => {
    setArchivoImport(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lineas = text.split('\n').filter(l => l.trim());
      const sep = lineas[0].includes(';') ? ';' : ',';
      const headers = lineas[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const filas = lineas.slice(1).map(linea => {
        const vals = linea.split(sep).map(v => v.trim().replace(/['"]/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(f => f.nombre || f.email);
      setPrevistaImport(filas);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const ejecutarImport = async () => {
    if (previstaImport.length === 0) { toast.error('No hay datos para importar'); return; }
    setImportando(true);
    let ok = 0, errores = 0;
    for (const fila of previstaImport) {
      try {
        await api.post(`/gym/${gymSlug}/admin/clientes`, {
          nombre: fila.nombre || '',
          apellido: fila.apellido || '',
          email: fila.email || '',
          password: fila.password || 'Cambiar123!',
          telefono: fila.telefono || '',
          plan: fila.plan || '2_dias',
          fecha_vencimiento_pago: fila.vencimiento || fila.fecha_vencimiento || '',
          debe_cambiar_password: !fila.password,
        });
        ok++;
      } catch { errores++; }
    }
    toast.success(`${ok} clientes importados${errores > 0 ? `, ${errores} con error` : ''} ✅`);
    setModalImportar(false); setArchivoImport(null); setPrevistaImport([]);
    cargarClientes(); setImportando(false);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-white">Clientes</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModalImportar(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-all">
              <Upload size={15}/> Importar Excel
            </button>
            <button onClick={() => setModalNuevo(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: color }}>
              <UserPlus size={15}/> Nuevo cliente
            </button>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 p-2 ml-1"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input value={buscar} onChange={e => setBuscar(e.target.value)}
              className="input-field pl-9" placeholder="Buscar por nombre, apellido o email..." />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input-field w-auto">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="bloqueado">Bloqueados</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-800">
                <tr>
                  {['Cliente','Email','Plan','Reservas mes','Vence pago','Estado','Acciones'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cargando ? (
                  Array.from({length:5}).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="p-4"><div className="h-6 bg-gray-800 rounded animate-pulse" /></td></tr>
                  ))
                ) : clientes.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-600">No hay clientes</td></tr>
                ) : clientes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white text-sm">{c.nombre} {c.apellido}</p>
                      <p className="text-xs text-gray-500">{c.telefono || 'Sin tel.'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                        {planLabels[c.plan] || c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-white">{c.reservas_mes}</td>
                    <td className="px-4 py-3 text-sm">
                      {c.fecha_vencimiento_pago ? (
                        <span className={new Date(c.fecha_vencimiento_pago) < new Date() ? 'text-red-400' : 'text-green-400'}>
                          {format(new Date(c.fecha_vencimiento_pago), 'dd/MM/yyyy')}
                        </span>
                      ) : <span className="text-gray-600">Sin datos</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.bloqueado ? <span className="badge-bloqueado">Bloqueado</span> :
                       c.activo ? <span className="badge-activo">Activo</span> :
                       <span className="badge-pendiente">Inactivo</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setModalPlan(c); setPlanForm({ plan: c.plan, fecha_vencimiento_pago: c.fecha_vencimiento_pago?.split('T')[0] || '' }); }}
                          className="text-gray-500 hover:text-orange-400 transition-colors" title="Editar plan">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setModalBloqueo(c)}
                          className={`transition-colors ${c.bloqueado ? 'text-gray-500 hover:text-green-400' : 'text-gray-500 hover:text-red-400'}`}
                          title={c.bloqueado ? 'Desbloquear' : 'Bloquear'}>
                          {c.bloqueado ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                        <button onClick={() => navigate(`/gym/${gymSlug}/admin/rutinas/${c.id}`)}
                          className="text-gray-500 hover:text-orange-400 transition-colors" title="Ver/editar rutina">
                          <Dumbbell size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL NUEVO CLIENTE */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg">Nuevo cliente</h3>
              <button onClick={() => setModalNuevo(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Nombre *</label>
                  <input value={formNuevo.nombre} onChange={e => setFormNuevo(f => ({...f, nombre: e.target.value}))}
                    className="input-field w-full" placeholder="Juan" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Apellido</label>
                  <input value={formNuevo.apellido} onChange={e => setFormNuevo(f => ({...f, apellido: e.target.value}))}
                    className="input-field w-full" placeholder="Pérez" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
                <input type="email" value={formNuevo.email} onChange={e => setFormNuevo(f => ({...f, email: e.target.value}))}
                  className="input-field w-full" placeholder="juan@email.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Contraseña <span className="text-gray-600">(vacío = Cambiar123!)</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formNuevo.password}
                  onChange={e => setFormNuevo(f => ({...f, password: e.target.value}))}
                  className="input-field w-full"
                  placeholder="Dejar vacío para asignar Cambiar123!"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Teléfono</label>
                <input value={formNuevo.telefono} onChange={e => setFormNuevo(f => ({...f, telefono: e.target.value}))}
                  className="input-field w-full" placeholder="+54 9 11 1234-5678" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Plan</label>
                  <select value={formNuevo.plan} onChange={e => setFormNuevo(f => ({...f, plan: e.target.value}))} className="input-field w-full">
                    {PLANES.map(p => <option key={p} value={p}>{planLabels[p]}</option>)}
                    <option value="">Sin plan</option>  {/* ← agregar esto */}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Vence pago</label>
                  <input type="date" value={formNuevo.fecha_vencimiento_pago}
                    onChange={e => setFormNuevo(f => ({...f, fecha_vencimiento_pago: e.target.value}))}
                    className="input-field w-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalNuevo(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={crearCliente} disabled={guardandoNuevo}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ backgroundColor: color }}>
                {guardandoNuevo ? 'Creando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR */}
      {modalImportar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-lg">Importar clientes</h3>
              <button onClick={() => { setModalImportar(false); setArchivoImport(null); setPrevistaImport([]); }}
                className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet size={16} className="text-green-400" />
                <p className="text-sm font-medium text-white">Formato del archivo CSV</p>
              </div>
              <p className="text-xs text-gray-400 mb-2">Columnas (separadas por coma o punto y coma):</p>
              <code className="text-xs text-orange-400 bg-gray-900 px-3 py-1.5 rounded-lg block">
                nombre, apellido, email, telefono, plan, vencimiento, password
              </code>
              <p className="text-xs text-gray-500 mt-2">
                • <strong className="text-gray-400">plan:</strong> 1_dia / 2_dias / 3_dias / libre
                &nbsp;•&nbsp; <strong className="text-gray-400">password</strong> vacío = Cambiar123!
              </p>
            </div>

            {!archivoImport ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-8 cursor-pointer hover:border-gray-500 transition-colors">
                <Upload size={32} className="text-gray-600 mb-3" />
                <p className="text-gray-400 font-medium mb-1">Subí tu archivo CSV</p>
                <p className="text-gray-600 text-sm">Hacé clic o arrastrá el archivo acá</p>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
                  onChange={e => e.target.files[0] && leerArchivo(e.target.files[0])} />
              </label>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-400" />
                    <span className="text-sm text-white font-medium">{archivoImport.name}</span>
                    <span className="text-xs text-gray-500">— {previstaImport.length} clientes</span>
                  </div>
                  <button onClick={() => { setArchivoImport(null); setPrevistaImport([]); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-gray-500 hover:text-red-400 text-xs">Cambiar</button>
                </div>
                {previstaImport.length > 0 && (
                  <div className="border border-gray-700 rounded-xl overflow-hidden mb-4">
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800 sticky top-0">
                          <tr>
                            {['Nombre','Apellido','Email','Teléfono','Plan','Vencimiento'].map(h => (
                              <th key={h} className="text-left text-gray-400 px-3 py-2 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {previstaImport.slice(0,10).map((f,i) => (
                            <tr key={i} className="hover:bg-gray-800/30">
                              <td className="px-3 py-2 text-white">{f.nombre}</td>
                              <td className="px-3 py-2 text-gray-400">{f.apellido}</td>
                              <td className="px-3 py-2 text-gray-400">{f.email}</td>
                              <td className="px-3 py-2 text-gray-400">{f.telefono}</td>
                              <td className="px-3 py-2 text-orange-400">{f.plan || '2_dias'}</td>
                              <td className="px-3 py-2 text-gray-400">{f.vencimiento || f.fecha_vencimiento || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previstaImport.length > 10 && (
                      <p className="text-center text-xs text-gray-600 py-2">... y {previstaImport.length - 10} más</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setModalImportar(false); setArchivoImport(null); setPrevistaImport([]); }}
                className="btn-secondary flex-1">Cancelar</button>
              <button onClick={ejecutarImport} disabled={importando || previstaImport.length === 0}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ backgroundColor: color }}>
                {importando ? 'Importando...' : `Importar ${previstaImport.length} clientes`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOQUEO */}
      {modalBloqueo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-2">
              {modalBloqueo.bloqueado ? '✅ Desbloquear cliente' : '🔒 Bloquear cliente'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">{modalBloqueo.nombre} {modalBloqueo.apellido}</p>
            {!modalBloqueo.bloqueado && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1.5">Motivo (visible para el cliente)</label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
                  className="input-field resize-none" rows={3} placeholder="Ej: Cuota sin abonar" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalBloqueo(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={confirmarBloqueo}
                className={`flex-1 font-semibold py-2.5 rounded-lg transition-colors ${modalBloqueo.bloqueado ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-danger'}`}>
                {modalBloqueo.bloqueado ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLAN */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-4">Actualizar plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Plan</label>
                <select value={planForm.plan} onChange={e => setPlanForm(p => ({...p, plan: e.target.value}))} className="input-field">
                  {PLANES.map(p => <option key={p} value={p}>{planLabels[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Vencimiento del pago</label>
                <input type="date" value={planForm.fecha_vencimiento_pago}
                  onChange={e => setPlanForm(p => ({...p, fecha_vencimiento_pago: e.target.value}))}
                  className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalPlan(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={guardarPlan} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
