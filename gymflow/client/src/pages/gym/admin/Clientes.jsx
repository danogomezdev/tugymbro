import { useState, useEffect } from 'react';
import { Search, Lock, Unlock, Edit2, UserX, UserCheck, Calendar, Dumbbell, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const planLabels = { '1_dia': '1 día', '2_dias': '2 días', '3_dias': '3 días' };

export default function GymClientes() {
  const { gymSlug } = useParams();
  const { gimnasio, logout } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalBloqueo, setModalBloqueo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [modalPlan, setModalPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: '', fecha_vencimiento_pago: '' });

  useEffect(() => {
    cargarClientes();
  }, [buscar, filtroEstado]);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (buscar) params.append('buscar', buscar);
      if (filtroEstado) params.append('estado', filtroEstado);
      const { data } = await api.get(`/gym/${gymSlug}/admin/clientes?${params}`);
      setClientes(data.clientes);
    } catch (err) {
      toast.error('Error al cargar clientes');
    } finally {
      setCargando(false);
    }
  };

  const confirmarBloqueo = async () => {
    try {
      await api.put(`/gym/${gymSlug}/admin/clientes/${modalBloqueo.id}/bloqueo`, {
        bloqueado: !modalBloqueo.bloqueado,
        motivo
      });
      toast.success(`Cliente ${modalBloqueo.bloqueado ? 'desbloqueado' : 'bloqueado'}`);
      setModalBloqueo(null);
      setMotivo('');
      cargarClientes();
    } catch (err) {
      toast.error('Error al actualizar cliente');
    }
  };

  const guardarPlan = async () => {
    try {
      await api.put(`/gym/${gymSlug}/admin/clientes/${modalPlan.id}/plan`, planForm);
      toast.success('Plan actualizado');
      setModalPlan(null);
      cargarClientes();
    } catch (err) {
      toast.error('Error al actualizar plan');
    }
  };

  const color = gimnasio?.color_primario || '#f97316';
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/gym/${gymSlug}/admin`)} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-white">Clientes</h1>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 p-2"><LogOut size={18}/></button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            className="input-field pl-9"
            placeholder="Buscar por nombre, apellido o email..."
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input-field w-auto">
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="bloqueado">Bloqueados</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 border-b border-gray-800">
              <tr>
                {['Cliente', 'Email', 'Plan', 'Reservas mes', 'Vence pago', 'Estado', 'Acciones'].map(h => (
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
                      <button
                        onClick={() => { setModalPlan(c); setPlanForm({ plan: c.plan, fecha_vencimiento_pago: c.fecha_vencimiento_pago?.split('T')[0] || '' }); }}
                        className="text-gray-500 hover:text-orange-400 transition-colors"
                        title="Editar plan"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setModalBloqueo(c)}
                        className={`transition-colors ${c.bloqueado ? 'text-gray-500 hover:text-green-400' : 'text-gray-500 hover:text-red-400'}`}
                        title={c.bloqueado ? 'Desbloquear' : 'Bloquear'}
                      >
                        {c.bloqueado ? <Unlock size={16} /> : <Lock size={16} />}
                      </button>
                      <button
                        onClick={() => navigate(`/gym/${gymSlug}/admin/rutinas/${c.id}`)}
                        className="text-gray-500 hover:text-orange-400 transition-colors"
                        title="Ver/editar rutina"
                      >
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

      {/* Modal Bloqueo */}
      {modalBloqueo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-2">
              {modalBloqueo.bloqueado ? '✅ Desbloquear cliente' : '🔒 Bloquear cliente'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {modalBloqueo.nombre} {modalBloqueo.apellido}
            </p>
            {!modalBloqueo.bloqueado && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1.5">Motivo (visible para el cliente)</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Ej: Cuota de diciembre sin abonar"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModalBloqueo(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={confirmarBloqueo} className={`flex-1 font-semibold py-2.5 rounded-lg transition-colors ${modalBloqueo.bloqueado ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-danger'}`}>
                {modalBloqueo.bloqueado ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plan */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-lg mb-4">Actualizar plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Plan de entrenamiento</label>
                <select value={planForm.plan} onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))} className="input-field">
                  <option value="1_dia">1 día/semana</option>
                  <option value="2_dias">2 días/semana</option>
                  <option value="3_dias">3 días/semana</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Vencimiento del pago</label>
                <input type="date" value={planForm.fecha_vencimiento_pago}
                  onChange={e => setPlanForm(p => ({ ...p, fecha_vencimiento_pago: e.target.value }))}
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
      </main>
    </div>
  );
}
