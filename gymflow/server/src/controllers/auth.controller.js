const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Login de usuario del gym (admin_gym, profesor, cliente)
const loginGym = async (req, res) => {
  const { email, password, gymSlug } = req.body;

  try {
    // Buscar gimnasio
    const gymResult = await pool.query(
      `SELECT g.*, pp.feature_rutinas, pp.feature_profesores, pp.feature_reservas,
              pp.feature_pagos, pp.feature_notificaciones, pp.nombre as plan_nombre
       FROM gimnasios g
       LEFT JOIN planes_plataforma pp ON g.plan_id = pp.id
       WHERE g.slug = $1`,
      [gymSlug]
    );

    if (gymResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' });
    }

    const gym = gymResult.rows[0];
    if (gym.estado !== 'activo') {
      return res.status(403).json({ error: 'Este gimnasio no está activo' });
    }

    // Buscar usuario en ese gym
    const userResult = await pool.query(
      `SELECT * FROM usuarios
       WHERE email = $1 AND gimnasio_id = $2 AND activo = true
         AND password_hash = crypt($3, password_hash)`,
      [email, gym.id, password]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = userResult.rows[0];

    if (usuario.bloqueado) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contactá al gimnasio.', bloqueado: true });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        plan: usuario.plan,
        gimnasio_id: gym.id,
        gym_slug: gym.slug,
        bloqueado: usuario.bloqueado
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        plan: usuario.plan,
        bloqueado: usuario.bloqueado,
        fecha_vencimiento_pago: usuario.fecha_vencimiento_pago,
        gimnasio_id: gym.id,
        gym_slug: gym.slug
      },
      gimnasio: {
        id: gym.id,
        slug: gym.slug,
        nombre: gym.nombre,
        logo_url: gym.logo_url,
        color_primario: gym.color_primario,
        plan_nombre: gym.plan_nombre,
        features: {
          reservas: gym.feature_reservas,
          pagos: gym.feature_pagos,
          notificaciones: gym.feature_notificaciones,
          rutinas: gym.feature_rutinas,
          profesores: gym.feature_profesores
        }
      }
    });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Registro de cliente en un gym
const registroCliente = async (req, res) => {
  const { nombre, apellido, email, password, telefono } = req.body;
  const gymSlug = req.params.gymSlug || req.body.gymSlug;

  try {
    const gymResult = await pool.query(
      `SELECT id, estado FROM gimnasios WHERE slug = $1`, [gymSlug]
    );
    if (gymResult.rows.length === 0) return res.status(404).json({ error: 'Gimnasio no encontrado' });
    if (gymResult.rows[0].estado !== 'activo') return res.status(403).json({ error: 'Gimnasio no activo' });

    const gymId = gymResult.rows[0].id;

    const existe = await pool.query(
      `SELECT id FROM usuarios WHERE email = $1 AND gimnasio_id = $2`, [email, gymId]
    );
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Ya existe una cuenta con ese email' });

    const result = await pool.query(
      `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), 'cliente', $6) RETURNING id, nombre, apellido, email, rol`,
      [gymId, nombre, apellido, email, password, telefono]
    );

    res.status(201).json({ mensaje: 'Cuenta creada correctamente', usuario: result.rows[0] });
  } catch (error) {
    console.error('Error registro:', error);
    res.status(500).json({ error: 'Error al crear cuenta' });
  }
};

// Login super admin
const loginSuperAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM superadmins
       WHERE email = $1 AND activo = true
         AND password_hash = crypt($2, password_hash)`,
      [email, password]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const admin = result.rows[0];

    const token = jwt.sign(
      { id: admin.id, email: admin.email, nombre: admin.nombre, rol: 'superadmin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, admin: { id: admin.id, nombre: admin.nombre, email: admin.email, rol: 'superadmin' } });
  } catch (error) {
    console.error('Error login superadmin:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Cambiar password
const cambiarPassword = async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;
  const usuarioId = req.usuario.id;

  try {
    const result = await pool.query(
      `SELECT id FROM usuarios
       WHERE id = $1 AND password_hash = crypt($2, password_hash)`,
      [usuarioId, passwordActual]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    await pool.query(
      `UPDATE usuarios SET password_hash = crypt($1, gen_salt('bf', 10)) WHERE id = $2`,
      [passwordNueva, usuarioId]
    );
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

module.exports = { loginGym, registroCliente, loginSuperAdmin, cambiarPassword };