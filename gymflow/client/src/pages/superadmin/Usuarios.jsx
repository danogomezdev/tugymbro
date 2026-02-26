import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, Filter } from 'lucide-react';
import { superApi } from '../../services/api';

const ROL_COLOR = {
  admin_gym: 'text-orange-400 bg-orange-500/10',
  profesor:  'text-blue-400 bg-blue-500/10',
  cliente:   'text-green-400 bg-green-500/10',
};
const ROL_LABEL = { admin_gym: 'Admin', profesor: 'Profesor', cliente: 'Cliente' };
const formatFecha = (f) => { try { return new Date(f).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}); } catch { return '-'; }};

export default function SuperAdminUsuarios() {
  const navigate = useNavigate();
  const [gimnasios, setGimnasios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroGym, setFiltroGym] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      superApi.get('/gimnasios'),
      superApi.get('/usuarios')
    ]).then(([g, u]) => {
      setGimnasios(g.data.gimnasios);
      setUsuarios(u.data.usuarios);
    }).finally(() => setCargando(false));
  }, []);

  const filtrados = usuarios.filter(u => {
    const matchGym = filtroGym === 'todos' || u.gimnasio_id === parseInt(filtroGym);
    const matchRol = filtroRol === 'todos' || u.rol === filtroRol;
    const matchBusq = `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase());
    return matchGym && matchRol && matchBusq;
  });

  const byGym = gimnasios.map(g => ({
    ...g,
    usuarios: filtrados.filter(u => u.gimnasio_id === g.id)
  })).filter(g => g.usuarios.length > 0 || filtroGym === g.id.toString());

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/superadmin')} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <h1 className="text-xl font-bold text-white flex-1">Usuarios</h1>
          <span className="text-gray-500 text-sm">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Filtros */}
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
          // Vista plana cuando filtramos por gym
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Vista agrupada por gimnasio
          <div className="space-y-6">
            {byGym.map(gym => (
              <div key={gym.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: gym.color_primario || '#f97316'}}/>
                  <h3 className="font-bold text-white">{gym.nombre}</h3>
                  <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded-full">{gym.usuarios.length} usuarios</span>
                  <span className="text-gray-600 text-xs">{gym.plan_nombre}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  {gym.usuarios.map((u, i) => (
                    <div key={u.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < gym.usuarios.length-1 ? 'border-b border-gray-800' : ''}`}>
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
