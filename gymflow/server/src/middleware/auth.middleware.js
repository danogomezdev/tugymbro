const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Verifica token JWT y adjunta usuario + gimnasio al request
const verificarToken = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Solo super admin (dueño de la plataforma)
const soloSuperAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Solo admin del gym
const soloAdminGym = (req, res, next) => {
  if (req.usuario?.rol !== 'admin_gym') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Admin gym o profesor
const adminOProfesor = (req, res, next) => {
  if (!['admin_gym', 'profesor'].includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Verifica que el gimnasio exista y esté activo, lo adjunta al request
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

// Verifica que el usuario pertenezca al gimnasio del request
const verificarPertenencia = (req, res, next) => {
  if (req.usuario?.rol === 'superadmin') return next(); // superadmin pasa siempre
  if (req.usuario?.gimnasio_id !== req.gimnasio?.id) {
    return res.status(403).json({ error: 'No pertenecés a este gimnasio' });
  }
  next();
};

// Verifica feature habilitada según plan del gym
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
