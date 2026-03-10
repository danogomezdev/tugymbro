import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Home, Calendar, Dumbbell, RefreshCw, Bell, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

function esColorClaro(hex) {
  if (!hex) return false;
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0,2), 16) / 255;
  const g = parseInt(h.substring(2,4), 16) / 255;
  const b = parseInt(h.substring(4,6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.7;
}

export default function NavbarCliente({ notifCount = 0 }) {
  const { gymSlug } = useParams();
  const { gimnasio, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const base = `/gym/${gymSlug}`;
  const colorRaw = gimnasio?.color_primario || '#3b82f6';
  const color = esColorClaro(colorRaw) ? '#3b82f6' : colorRaw;

  const items = [
    { path: `${base}/home`, icon: Home, label: 'Inicio' },
    { path: `${base}/reservas`, icon: Calendar, label: 'Reservas' },
    gimnasio?.features?.rutinas && { path: `${base}/rutina`, icon: Dumbbell, label: 'Rutina' },
    { path: `${base}/recupero`, icon: RefreshCw, label: 'Recupero' },
    { path: `${base}/notificaciones`, icon: Bell, label: 'Avisos', badge: notifCount },
    { path: `${base}/perfil`, icon: User, label: 'Perfil' },
  ].filter(Boolean);

  const isActive = (path) => location.pathname === path || (path === `${base}/home` && location.pathname === base);

  const irAPerfil = () => {
    if (gymSlug) navigate(`/gym/${gymSlug}/perfil`);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-black/95 backdrop-blur border-b border-neutral-900 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {gimnasio?.logo_url
              ? <img src={gimnasio.logo_url} alt={gimnasio.nombre} className="h-7 w-7 object-contain rounded-lg" />
              : <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Dumbbell size={14} className="text-white" />
                </div>
            }
            <span className="font-bold text-white text-sm">{gimnasio?.nombre}</span>
          </div>
          {/* Avatar — abre perfil */}
          <button onClick={irAPerfil}
            className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sm font-black text-white transition-all hover:bg-neutral-800">
            {usuario?.nombre?.charAt(0)?.toUpperCase() || '?'}
          </button>
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-neutral-900 z-40 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex">
          {items.map(({ path, icon: Icon, label, badge }) => {
            const active = isActive(path);
            return (
              <button key={path} onClick={() => navigate(path)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: color }} />}
                <div className="relative">
                  <Icon size={19} style={active ? { color } : {}} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
