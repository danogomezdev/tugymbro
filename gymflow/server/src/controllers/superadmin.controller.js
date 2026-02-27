const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// =============================================
// GIMNASIOS
// =============================================

const getGimnasios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, pp.nombre as plan_nombre,
              COUNT(DISTINCT u.id) FILTER (WHERE u.rol = 'cliente') as total_clientes,
              COUNT(DISTINCT u.id) FILTER (WHERE u.rol = 'profesor') as total_profesores
       FROM gimnasios g
       LEFT JOIN planes_plataforma pp ON g.plan_id = pp.id
       LEFT JOIN usuarios u ON u.gimnasio_id = g.id AND u.activo = true
       GROUP BY g.id, pp.nombre
       ORDER BY g.creado_en DESC`
    );
    res.json({ gimnasios: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener gimnasios' });
  }
};

const getSolicitudesGimnasio = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM solicitudes_gimnasio ORDER BY creado_en DESC`
    );
    res.json({ solicitudes: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const aprobarGimnasio = async (req, res) => {
  const { solicitudId } = req.params;
  const { notas, plan_id, slug_final } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const solicitud = await client.query(
      `SELECT * FROM solicitudes_gimnasio WHERE id = $1`, [solicitudId]
    );
    if (solicitud.rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const sol = solicitud.rows[0];

    // Verificar que el slug no esté tomado
    const slugFinal = slug_final || sol.slug_deseado;
    const slugExiste = await client.query(`SELECT id FROM gimnasios WHERE slug = $1`, [slugFinal]);
    if (slugExiste.rows.length > 0) return res.status(400).json({ error: 'El slug ya está en uso, elegí otro' });

    // Crear el gimnasio
    const gymResult = await client.query(
      `INSERT INTO gimnasios (slug, nombre, email_contacto, plan_id, estado, fecha_inicio)
       VALUES ($1, $2, $3, $4, 'activo', CURRENT_DATE) RETURNING *`,
      [slugFinal, sol.nombre_gym, sol.email_contacto, plan_id || 1]
    );
    const gym = gymResult.rows[0];

    // Crear config del gym
    await client.query(
      `INSERT INTO configuracion_gym (gimnasio_id) VALUES ($1)`, [gym.id]
    );

    // Crear usuario admin del gym (debe cambiar password en primer login)
    await client.query(
      `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, password_hash, rol, debe_cambiar_password)
       VALUES ($1, $2, 'Admin', $3, crypt('Cambiar123!', gen_salt('bf', 10)), 'admin_gym', true)`,
      [gym.id, sol.nombre_contacto, sol.email_contacto]
    );

    // Marcar solicitud como aprobada
    await client.query(
      `UPDATE solicitudes_gimnasio SET estado = 'aprobado', notas_superadmin = $1 WHERE id = $2`,
      [notas, solicitudId]
    );

    await client.query('COMMIT');

    res.json({
      mensaje: `Gimnasio "${sol.nombre_gym}" activado correctamente.`,
      gym,
      credenciales: {
        email: sol.email_contacto,
        password_temporal: 'Cambiar123!',
        url: `/gym/${slugFinal}`
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al aprobar gimnasio' });
  } finally {
    client.release();
  }
};

const rechazarSolicitud = async (req, res) => {
  const { solicitudId } = req.params;
  const { notas } = req.body;
  try {
    await pool.query(
      `UPDATE solicitudes_gimnasio SET estado = 'rechazado', notas_superadmin = $1 WHERE id = $2`,
      [notas, solicitudId]
    );
    res.json({ mensaje: 'Solicitud rechazada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
};

const suspenderGimnasio = async (req, res) => {
  const { gymId } = req.params;
  const { motivo } = req.body;
  try {
    await pool.query(`UPDATE gimnasios SET estado = 'suspendido' WHERE id = $1`, [gymId]);
    res.json({ mensaje: 'Gimnasio suspendido.' });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

const reactivarGimnasio = async (req, res) => {
  const { gymId } = req.params;
  try {
    await pool.query(`UPDATE gimnasios SET estado = 'activo' WHERE id = $1`, [gymId]);
    res.json({ mensaje: 'Gimnasio reactivado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

const cambiarPlanGimnasio = async (req, res) => {
  const { gymId } = req.params;
  const { plan_id } = req.body;
  try {
    await pool.query(`UPDATE gimnasios SET plan_id = $1 WHERE id = $2`, [plan_id, gymId]);
    res.json({ mensaje: 'Plan actualizado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

const getDetalleGimnasio = async (req, res) => {
  const { gymId } = req.params;
  try {
    const gym = await pool.query(
      `SELECT g.*, pp.nombre as plan_nombre, pp.feature_rutinas, pp.feature_profesores
       FROM gimnasios g
       LEFT JOIN planes_plataforma pp ON g.plan_id = pp.id
       WHERE g.id = $1`, [gymId]
    );
    if (gym.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE rol = 'cliente') as clientes,
        COUNT(*) FILTER (WHERE rol = 'profesor') as profesores,
        COUNT(*) FILTER (WHERE rol = 'admin_gym') as admins
       FROM usuarios WHERE gimnasio_id = $1 AND activo = true`, [gymId]
    );

    const reservasMes = await pool.query(
      `SELECT COUNT(*) FROM reservas
       WHERE gimnasio_id = $1 AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)`, [gymId]
    );

    res.json({
      gimnasio: gym.rows[0],
      stats: { ...stats.rows[0], reservas_mes: reservasMes.rows[0].count }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

// =============================================
// PLANES
// =============================================

const getPlanes = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM planes_plataforma WHERE activo = true ORDER BY id`);
    res.json({ planes: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

const actualizarPlan = async (req, res) => {
  const { planId } = req.params;
  const {
    precio_inicial, precio_mensual, max_clientes, descripcion,
    feature_rutinas, feature_profesores, feature_estadisticas, feature_logo_propio,
    feature_reservas, feature_pagos, feature_notificaciones,
    feature_pack_2dias, feature_pack_3dias, feature_pack_libre,
    feature_recuperos, feature_ausencias
  } = req.body;
  try {
    await pool.query(
      `UPDATE planes_plataforma SET
         precio_inicial = $1, precio_mensual = $2, max_clientes = $3, descripcion = $4,
         feature_rutinas = $5, feature_profesores = $6,
         feature_estadisticas = $7, feature_logo_propio = $8,
         feature_reservas = COALESCE($9, feature_reservas),
         feature_pagos = COALESCE($10, feature_pagos),
         feature_notificaciones = COALESCE($11, feature_notificaciones),
         feature_pack_2dias = COALESCE($12, feature_pack_2dias),
         feature_pack_3dias = COALESCE($13, feature_pack_3dias),
         feature_pack_libre = COALESCE($14, feature_pack_libre),
         feature_recuperos = COALESCE($15, feature_recuperos),
         feature_ausencias = COALESCE($16, feature_ausencias)
       WHERE id = $17`,
      [
        precio_inicial, precio_mensual, max_clientes, descripcion,
        feature_rutinas, feature_profesores, feature_estadisticas, feature_logo_propio,
        feature_reservas, feature_pagos, feature_notificaciones,
        feature_pack_2dias, feature_pack_3dias, feature_pack_libre,
        feature_recuperos, feature_ausencias,
        planId
      ]
    );
    res.json({ mensaje: 'Plan actualizado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
};

// =============================================
// STATS GENERALES
// =============================================

const getStats = async (req, res) => {
  try {
    const gyms = await pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE estado = 'activo') as activos FROM gimnasios`);
    const usuarios = await pool.query(`SELECT COUNT(*) as total FROM usuarios WHERE activo = true`);
    const solicitudes = await pool.query(`SELECT COUNT(*) as pendientes FROM solicitudes_gimnasio WHERE estado = 'pendiente'`);

    res.json({
      gimnasios_total: gyms.rows[0].total,
      gimnasios_activos: gyms.rows[0].activos,
      usuarios_total: usuarios.rows[0].total,
      solicitudes_pendientes: solicitudes.rows[0].pendientes
    });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};


const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.plan,
              u.telefono, u.bloqueado, u.activo, u.creado_en, u.gimnasio_id,
              g.nombre as gimnasio_nombre, g.slug as gimnasio_slug, g.color_primario
       FROM usuarios u
       JOIN gimnasios g ON g.id = u.gimnasio_id
       WHERE u.activo = true
       ORDER BY g.id, u.rol, u.nombre`
    );
    res.json({ usuarios: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

module.exports = {
  getGimnasios, getSolicitudesGimnasio, aprobarGimnasio, rechazarSolicitud,
  suspenderGimnasio, reactivarGimnasio, cambiarPlanGimnasio, getDetalleGimnasio,
  getPlanes, actualizarPlan, getStats, getUsuarios,
  crearGimnasio, crearUsuario, importarClientes
};

// =============================================
// CREAR GIMNASIO DIRECTO (sin solicitud)
// =============================================

async function crearGimnasio(req, res) {
  const { nombre, slug, email_contacto, nombre_contacto, password_admin, plan_id } = req.body;
  if (!nombre || !slug || !email_contacto) {
    return res.status(400).json({ error: 'Nombre, slug y email son obligatorios' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slugExiste = await client.query(`SELECT id FROM gimnasios WHERE slug = $1`, [slug]);
    if (slugExiste.rows.length > 0) return res.status(400).json({ error: 'Ese slug ya está en uso' });

    const gymResult = await client.query(
      `INSERT INTO gimnasios (slug, nombre, email_contacto, plan_id, estado, fecha_inicio)
       VALUES ($1, $2, $3, $4, 'activo', CURRENT_DATE) RETURNING *`,
      [slug, nombre, email_contacto, plan_id || 1]
    );
    const gym = gymResult.rows[0];

    await client.query(`INSERT INTO configuracion_gym (gimnasio_id) VALUES ($1)`, [gym.id]);

    const passAdmin = password_admin || 'Cambiar123!';
    const debecambiar = !password_admin; // Si no puso password, debe cambiarlo
    await client.query(
      `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, password_hash, rol, debe_cambiar_password)
       VALUES ($1, $2, 'Admin', $3, crypt($4, gen_salt('bf', 10)), 'admin_gym', $5)`,
      [gym.id, nombre_contacto || nombre, email_contacto, passAdmin, debecambiar]
    );

    await client.query('COMMIT');
    res.json({
      mensaje: `Gimnasio "${nombre}" creado correctamente.`,
      gym,
      credenciales: { email: email_contacto, password: passAdmin, url: `/gym/${slug}`, debe_cambiar: debecambiar }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al crear gimnasio' });
  } finally { client.release(); }
}

// =============================================
// CREAR USUARIO (admin_gym o cliente) desde superadmin
// =============================================

async function crearUsuario(req, res) {
  const { gimnasio_id, nombre, apellido, email, password, rol, plan, telefono } = req.body;
  if (!gimnasio_id || !email || !nombre) {
    return res.status(400).json({ error: 'Gimnasio, nombre y email son obligatorios' });
  }
  try {
    const existe = await pool.query(
      `SELECT id FROM usuarios WHERE email = $1 AND gimnasio_id = $2`, [email, gimnasio_id]
    );
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Ya existe un usuario con ese email en ese gimnasio' });

    const passReal = password || 'Cambiar123!';
    const debeChangePassword = !password;
    const result = await pool.query(
      `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, password_hash, rol, plan, telefono, debe_cambiar_password)
       VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), $6, $7, $8, $9)
       RETURNING id, nombre, apellido, email, rol, plan`,
      [gimnasio_id, nombre, apellido || '', email, passReal, rol || 'cliente', plan || null, telefono || null, debeChangePassword]
    );
    res.json({
      usuario: result.rows[0],
      credenciales: { email, password: passReal, debe_cambiar: debeChangePassword }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

// =============================================
// IMPORTAR CLIENTES EN MASA (CSV/JSON)
// =============================================

async function importarClientes(req, res) {
  const { gimnasio_id, clientes } = req.body;
  // clientes = [{ nombre, apellido, email, telefono, plan }]
  if (!gimnasio_id || !Array.isArray(clientes) || clientes.length === 0) {
    return res.status(400).json({ error: 'Se requiere gimnasio_id y array de clientes' });
  }
  const PASSWORD_TEMPORAL = 'Bienvenido1!';
  const resultados = { creados: 0, omitidos: 0, errores: [] };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of clientes) {
      if (!c.email || !c.nombre) {
        resultados.errores.push({ email: c.email || '(sin email)', razon: 'Faltan datos obligatorios' });
        resultados.omitidos++;
        continue;
      }
      const existe = await client.query(
        `SELECT id FROM usuarios WHERE email = $1 AND gimnasio_id = $2`, [c.email.trim(), gimnasio_id]
      );
      if (existe.rows.length > 0) {
        resultados.omitidos++;
        resultados.errores.push({ email: c.email, razon: 'Ya existe' });
        continue;
      }
      await client.query(
        `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, telefono, password_hash, rol, plan, activo, debe_cambiar_password)
         VALUES ($1, $2, $3, $4, $5, crypt($6, gen_salt('bf', 10)), 'cliente', $7, true, true)`,
        [gimnasio_id, c.nombre.trim(), (c.apellido || '').trim(), c.email.trim(), c.telefono || null, PASSWORD_TEMPORAL, c.plan || null]
      );
      resultados.creados++;
    }
    await client.query('COMMIT');
    res.json({
      ...resultados,
      password_temporal: PASSWORD_TEMPORAL,
      mensaje: `${resultados.creados} clientes importados. ${resultados.omitidos} omitidos.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al importar clientes' });
  } finally { client.release(); }
}