import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const estadoStyles = {
  confirmada: 'bg-green-900/30 text-green-400 border border-green-500/30',
  cancelada: 'bg-gray-800 text-gray-500',
  asistio: 'bg-blue-900/30 text-blue-400 border border-blue-500/30',
  ausente: 'bg-red-900/30 text-red-400 border border-red-500/30',
};

export default function MisReservas() {
  const { gymSlug } = useParams();
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargarReservas(); }, [mes, anio]);

  const cargarReservas = async () => {
    setCargando(true);
    try {
      const { data } = await api.get(`/gym/${gymSlug}/cliente/reservas?mes=${mes}&anio=${anio}`);
      setReservas(data.reservas);
    } catch { toast.error('Error al cargar reservas'); }
    finally { setCargando(false); }
  };

  const cancelar = async (id) => {
    if (!window.confirm('¿Cancelar esta reserva?')) return;
    try {
      await api.put(`/gym/${gymSlug}/cliente/reservas/${id}/cancelar`);
      toast.success('Reserva cancelada');
      cargarReservas();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const navegarMes = (dir) => {
    let nm = mes + dir, na = anio;
    if (nm > 12) { nm = 1; na++; }
    if (nm < 1) { nm = 12; na--; }
    setMes(nm); setAnio(na);
  };

  const nombreMes = format(new Date(anio, mes - 1, 1), 'MMMM yyyy', { locale: es });

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-4">Mis Reservas</h1>

        <div className="card flex items-center justify-between mb-4">
          <button onClick={() => navegarMes(-1)} className="text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>
          <span className="font-semibold text-white capitalize">{nombreMes}</span>
          <button onClick={() => navegarMes(1)} className="text-gray-400 hover:text-white"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            ['Confirmadas', reservas.filter(r => r.estado === 'confirmada').length, 'text-green-400'],
            ['Asistidas', reservas.filter(r => r.estado === 'asistio').length, 'text-blue-400'],
            ['Ausentes', reservas.filter(r => r.estado === 'ausente').length, 'text-red-400'],
            ['Canceladas', reservas.filter(r => r.estado === 'cancelada').length, 'text-gray-500'],
          ].map(([label, count, color]) => (
            <div key={label} className="card text-center p-3">
              <p className={`text-xl font-black ${color}`}>{count}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}</div>
        ) : reservas.length === 0 ? (
          <div className="card text-center py-10">
            <Calendar className="text-gray-700 mx-auto mb-2" size={36} />
            <p className="text-gray-500 text-sm">No hay reservas en {nombreMes}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map(r => (
              <div key={r.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg"><Calendar className="text-orange-500" size={16} /></div>
                  <div>
                    <p className="font-semibold text-white text-sm capitalize">
                      {r.fecha ? format(new Date(String(r.fecha).includes('T') ? r.fecha : r.fecha + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es }) : '-'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={11} className="text-gray-500" />
                      <p className="text-gray-400 text-xs">{r.hora_inicio?.slice(0,5)} - {r.hora_fin?.slice(0,5)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoStyles[r.estado]}`}>{r.estado}</span>
                  {r.estado === 'confirmada' && (
                    <button onClick={() => cancelar(r.id)} className="text-gray-600 hover:text-red-400 transition-colors"><XCircle size={16} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
