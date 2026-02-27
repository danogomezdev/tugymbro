import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, Plus, Upload, X, Check, Copy, Download, AlertCircle } from 'lucide-react';
import { superApi } from '../../services/api';
import toast from 'react-hot-toast';

const ROL_COLOR = {
  admin_gym: 'text-orange-400 bg-orange-500/10',
  profesor:  'text-blue-400 bg-blue-500/10',
  cliente:   'text-green-400 bg-green-500/10',
};
const ROL_LABEL = { admin_gym: 'Admin', profesor: 'Profesor', cliente: 'Cliente' };
const formatFecha = (f) => { try { return new Date(f).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '-'; }};

const FORM_USUARIO_VACIO = { gimnasio_id: '', nombre: '', apellido: '', email: '', password: '', rol: 'cliente', plan: '', telefono: '' };

export default function SuperAdminUsuarios() {
  const navigate = useNavigate();
  const [gimnasios, setGimnasios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroGym, setFiltroGym] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Crear usuario
  const [modalUsuario, setModalUsuario] = useState(false);
  const [formUsuario, setFormUsuario] = useState(FORM_USUARIO_VACIO);
  const [creando, setCreando] = useState(false);
  const [credenciales, setCredenciales] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Importar CSV
  const [modalImport, setModalImport] = useState(false);
  const [gymImport, setGymImport] = useState('');
  const [csvTexto, setCsvTexto] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([superApi.get('/gimnasios'), superApi.get('/usuarios')])
      .then(([g, u]) => { setGimnasios(g.data.gimnasios); setUsuarios(u.data.usuarios); })
      .finally(() => setCargando(false));
  }, []);

  const crearUsuario = async () => {
    if (!formUsuario.gimnasio_id || !formUsuario.nombre || !formUsuario.email) {
      toast.error('Gimnasio, nombre y email son obligatorios');
      return;
    }
    setCreando(true);
    try {
      const { data } = await superApi.post('/usuarios', formUsuario);
      setUsuarios(prev => [...prev, { ...data.usuario, gimnasio_id: parseInt(formUsuario.gimnasio_id) }]);
      setCredenciales(data.credenciales);
      setModalUsuario(false);
      setFormUsuario(FORM_USUARIO_VACIO);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear usuario');
    } finally { setCreando(false); }
  };

  const parsearCSV = (texto) => {
    const lineas = texto.trim().split('\n').filter(l => l.trim());
    if (lineas.length === 0) return [];
    // Detectar si tiene header
    const primeraLinea = lineas[0].toLowerCase();
    const tieneHeader = primeraLinea.includes('nombre') || primeraLinea.includes('email') || primeraLinea.includes('mail');
    const datos = tieneHeader ? lineas.slice(1) : lineas;
    return datos.map(l => {
      const partes = l.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      // Asumir orden: nombre, apellido, email, telefono, plan
      return {
        nombre: partes[0] || '',
        apellido: partes[1] || '',
        email: partes[2] || partes[1] || '', // si solo hay 2 cols, la 2da es email
        telefono: partes[3] || '',
        plan: partes[4] || '',
      };
    }).filter(c => c.email.includes('@'));
  };

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvTexto(ev.target.result);
    reader.readAsText(file);
  };

  const importarClientes = async () => {
    if (!gymImport) { toast.error('Seleccioná un gimnasio'); return; }
    const clientes = parsearCSV(csvTexto);
    if (clientes.length === 0) { toast.error('No se detectaron clientes válidos en el CSV'); return; }
    setImportando(true);
    try {
      const { data } = await superApi.post('/importar-clientes', {
        gimnasio_id: parseInt(gymImport),
        clientes
      });
      setResultadoImport(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al importar');
    } finally { setImportando(false); }
  };

  const descargarPlantilla = () => {
    const csv = 'nombre,apellido,email,telefono,plan\nJuan,Pérez,juan@email.com,1155555555,3_dias\nMaría,García,maria@email.com,,2_dias';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plantilla_clientes.csv';
    a.click();
  };

  const copiarCredenciales = () => {
    const texto = `Email: ${credenciales.email}\nContraseña: ${credenciales.password}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const filtrados = usuarios.filter(u => {
    const matchGym = filtroGym === 'todos' || u.gimnasio_id === parseInt(filtroGym);
    const matchRol = filtroRol === 'todos' || u.rol === filtroRol;
    const matchBusq = `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase());
    return matchGym && matchRol && matchBusq;
  });

  const byGym = gimnasios.map(g => ({
    ...g, usuarios: filtrados.filter(u => u.gimnasio_id === g.id)
  })).filter(g => g.usuarios.length > 0);

  const clientesPreview = csvTexto ? parsearCSV(csvTexto) : [];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/superadmin')} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <h1 className="text-xl font-bold text-white flex-1">Usuarios</h1>
          <span className="text-gray-500 text-sm">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setModalImport(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-all border border-gray-700">
            <Upload size={15}/> Importar CSV
          </button>
          <button onClick={() => setModalUsuario(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            <Plus size={16}/> Nuevo usuario
          </button>
        </div>
      </header>

      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none w-full"
              placeholder="Buscar por nombre o email..."/>
          </div>
          <select value={filtroGym} onChange={e => setFiltroGym(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="todos">Todos los gyms</option>
            {gimnasios.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="todos">Todos los roles</option>
            <option value="cliente">Clientes</option>
            <option value="profesor">Profesores</option>
            <option value="admin_gym">Admins</option>
          </select>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {cargando ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16"><Users className="text-gray-700 mx-auto mb-4" size={48}/><p className="text-gray-500">No hay usuarios</p></div>
        ) : filtroGym !== 'todos' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {filtrados.map((u, i) => (
              <div key={u.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < filtrados.length-1 ? 'border-b border-gray-800' : ''}`}>
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.nombre?.[0]}{u.apellido?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{u.nombre} {u.apellido}</p>
                  <p className="text-gray-500 text-xs truncate">{u.email}{u.telefono ? ` · ${u.telefono}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROL_COLOR[u.rol]}`}>{ROL_LABEL[u.rol]}</span>
                  {u.rol === 'cliente' && <span className="text-xs text-gray-600">{u.plan?.replace('_',' ')}</span>}
                  <span className="text-gray-700 text-xs hidden sm:block">{formatFecha(u.creado_en)}</span>
                  {u.bloqueado && <span className="text-xs bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Bloq.</span>}
                  {u.debe_cambiar_password && <span className="text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">Sin activar</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {byGym.map(gym => (
              <div key={gym.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: gym.color_primario || '#f97316'}}/>
                  <h3 className="font-bold text-white">{gym.nombre}</h3>
                  <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded-full">{gym.usuarios.length} usuarios</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  {gym.usuarios.map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < gym.usuarios.length-1 ? 'border-b border-gray-800' : ''}`}>
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.nombre?.[0]}{u.apellido?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{u.nombre} {u.apellido}</p>
                        <p className="text-gray-500 text-xs truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROL_COLOR[u.rol]}`}>{ROL_LABEL[u.rol]}</span>
                        {u.debe_cambiar_password && <span className="text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">Sin activar</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal crear usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">Crear usuario</h3>
              <button onClick={() => setModalUsuario(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Gimnasio *</label>
                <select value={formUsuario.gimnasio_id}
                  onChange={e => setFormUsuario(f => ({...f, gimnasio_id: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Seleccionar...</option>
                  {gimnasios.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Nombre *</label>
                  <input value={formUsuario.nombre}
                    onChange={e => setFormUsuario(f => ({...f, nombre: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                    placeholder="Juan" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Apellido</label>
                  <input value={formUsuario.apellido}
                    onChange={e => setFormUsuario(f => ({...f, apellido: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                    placeholder="Pérez" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email *</label>
                <input type="email" value={formUsuario.email}
                  onChange={e => setFormUsuario(f => ({...f, email: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="juan@email.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Rol</label>
                  <select value={formUsuario.rol}
                    onChange={e => setFormUsuario(f => ({...f, rol: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    <option value="cliente">Cliente</option>
                    <option value="admin_gym">Admin gym</option>
                    <option value="profesor">Profesor</option>
                  </select>
                </div>
                {formUsuario.rol === 'cliente' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Plan</label>
                    <select value={formUsuario.plan}
                      onChange={e => setFormUsuario(f => ({...f, plan: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                      <option value="">Sin plan</option>
                      <option value="2_dias">2 días</option>
                      <option value="3_dias">3 días</option>
                      <option value="libre">Libre</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Contraseña <span className="text-gray-600">(vacío = "Bienvenido1!" y debe cambiarla)</span>
                </label>
                <input type="password" value={formUsuario.password}
                  onChange={e => setFormUsuario(f => ({...f, password: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="Dejar vacío = temporal" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
              <button onClick={() => setModalUsuario(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={crearUsuario} disabled={creando}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm disabled:opacity-50">
                {creando ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credenciales post-creación */}
      {credenciales && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-green-500/30 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-green-400" />
            </div>
            <h3 className="font-bold text-white text-lg mb-1">Usuario creado</h3>
            <p className="text-gray-500 text-sm mb-5">Compartí estas credenciales al usuario</p>
            <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2 mb-4">
              <div><p className="text-xs text-gray-500">Email</p><p className="text-white font-mono text-sm">{credenciales.email}</p></div>
              <div><p className="text-xs text-gray-500">Contraseña</p><p className="text-white font-mono text-sm font-bold">{credenciales.password}</p></div>
              {credenciales.debe_cambiar && <p className="text-yellow-400 text-xs">⚠ Debe cambiar la contraseña al entrar por primera vez</p>}
            </div>
            <button onClick={copiarCredenciales}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm mb-3">
              {copiado ? <><Check size={15} className="text-green-400"/> Copiado</> : <><Copy size={15}/> Copiar</>}
            </button>
            <button onClick={() => { setCredenciales(null); setCopiado(false); }}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm">
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Modal importar CSV */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">Importar clientes desde CSV</h3>
              <button onClick={() => { setModalImport(false); setResultadoImport(null); setCsvTexto(''); }}
                className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>

            {resultadoImport ? (
              /* Resultado de la importación */
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-green-400" />
                  </div>
                  <h4 className="font-bold text-white text-lg">Importación completada</h4>
                  <p className="text-gray-500 text-sm mt-1">{resultadoImport.mensaje}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-400 font-black text-2xl">{resultadoImport.creados}</p>
                    <p className="text-gray-400 text-sm">Clientes creados</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <p className="text-gray-300 font-black text-2xl">{resultadoImport.omitidos}</p>
                    <p className="text-gray-500 text-sm">Omitidos (ya existían)</p>
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                  <p className="text-blue-300 text-sm font-semibold">Contraseña temporal asignada:</p>
                  <p className="text-white font-mono font-bold text-lg mt-1">{resultadoImport.password_temporal}</p>
                  <p className="text-blue-400 text-xs mt-1">Los clientes deberán cambiarla al entrar por primera vez</p>
                </div>
                {resultadoImport.errores?.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1"><AlertCircle size={12}/> Omitidos:</p>
                    {resultadoImport.errores.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-gray-500 text-xs">{e.email} — {e.razon}</p>
                    ))}
                  </div>
                )}
                <button onClick={() => { setModalImport(false); setResultadoImport(null); setCsvTexto(''); setGymImport(''); }}
                  className="w-full mt-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Gimnasio destino *</label>
                  <select value={gymImport} onChange={e => setGymImport(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Seleccionar gimnasio...</option>
                    {gimnasios.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-500">Archivo CSV</label>
                    <button onClick={descargarPlantilla}
                      className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
                      <Download size={12}/> Bajar plantilla
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-gray-500 transition-colors cursor-pointer"
                    onClick={() => fileRef.current?.click()}>
                    <Upload size={24} className="text-gray-600 mx-auto mb-2"/>
                    <p className="text-gray-400 text-sm">Hacé click para seleccionar el CSV</p>
                    <p className="text-gray-600 text-xs mt-1">o pegá el contenido abajo</p>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleArchivo} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    O pegá el contenido del CSV directamente
                    <span className="text-gray-600 ml-1">(nombre, apellido, email, telefono, plan)</span>
                  </label>
                  <textarea value={csvTexto} onChange={e => setCsvTexto(e.target.value)}
                    rows={5}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 font-mono resize-none"
                    placeholder="Juan,Pérez,juan@email.com,1155555555,3_dias&#10;María,García,maria@email.com,,2_dias" />
                </div>

                {clientesPreview.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="text-white font-bold">{clientesPreview.length}</span> clientes detectados:
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {clientesPreview.slice(0, 8).map((c, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="text-white">{c.nombre} {c.apellido}</span>
                          <span className="text-gray-500">{c.email}</span>
                          {c.plan && <span className="text-gray-600">{c.plan.replace('_',' ')}</span>}
                        </div>
                      ))}
                      {clientesPreview.length > 8 && <p className="text-gray-600 text-xs">...y {clientesPreview.length - 8} más</p>}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-yellow-400 text-xs">
                    <strong>Contraseña temporal:</strong> Todos los clientes importados recibirán la contraseña <strong>Bienvenido1!</strong> y deberán cambiarla al entrar por primera vez.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setModalImport(false); setCsvTexto(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                    Cancelar
                  </button>
                  <button onClick={importarClientes} disabled={importando || !csvTexto || !gymImport}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm disabled:opacity-50">
                    {importando ? 'Importando...' : `Importar ${clientesPreview.length > 0 ? clientesPreview.length + ' clientes' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
