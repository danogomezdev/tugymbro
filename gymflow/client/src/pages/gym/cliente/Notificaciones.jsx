import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NavbarCliente from './NavbarCliente';
import api from '../../../services/api';

export default function Notificaciones() {
  const { gymSlug } = useParams();
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get(`/gym/${gymSlug}/cliente/notificaciones`)
      .then(({ data }) => setNotificaciones(data.notificaciones || []))
      .finally(() => setCargando(false));
  }, [gymSlug]);

  return (
    <div className="min-h-screen bg-black pb-20">
      <NavbarCliente />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Notificaciones</h1>
        {cargando ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-neutral-900 rounded-xl animate-pulse" />)}</div>
        ) : notificaciones.length === 0 ? (
          <div className="card text-center py-12">
            <Bell className="text-neutral-700 mx-auto mb-3" size={44} />
            <p className="text-neutral-500">No hay notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map(n => (
              <div key={n.id} className={`p-4 rounded-xl border-l-4 ${
                n.tipo === 'error' ? 'bg-red-900/20 border-red-500' :
                n.tipo === 'pago' ? 'bg-green-900/20 border-green-500' :
                n.tipo === 'advertencia' ? 'bg-yellow-900/20 border-yellow-500' :
                'bg-neutral-950 border-blue-600'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white text-sm">{n.titulo}</p>
                  {!n.leida && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />}
                </div>
                <p className="text-neutral-400 text-sm mt-1">{n.mensaje}</p>
                <p className="text-neutral-600 text-xs mt-2">
                  {format(new Date(n.creado_en), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
