const pool = require('../config/db');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const gId = (req) => req.gimnasio?.id;

// ===================== RESERVAS =====================

const misReservas = async (req, res) => {
  const { mes, anio } = req.query;
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  const mesNum = parseInt(mes) || new Date().getMonth() + 1;
  const anioNum = parseInt(anio) || new Date().getFullYear();
  try {
    const result = await pool.query(
      `SELECT r.id, r.fecha, r.estado, r.creado_en,
              h.dia_semana, h.hora_inicio, h.hora_fin
       FROM reservas r
       JOIN horarios h ON r.horario_id = h.id
       WHERE r.usuario_id = $1 AND r.gimnasio_id = $2
         AND EXTRACT(MONTH FROM r.fecha) = $3
         AND EXTRACT(YEAR FROM r.fecha) = $4
       ORDER BY r.fecha, h.hora_inicio`,
      [usuarioId, gimnasioId, mesNum, anioNum]
    );
    res.json({ reservas: result.rows });
  } catch (error) {
    console.error('misReservas error:', error);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
};

const crearReserva = async (req, res) => {
  const { horario_id, fecha } = req.body;
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  try {
    if (req.usuario.bloqueado) return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contactá al gimnasio.' });

    // Obtener config del gym (defensivo - columnas pueden no existir aún)
    let cfg = { modo_acceso: 'horarios', sin_limite_personas: false, plan_libre: false };
    try {
      const cfgResult = await pool.query(
        `SELECT * FROM configuracion_gym WHERE gimnasio_id = $1`, [gimnasioId]
      );
      if (cfgResult.rows.length > 0) cfg = { ...cfg, ...cfgResult.rows[0] };
    } catch (e) { console.log('cfg query fallback:', e.message); }

    // Verificar límite semanal según el plan del USUARIO (no del gym)
    const planLimites = { '1_dia':1,'2_dias':2,'3_dias':3,'4_dias':4,'5_dias':5,'libre':9999 };
    const limite = planLimites[req.usuario.plan] || 3;
    if (limite < 9999) {
      const reservasSemana = await pool.query(
        `SELECT COUNT(*) FROM reservas 
         WHERE usuario_id=$1 AND gimnasio_id=$2 AND estado NOT IN ('cancelada')
           AND fecha >= ($3::date - EXTRACT(ISODOW FROM $3::date)::int + 1)
           AND fecha <= ($3::date - EXTRACT(ISODOW FROM $3::date)::int + 7)`,
        [usuarioId, gimnasioId, fecha]
      );
      if (parseInt(reservasSemana.rows[0].count) >= limite)
        return res.status(400).json({ error: `Ya tenés ${limite} clases reservadas para esa semana.` });
    }

    // Verificar capacidad
    if (!cfg.sin_limite_personas && horario_id) {
      const ocupacion = await pool.query(
        `SELECT COUNT(*) FROM reservas WHERE horario_id=$1 AND fecha=$2 AND estado!='cancelada'`,
        [horario_id, fecha]
      );
      const horario = await pool.query('SELECT capacidad_maxima FROM horarios WHERE id=$1 AND gimnasio_id=$2', [horario_id, gimnasioId]);
      if (!horario.rows[0]) return res.status(404).json({ error: 'Horario no encontrado' });
      if (parseInt(ocupacion.rows[0].count) >= horario.rows[0].capacidad_maxima)
        return res.status(400).json({ error: 'El turno ya está completo.' });
    }

    // Verificar que no tenga reserva ese día
    const reservaExistente = await pool.query(
      `SELECT id FROM reservas WHERE usuario_id=$1 AND fecha=$2 AND estado!='cancelada' AND gimnasio_id=$3`,
      [usuarioId, fecha, gimnasioId]
    );
    if (reservaExistente.rows.length > 0) return res.status(400).json({ error: 'Ya tenés una reserva para ese día.' });

    await pool.query(
      `INSERT INTO reservas (gimnasio_id, usuario_id, horario_id, fecha) VALUES ($1, $2, $3, $4)`,
      [gimnasioId, usuarioId, horario_id, fecha]
    );
    res.status(201).json({ mensaje: '✅ Reserva confirmada!' });
  } catch (error) {
    console.error('crearReserva error:', error);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
};

const cancelarReserva = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;
  try {
    const reserva = await pool.query('SELECT * FROM reservas WHERE id=$1 AND usuario_id=$2', [id, usuarioId]);
    if (reserva.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    const fechaReserva = new Date(reserva.rows[0].fecha);
    const horasRestantes = (fechaReserva - new Date()) / (1000 * 60 * 60);
    if (horasRestantes < 2) return res.status(400).json({ error: 'No podés cancelar con menos de 2 horas de anticipación.' });
    await pool.query("UPDATE reservas SET estado='cancelada' WHERE id=$1", [id]);
    res.json({ mensaje: 'Reserva cancelada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar' });
  }
};

const disponibilidad = async (req, res) => {
  const { fecha } = req.params;
  const gimnasioId = gId(req);
  try {
    const fechaObj = new Date(fecha + 'T00:00:00');
    const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const diaSemana = dias[fechaObj.getDay()];

    // Config defensiva
    let cfg = { modo_acceso: 'horarios', abierto_24h: false, dias_abierto: null, sin_limite_personas: false };
    try {
      const cfgResult = await pool.query('SELECT * FROM configuracion_gym WHERE gimnasio_id=$1', [gimnasioId]);
      if (cfgResult.rows.length > 0) cfg = { ...cfg, ...cfgResult.rows[0] };
    } catch (e) { console.log('cfg fallback:', e.message); }

    const diasAbierto = Array.isArray(cfg.dias_abierto) ? cfg.dias_abierto : ['lunes','martes','miercoles','jueves','viernes'];
    const estaAbierto = cfg.abierto_24h || diasAbierto.includes(diaSemana);

    if (!estaAbierto) {
      return res.json({ horarios:[], fecha, diaSemana, cerrado:true });
    }

    if (cfg.modo_acceso === 'libre') {
      return res.json({ horarios:[], fecha, diaSemana, modo_libre:true, abierto:true });
    }

    const result = await pool.query(
      `SELECT h.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.capacidad_maxima,
              COUNT(r.id) FILTER (WHERE r.estado!='cancelada') AS ocupados
       FROM horarios h
       LEFT JOIN reservas r ON r.horario_id=h.id AND r.fecha=$1
       WHERE h.dia_semana=$2 AND h.activo=true AND h.gimnasio_id=$3
       GROUP BY h.id ORDER BY h.hora_inicio`,
      [fecha, diaSemana, gimnasioId]
    );

    const horarios = result.rows.map(h => ({
      ...h,
      disponibles: cfg.sin_limite_personas ? 999 : (h.capacidad_maxima - parseInt(h.ocupados)),
      lleno: cfg.sin_limite_personas ? false : (parseInt(h.ocupados) >= h.capacidad_maxima)
    }));

    res.json({ horarios, fecha, diaSemana, modo_libre:false });
  } catch (error) {
    console.error('disponibilidad error:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
};

// ===================== PAGOS =====================

const getConfiguracion = async (req, res) => {
  const gimnasioId = gId(req);
  try {
    // Consulta defensiva — usa COALESCE para columnas que podrían no existir aún
    let config = {
      alias_transferencia: null, nombre_titular: null, banco: null,
      precio_1dia: null, precio_2dias: null, precio_3dias: null,
      planes_activos: ['2_dias','3_dias'], plan_libre: false,
      modo_acceso: 'horarios', sin_limite_personas: false
    };

    try {
      const result = await pool.query(
        `SELECT * FROM configuracion_gym WHERE gimnasio_id = $1`, [gimnasioId]
      );
      if (result.rows.length > 0) {
        config = { ...config, ...result.rows[0] };
      }
    } catch (dbErr) {
      console.error('configuracion_gym query error:', dbErr.message);
      // Intentar con columnas básicas si la tabla tiene esquema viejo
      try {
        const basic = await pool.query(
          `SELECT gimnasio_id FROM configuracion_gym WHERE gimnasio_id = $1`, [gimnasioId]
        );
        // tabla existe pero columnas nuevas no — devolver defaults
      } catch {}
    }

    // Normalizar para el cliente
    res.json({ config: {
      ...config,
      planes_activos: Array.isArray(config.planes_activos) ? config.planes_activos : ['2_dias','3_dias'],
      plan_libre: config.plan_libre || false,
      // aliases para compatibilidad
      precio_1_dia: config.precio_1dia,
      precio_2_dias: config.precio_2dias,
      precio_3_dias: config.precio_3dias,
    }});
  } catch (error) {
    console.error('getConfiguracion error:', error);
    // Fallback total — nunca devolver 500 en configuracion
    res.json({ config: {
      alias_transferencia: null, nombre_titular: null, banco: null,
      precio_1dia: null, precio_2dias: null, precio_3dias: null,
      planes_activos: ['2_dias','3_dias'], plan_libre: false,
    }});
  }
};

const solicitarPlan = async (req, res) => {
  const { plan } = req.body;
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  const archivo = req.file;

  if (!archivo) return res.status(400).json({ error: 'Debés subir el comprobante de transferencia' });

  const planesValidos = ['1_dia','2_dias','3_dias','4_dias','5_dias','libre'];
  if (!planesValidos.includes(plan)) return res.status(400).json({ error: 'Plan inválido' });

  try {
    // Check solicitud pendiente
    try {
      const pendiente = await pool.query(
        "SELECT id FROM solicitudes_pago WHERE usuario_id=$1 AND gimnasio_id=$2 AND estado='pendiente'",
        [usuarioId, gimnasioId]
      );
      if (pendiente.rows.length > 0) return res.status(400).json({ error: 'Ya tenés una solicitud pendiente de revisión.' });
    } catch (e) { console.log('pendiente check skip:', e.message); }

    // Obtener precio
    let monto = 0;
    try {
      const config = await pool.query('SELECT * FROM configuracion_gym WHERE gimnasio_id=$1 LIMIT 1', [gimnasioId]);
      const cfg = config.rows[0] || {};
      monto = plan === '1_dia' ? parseFloat(cfg.precio_1dia || 0)
        : plan === '2_dias' ? parseFloat(cfg.precio_2dias || 0)
        : parseFloat(cfg.precio_3dias || 0);
    } catch (e) { console.log('precio skip:', e.message); }

    // Subir a Cloudinary (si está configurado)
    let comprobanteUrl = null;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        comprobanteUrl = await new Promise((resolve, reject) => {
          const resourceType = archivo.mimetype === 'application/pdf' ? 'raw' : 'image';
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'tgb/comprobantes', resource_type: resourceType },
            (err, result) => err ? reject(err) : resolve(result.secure_url)
          );
          stream.end(archivo.buffer);
        });
      } catch (e) {
        console.error('Cloudinary upload error:', e.message);
        return res.status(500).json({ error: 'Error al subir el comprobante. Verificá la configuración de Cloudinary.' });
      }
    } else {
      // Sin Cloudinary — guardar base64 o simplemente marcar como recibido
      comprobanteUrl = `local:${Date.now()}`;
    }

    // Insertar solicitud
    await pool.query(
      `INSERT INTO solicitudes_pago (gimnasio_id, usuario_id, plan, monto, comprobante_url) VALUES ($1, $2, $3, $4, $5)`,
      [gimnasioId, usuarioId, plan, monto, comprobanteUrl]
    );

    // Actualizar plan del usuario
    try {
      await pool.query('UPDATE usuarios SET plan=$1 WHERE id=$2 AND gimnasio_id=$3', [plan, usuarioId, gimnasioId]);
    } catch (e) { console.log('update plan skip:', e.message); }

    // Notificación
    try {
      await pool.query(
        `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4, $5)`,
        [gimnasioId, usuarioId, '⏳ Comprobante recibido', 'Tu comprobante fue enviado. Te avisamos cuando sea aprobado.', 'info']
      );
    } catch (e) { console.log('notif skip:', e.message); }

    res.status(201).json({ mensaje: '✅ Comprobante enviado. El gimnasio lo revisará pronto.' });
  } catch (error) {
    console.error('solicitarPlan error:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud: ' + error.message });
  }
};

// ===================== RECUPERO =====================

const getMisAusencias = async (req, res) => {
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  try {
    const result = await pool.query(`
      SELECT r.id, r.fecha, h.dia_semana, h.hora_inicio, h.hora_fin,
             sr.id as recupero_id, sr.estado as recupero_estado
      FROM reservas r
      JOIN horarios h ON r.horario_id=h.id
      LEFT JOIN solicitudes_recupero sr ON sr.reserva_ausente_id=r.id
      WHERE r.usuario_id=$1 AND r.gimnasio_id=$2
        AND r.estado='ausente'
        AND r.fecha >= CURRENT_DATE - INTERVAL '14 days'
      ORDER BY r.fecha DESC
    `, [usuarioId, gimnasioId]);
    res.json({ ausencias: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ausencias' });
  }
};

const solicitarRecupero = async (req, res) => {
  const { reserva_ausente_id, horario_id, fecha_recupero } = req.body;
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  try {
    const reserva = await pool.query(
      "SELECT * FROM reservas WHERE id=$1 AND usuario_id=$2 AND estado='ausente' AND gimnasio_id=$3",
      [reserva_ausente_id, usuarioId, gimnasioId]
    );
    if (reserva.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

    await pool.query(
      `INSERT INTO solicitudes_recupero (gimnasio_id, usuario_id, reserva_ausente_id, horario_id, fecha_recupero) VALUES ($1, $2, $3, $4, $5)`,
      [gimnasioId, usuarioId, reserva_ausente_id, horario_id, fecha_recupero]
    );
    try {
      await pool.query(
        `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4, $5)`,
        [gimnasioId, usuarioId, '⏳ Recupero solicitado', 'Tu solicitud fue enviada.', 'info']
      );
    } catch {}
    res.status(201).json({ mensaje: '✅ Solicitud enviada.' });
  } catch (error) {
    console.error('solicitarRecupero error:', error);
    res.status(500).json({ error: 'Error al solicitar recupero' });
  }
};

// ===================== NOTIFICACIONES =====================

const getMisNotificaciones = async (req, res) => {
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  try {
    const result = await pool.query(
      'SELECT * FROM notificaciones WHERE usuario_id=$1 AND gimnasio_id=$2 ORDER BY creado_en DESC LIMIT 20',
      [usuarioId, gimnasioId]
    );
    await pool.query('UPDATE notificaciones SET leida=true WHERE usuario_id=$1 AND gimnasio_id=$2', [usuarioId, gimnasioId]);
    res.json({ notificaciones: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

const actualizarPerfil = async (req, res) => {
  const { nombre, apellido, telefono } = req.body;
  try {
    await pool.query(
      'UPDATE usuarios SET nombre=$1, apellido=$2, telefono=$3 WHERE id=$4',
      [nombre, apellido, telefono, req.usuario.id]
    );
    res.json({ mensaje: 'Perfil actualizado' });
  } catch { res.status(500).json({ error: 'Error' }); }
};

const getNotificacionesNoLeidas = async (req, res) => {
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notificaciones WHERE usuario_id=$1 AND gimnasio_id=$2 AND leida=false',
      [usuarioId, gimnasioId]
    );
    res.json({ cantidad: parseInt(result.rows[0].count) });
  } catch {
    res.json({ cantidad: 0 });
  }
};

const getMe = async (req, res) => {
  const usuarioId = req.usuario.id;
  const gimnasioId = gId(req);
  try {
    const result = await pool.query(
      `SELECT id, nombre, apellido, email, rol, plan, telefono, bloqueado, 
              fecha_vencimiento_pago, debe_cambiar_password
       FROM usuarios WHERE id = $1 AND gimnasio_id = $2`,
      [usuarioId, gimnasioId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

module.exports = {
  misReservas, crearReserva, cancelarReserva, disponibilidad,
  getConfiguracion, solicitarPlan,
  getMisAusencias, solicitarRecupero,
  getMisNotificaciones, getNotificacionesNoLeidas,
  actualizarPerfil, getMe
};