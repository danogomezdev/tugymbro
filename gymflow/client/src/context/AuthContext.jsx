import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [gimnasio, setGimnasio] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('tgb_token');
      const u = localStorage.getItem('tgb_usuario');
      const g = localStorage.getItem('tgb_gimnasio');
      if (token && u) {
        const parsedUser = JSON.parse(u);
        setUsuario(parsedUser);
        if (g && g !== 'undefined' && g !== 'null') {
          setGimnasio(JSON.parse(g));
        }
      }
    } catch {
      localStorage.removeItem('tgb_token');
      localStorage.removeItem('tgb_usuario');
      localStorage.removeItem('tgb_gimnasio');
    } finally {
      setCargando(false);
    }
  }, []);

  const loginGym = async (email, password, gymSlug) => {
    const { data } = await api.post(`/auth/login/${gymSlug}`, { email, password, gymSlug });
    localStorage.setItem('tgb_token', data.token);
    localStorage.setItem('tgb_usuario', JSON.stringify(data.usuario));
    localStorage.setItem('tgb_gimnasio', JSON.stringify(data.gimnasio));
    setUsuario(data.usuario);
    setGimnasio(data.gimnasio);
    return data;
  };

  const loginSuperAdmin = async (email, password) => {
    const { data } = await api.post('/auth/superadmin/login', { email, password });
    localStorage.setItem('tgb_token', data.token);
    localStorage.setItem('tgb_usuario', JSON.stringify({ ...data.admin, rol: 'superadmin' }));
    localStorage.removeItem('tgb_gimnasio');
    setUsuario({ ...data.admin, rol: 'superadmin' });
    setGimnasio(null);
    return data;
  };

  const logout = () => {
    const gymActual = gimnasio?.slug || localStorage.getItem('tgb_ultimo_gym');
    localStorage.removeItem('tgb_token');
    localStorage.removeItem('tgb_usuario');
    localStorage.removeItem('tgb_gimnasio');
    if (gymActual) localStorage.setItem('tgb_ultimo_gym', gymActual);
    setUsuario(null);
    setGimnasio(null);
    window.location.href = gymActual ? `/gym/${gymActual}` : '/';
  };

  const refreshGimnasio = async (gymSlug) => {
    try {
      const { data } = await api.get(`/public/gym/${gymSlug}`);
      if (data.gym) {
        setGimnasio(data.gym);
        localStorage.setItem('tgb_gimnasio', JSON.stringify(data.gym));
      }
    } catch {}
  };

  const refreshUsuario = async (gymSlug) => {
    try {
      const { data } = await api.get(`/gym/${gymSlug}/cliente/me`);
      if (data.usuario) {
        const usuarioActual = JSON.parse(localStorage.getItem('tgb_usuario') || '{}');
        const usuarioActualizado = { ...usuarioActual, ...data.usuario };
        setUsuario(usuarioActualizado);
        localStorage.setItem('tgb_usuario', JSON.stringify(usuarioActualizado));
      }
    } catch {}
  };

  const esSuperAdmin = () => usuario?.rol === 'superadmin';
  const esAdminGym = () => usuario?.rol === 'admin_gym';
  const esProfesor = () => usuario?.rol === 'profesor';
  const esCliente = () => usuario?.rol === 'cliente';
  const tieneFeature = (f) => gimnasio?.features?.[f] === true;

  return (
    <AuthContext.Provider value={{
      usuario, gimnasio, cargando,
      loginGym, loginSuperAdmin, logout, refreshGimnasio, refreshUsuario,
      esSuperAdmin, esAdminGym, esProfesor, esCliente, tieneFeature
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
