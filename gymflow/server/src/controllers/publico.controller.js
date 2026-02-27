const pool = require('../config/db');

// Info pública completa de un gimnasio (para su landing page)
const getInfoGym = async (req, res) => {
  const { gymSlug } = req.params;
  try {
    const result = await pool.query(
      `SELECT g.id, g.slug, g.nombre, g.logo_url, g.color_primario, g.estado,
              c.descripcion, c.instagram, c.whatsapp,
              c.precio_1dia, c.precio_2dias, c.precio_3dias,
              c.texto_bienvenida, c.alias_transferencia, c.nombre_titular, c.banco,
              c.modo_acceso, c.planes_activos, c.plan_libre,
              c.sin_limite_personas, c.capacidad_default, c.abierto_24h,
              pp.feature_reservas, pp.feature_rutinas, pp.nombre as plan_nombre
       FROM gimnasios g
       LEFT JOIN configuracion_gym c ON c.gimnasio_id = g.id
       LEFT JOIN planes_plataforma pp ON g.plan_id = pp.id
       WHERE g.slug = $1`,
      [gymSlug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Gimnasio no encontrado' });
    if (result.rows[0].estado !== 'activo') return res.status(403).json({ error: 'Gimnasio no disponible', estado: result.rows[0].estado });
    res.json({ gym: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error' });
  }
};

// Solicitud de registro de nuevo gimnasio
const solicitarRegistroGym = async (req, res) => {
  const { nombre_gym, slug_deseado, nombre_contacto, email_contacto, telefono, plan_solicitado, mensaje } = req.body;
  try {
    const slugExiste = await pool.query(`SELECT id FROM gimnasios WHERE slug = $1`, [slug_deseado]);
    if (slugExiste.rows.length > 0) return res.status(400).json({ error: 'Ese nombre ya está en uso, elegí otro' });
    const solExiste = await pool.query(
      `SELECT id FROM solicitudes_gimnasio WHERE slug_deseado = $1 AND estado = 'pendiente'`, [slug_deseado]
    );
    if (solExiste.rows.length > 0) return res.status(400).json({ error: 'Ya hay una solicitud pendiente con ese nombre' });
    await pool.query(
      `INSERT INTO solicitudes_gimnasio (nombre_gym, slug_deseado, nombre_contacto, email_contacto, telefono, plan_solicitado, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nombre_gym, slug_deseado, nombre_contacto, email_contacto, telefono, plan_solicitado, mensaje]
    );
    res.status(201).json({ mensaje: 'Solicitud enviada correctamente. Te contactaremos pronto.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
};

module.exports = { getInfoGym, solicitarRegistroGym };