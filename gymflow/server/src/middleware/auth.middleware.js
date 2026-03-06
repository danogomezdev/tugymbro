const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verificarToken = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Si es superadmin, buscar en tabla superadmins
    if (decoded.rol === 'superadmin') {
      const result = await pool.query(
        'SELECT id, nombre, email FROM superadmins WHERE id = $1',
        [decoded.id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      req.usuario = { ...result.rows[0], rol: 'superadmin', apellido: '' };
      return next();
    }

    // Para el resto, buscar en usuarios con datos frescos
    const result = await pool.query(
      `SELECT id, nombre, apellido, email, rol, gimnasio_id,
              plan, fecha_vencimiento_pago, bloqueado, activo,
              debe_cambiar_password
       FROM usuarios WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    console.error('verificarToken error:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

const soloSuperAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

const soloAdminGym = (req, res, next) => {
  if (req.usuario?.rol !== 'admin_gym') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

const adminOProfesor = (req, res, next) => {
  if (!['admin_gym', 'profesor'].includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

const verificarGimnasio = async (req, res, next) => {
  const slug = req.params.gymSlug || req.body.gymSlug || req.query.gymSlug;
  if (!slug) return res.status(400).json({ error: 'Gimnasio no especificado' });

  try {
    const result = await pool.query(
      `SELECT g.*, pp.feature_reservas, pp.feature_pagos, pp.feature_notificaciones,
              pp.feature_rutinas, pp.feature_profesores, pp.feature_estadisticas,
              pp.feature_logo_propio, pp.nombre as plan_nombre
       FROM gimnasios g
       LEFT JOIN planes_plataforma pp ON g.plan_id = pp.id
       WHERE g.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' });
    }

    const gym = result.rows[0];
    if (gym.estado !== 'activo') {
      return res.status(403).json({ error: 'Este gimnasio no está activo', estado: gym.estado });
    }

    req.gimnasio = gym;
    next();
  } catch (err) {
    console.error('Error verificando gimnasio:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const verificarPertenencia = (req, res, next) => {
  if (req.usuario?.rol === 'superadmin') return next();
  if (req.usuario?.gimnasio_id !== req.gimnasio?.id) {
    return res.status(403).json({ error: 'No pertenecés a este gimnasio' });
  }
  next();
};

const requiereFeature = (feature) => (req, res, next) => {
  if (!req.gimnasio?.[`feature_${feature}`]) {
    return res.status(403).json({
      error: `Esta función no está disponible en tu plan actual.`,
      feature,
      upgrade: true
    });
  }
  next();
};

module.exports = {
  verificarToken,
  soloSuperAdmin,
  soloAdminGym,
  adminOProfesor,
  verificarGimnasio,
  verificarPertenencia,
  requiereFeature
};