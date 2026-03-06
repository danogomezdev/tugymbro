import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Dumbbell, Search, QrCode, ChevronRight, ArrowRight, X, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function Welcome() {
  const navigate = useNavigate();
  const { usuario, gimnasio } = useAuth();
  const [modo, setModo] = useState('inicio'); // 'inicio' | 'buscar' | 'link'
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const inputRef = useRef(null);

  // Si ya tiene sesión activa, redirigir directo
  useEffect(() => {
    if (usuario && gimnasio) {
      const slug = gimnasio.slug;
      if (usuario.rol === 'admin_gym' || usuario.rol === 'profesor') {
        navigate(`/gym/${slug}/admin`, { replace: true });
      } else if (usuario.rol === 'cliente') {
        navigate(`/gym/${slug}/home`, { replace: true });
      }
    }
  }, [usuario, gimnasio, navigate]);

  // Buscar gimnasios con debounce
  useEffect(() => {
    if (query.length < 2) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get(`/public/gyms/buscar?q=${encodeURIComponent(query)}`);
        setResultados(data.gyms || []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (modo === 'buscar' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [modo]);

  const irAlGym = (slug) => navigate(`/gym/${slug}`);

  const handleLink = () => {
    setLinkError('');
    // Acepta: tugymbro.com/gym/mi-gym  o  /gym/mi-gym  o  mi-gym
    const match = linkInput.match(/(?:\/gym\/|gym\/)([a-z0-9-]+)/i) || [null, linkInput.trim()];
    const slug = match[1]?.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) { setLinkError('Ingresá un link o código válido'); return; }
    navigate(`/gym/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=Bebas+Neue&display=swap');
        .bebas { font-family: 'Bebas Neue', sans-serif; letter-spacing: .03em; }
        .grad { background: linear-gradient(135deg, #f97316, #fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,.4); } 50% { box-shadow: 0 0 0 12px rgba(249,115,22,0); } }
        .slide-up { animation: slideUp .5s cubic-bezier(.22,1,.36,1) forwards; }
        .slide-up-2 { animation: slideUp .5s .1s cubic-bezier(.22,1,.36,1) both; }
        .slide-up-3 { animation: slideUp .5s .2s cubic-bezier(.22,1,.36,1) both; }
        .slide-up-4 { animation: slideUp .5s .3s cubic-bezier(.22,1,.36,1) both; }
        .fade-in { animation: fadeIn .3s ease forwards; }
        .btn-pulse { animation: pulse 2.5s ease-in-out infinite; }
        .gym-card { transition: all .2s ease; }
        .gym-card:active { transform: scale(.97); }
        .input-dark { background: #141414; border: 1.5px solid #222; border-radius: 14px; color: white; outline: none; transition: border-color .2s; }
        .input-dark:focus { border-color: #f97316; }
        .input-dark::placeholder { color: #444; }
      `}</style>

      {/* BG decorativo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/4 rounded-full blur-[80px]" />
      </div>

      {/* PANTALLA INICIO */}
      {modo === 'inicio' && (
        <div className="flex-1 flex flex-col items-center justify-between px-6 pt-16 pb-10 relative">
          {/* Logo */}
          <div className="slide-up flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-orange-500 rounded-[24px] flex items-center justify-center btn-pulse">
              <Dumbbell size={38} className="text-white" />
            </div>
            <div className="text-center">
              <p className="bebas text-5xl grad">TU GYM BRO</p>
              <p className="text-gray-500 text-sm mt-1">Tu gym en un app</p>
            </div>
          </div>

          {/* Texto central */}
          <div className="text-center slide-up-2">
            <h1 className="bebas text-4xl text-white leading-tight mb-3">
              ENCONTRÁ<br />TU GIMNASIO
            </h1>
            <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
              Buscá tu gimnasio por nombre, ingresá el link que te dieron, o escaneá el código QR.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="w-full max-w-sm space-y-3 slide-up-3">
            <button
              onClick={() => setModo('buscar')}
              className="w-full flex items-center gap-4 bg-[#141414] border border-white/8 rounded-2xl px-5 py-4 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all gym-card"
            >
              <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Search size={18} className="text-orange-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold text-sm">Buscar por nombre</p>
                <p className="text-gray-600 text-xs">Encontrá tu gimnasio</p>
              </div>
              <ChevronRight size={16} className="text-gray-600" />
            </button>

            <button
              onClick={() => setModo('link')}
              className="w-full flex items-center gap-4 bg-[#141414] border border-white/8 rounded-2xl px-5 py-4 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all gym-card"
            >
              <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <QrCode size={18} className="text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold text-sm">Tengo un link o código QR</p>
                <p className="text-gray-600 text-xs">Ingresá el link del gym</p>
              </div>
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Footer */}
          <div className="text-center slide-up-4">
            <p className="text-gray-700 text-xs mb-2">¿Sos dueño de un gimnasio?</p>
            <button
              onClick={() => navigate('/registro-gym')}
              className="text-orange-400 hover:text-orange-300 text-sm font-bold transition-colors flex items-center gap-1 mx-auto"
            >
              Registrá tu gimnasio <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA BUSCAR */}
      {modo === 'buscar' && (
        <div className="flex-1 flex flex-col px-6 pt-12 fade-in">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => { setModo('inicio'); setQuery(''); setResultados([]); }}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
            <h2 className="bebas text-2xl text-white">BUSCAR GIMNASIO</h2>
          </div>

          {/* Input búsqueda */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nombre del gimnasio..."
              className="input-dark w-full pl-11 pr-4 py-4 text-sm"
            />
            {buscando && (
              <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 animate-spin" />
            )}
          </div>

          {/* Resultados */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {query.length < 2 && (
              <p className="text-gray-600 text-sm text-center mt-8">Escribí al menos 2 letras para buscar</p>
            )}
            {query.length >= 2 && !buscando && resultados.length === 0 && (
              <div className="text-center mt-8">
                <p className="text-gray-500 text-sm">No encontramos ningún gimnasio</p>
                <p className="text-gray-700 text-xs mt-1">Probá con otro nombre o pedile el link directo</p>
              </div>
            )}
            {resultados.map((gym) => (
              <button
                key={gym.slug}
                onClick={() => irAlGym(gym.slug)}
                className="w-full flex items-center gap-4 bg-[#141414] border border-white/8 rounded-2xl px-5 py-4 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all gym-card text-left"
              >
                {gym.logo_url ? (
                  <img src={gym.logo_url} alt={gym.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: gym.color_primario || '#f97316' }}>
                    <Dumbbell size={20} className="text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{gym.nombre}</p>
                  {gym.direccion && <p className="text-gray-600 text-xs truncate mt-0.5">{gym.direccion}</p>}
                </div>
                <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PANTALLA LINK / QR */}
      {modo === 'link' && (
        <div className="flex-1 flex flex-col px-6 pt-12 fade-in">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => { setModo('inicio'); setLinkInput(''); setLinkError(''); }}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
            <h2 className="bebas text-2xl text-white">INGRESAR LINK</h2>
          </div>

          <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 mb-4">
            <p className="text-gray-400 text-sm mb-1 font-medium">Link o código del gimnasio</p>
            <p className="text-gray-600 text-xs mb-4">Tu gimnasio te habrá dado un link como:<br />
              <span className="text-orange-400/70">tugymbro.com/gym/<strong>mi-gimnasio</strong></span>
            </p>
            <input
              value={linkInput}
              onChange={e => { setLinkInput(e.target.value); setLinkError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLink()}
              placeholder="tugymbro.com/gym/mi-gimnasio"
              className="input-dark w-full px-4 py-3.5 text-sm mb-3"
              autoCapitalize="none"
              autoCorrect="off"
            />
            {linkError && <p className="text-red-400 text-xs mb-3">{linkError}</p>}
            <button
              onClick={handleLink}
              disabled={!linkInput.trim()}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Ir al gimnasio <ArrowRight size={16} />
            </button>
          </div>

          {/* Instrucción QR */}
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5 flex gap-4 items-start">
            <QrCode size={28} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-bold mb-1">¿Tenés un QR?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Escanealo con la cámara de tu celular. El link te va a llevar directo a la app de tu gimnasio.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
