const pool = require('../config/db');

const gymId = (req) => req.gimnasio.id;

// =============================================
// CLIENTES
// =============================================

const getClientes = async (req, res) => {
  try {
    const { buscar, estado } = req.query;
    let whereExtra = '';
    const params = [gymId(req)];
    if (estado === 'bloqueado') { whereExtra += ' AND u.bloqueado = true'; }
    else if (estado === 'inactivo') { whereExtra += ' AND u.activo = false'; }
    else if (estado === 'activo') { whereExtra += ' AND u.activo = true AND u.bloqueado = false'; }
    else { whereExtra += ' AND u.activo = true'; } // por defecto mostrar activos
    if (buscar) {
      params.push(`%${buscar}%`);
      whereExtra += ` AND (u.nombre ILIKE $${params.length} OR u.apellido ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.plan, u.telefono,
              u.bloqueado, u.activo, u.creado_en, u.fecha_vencimiento_pago,
              pr.nombre as profesor_nombre, pr.apellido as profesor_apellido,
              sp.estado as pago_estado, sp.creado_en as ultimo_pago,
              CASE WHEN r.id IS NOT NULL THEN true ELSE false END as tiene_rutina,
              (SELECT COUNT(*) FROM reservas rv WHERE rv.usuario_id=u.id AND rv.gimnasio_id=$1
               AND EXTRACT(MONTH FROM rv.fecha)=EXTRACT(MONTH FROM CURRENT_DATE)
               AND EXTRACT(YEAR FROM rv.fecha)=EXTRACT(YEAR FROM CURRENT_DATE)
               AND rv.estado != 'cancelada') as reservas_mes
       FROM usuarios u
       LEFT JOIN profesor_alumnos pa ON pa.alumno_id = u.id AND pa.gimnasio_id = $1
       LEFT JOIN usuarios pr ON pr.id = pa.profesor_id
       LEFT JOIN LATERAL (
         SELECT estado, creado_en FROM solicitudes_pago
         WHERE usuario_id = u.id AND gimnasio_id = $1
         ORDER BY creado_en DESC LIMIT 1
       ) sp ON true
       LEFT JOIN LATERAL (
         SELECT id FROM rutinas
         WHERE usuario_id = u.id AND gimnasio_id = $1 AND estado = 'activa'
         LIMIT 1
       ) r ON true
       WHERE u.gimnasio_id = $1 AND u.rol = 'cliente'${whereExtra}
       ORDER BY u.creado_en DESC`,
      params
    );
    res.json({ clientes: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

const crearCliente = async (req, res) => {
  const { nombre, apellido, email, password, plan, telefono, profesor_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, password_hash, rol, plan, telefono)
       VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), 'cliente', $6, $7) RETURNING *`,
      [gymId(req), nombre, apellido, email, password || 'Cambiar123!', plan || '3_dias', telefono]
    );
    const nuevoCliente = result.rows[0];
    if (profesor_id) {
      await client.query(
        `INSERT INTO profesor_alumnos (gimnasio_id, profesor_id, alumno_id) VALUES ($1, $2, $3)`,
        [gymId(req), profesor_id, nuevoCliente.id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ cliente: nuevoCliente, mensaje: 'Cliente creado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(400).json({ error: 'Ya existe un cliente con ese email' });
    res.status(500).json({ error: 'Error al crear cliente' });
  } finally { client.release(); }
};

const actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, plan, telefono, bloqueado, profesor_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE usuarios SET nombre=$1, apellido=$2, plan=$3, telefono=$4, bloqueado=$5 WHERE id=$6 AND gimnasio_id=$7`,
      [nombre, apellido, plan, telefono, bloqueado, id, gymId(req)]
    );
    if (profesor_id !== undefined) {
      await client.query(`DELETE FROM profesor_alumnos WHERE alumno_id = $1 AND gimnasio_id = $2`, [id, gymId(req)]);
      if (profesor_id) {
        await client.query(
          `INSERT INTO profesor_alumnos (gimnasio_id, profesor_id, alumno_id) VALUES ($1, $2, $3)`,
          [gymId(req), profesor_id, id]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ mensaje: 'Cliente actualizado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar cliente' });
  } finally { client.release(); }
};

const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE usuarios SET activo = false WHERE id = $1 AND gimnasio_id = $2`, [id, gymId(req)]);
    res.json({ mensaje: 'Cliente eliminado.' });
  } catch { res.status(500).json({ error: 'Error' }); }
};

const toggleBloqueo = async (req, res) => {
  const { id } = req.params;
  const { bloqueado, motivo } = req.body;
  const gId = gymId(req);
  try {
    await pool.query('UPDATE usuarios SET bloqueado=$1 WHERE id=$2 AND gimnasio_id=$3', [bloqueado, id, gId]);
    const msg = bloqueado ? `Tu cuenta fue bloqueada. Motivo: ${motivo}` : 'Tu cuenta fue desbloqueada. Ya podés reservar tus turnos.';
    await pool.query(
      `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4, $5)`,
      [gId, id, bloqueado ? '🔒 Cuenta bloqueada' : '✅ Cuenta desbloqueada', msg, bloqueado ? 'error' : 'info']
    ).catch(() => {});
    res.json({ mensaje: `Cliente ${bloqueado ? 'bloqueado' : 'desbloqueado'}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
};

const actualizarPlan = async (req, res) => {
  const { id } = req.params;
  const { plan, fecha_vencimiento_pago } = req.body;
  const gId = gymId(req);
  try {
    await pool.query(
      'UPDATE usuarios SET plan=$1, fecha_vencimiento_pago=$2 WHERE id=$3 AND gimnasio_id=$4',
      [plan, fecha_vencimiento_pago || null, id, gId]
    );
    // Notificar al cliente del cambio de plan
    await pool.query(
      `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4, $5)`,
      [gId, id, '📋 Plan actualizado', `Tu plan fue actualizado a ${plan.replace('_',' ')}.`, 'info']
    ).catch(() => {});
    res.json({ mensaje: 'Plan actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  const gId = gymId(req);
  try {
    await pool.query('UPDATE usuarios SET activo=$1 WHERE id=$2 AND gimnasio_id=$3', [activo, id, gId]);
    const msg = activo ? 'Tu cuenta fue reactivada.' : 'Tu cuenta fue desactivada.';
    await pool.query(
      `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4, $5)`,
      [gId, id, activo ? '✅ Cuenta activada' : '⛔ Cuenta desactivada', msg, activo ? 'info' : 'error']
    ).catch(() => {});
    res.json({ mensaje: `Cliente ${activo ? 'activado' : 'desactivado'}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar' });
  }
};

// =============================================
// PROFESORES
// =============================================

const getProfesores = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.creado_en,
              COUNT(pa.alumno_id) as total_alumnos
       FROM usuarios u
       LEFT JOIN profesor_alumnos pa ON pa.profesor_id = u.id AND pa.gimnasio_id = $1
       WHERE u.gimnasio_id = $1 AND u.rol = 'profesor' AND u.activo = true
       GROUP BY u.id ORDER BY u.nombre`,
      [gymId(req)]
    );
    res.json({ profesores: result.rows });
  } catch { res.status(500).json({ error: 'Error al obtener profesores' }); }
};

const crearProfesor = async (req, res) => {
  const { nombre, apellido, email, password, telefono } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO usuarios (gimnasio_id, nombre, apellido, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), 'profesor', $6) RETURNING *`,
      [gymId(req), nombre, apellido, email, password || 'Cambiar123!', telefono]
    );
    res.status(201).json({ profesor: result.rows[0], mensaje: 'Profesor creado correctamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    res.status(500).json({ error: 'Error al crear profesor' });
  }
};

const getAlumnosDeProfesor = async (req, res) => {
  const { profesorId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.plan, u.bloqueado
       FROM profesor_alumnos pa JOIN usuarios u ON u.id = pa.alumno_id
       WHERE pa.profesor_id = $1 AND pa.gimnasio_id = $2 AND u.activo = true ORDER BY u.nombre`,
      [profesorId, gymId(req)]
    );
    res.json({ alumnos: result.rows });
  } catch { res.status(500).json({ error: 'Error' }); }
};

// =============================================
// CONFIGURACIÓN AMPLIADA DEL GYM
// =============================================

const getConfiguracion = async (req, res) => {
  const gId = gymId(req);
  try {
    const [cfgResult, horariosResult] = await Promise.all([
      pool.query(
        `SELECT c.*, g.nombre, g.slug, g.logo_url, g.color_primario
         FROM configuracion_gym c
         JOIN gimnasios g ON g.id = c.gimnasio_id
         WHERE c.gimnasio_id = $1`,
        [gId]
      ),
      pool.query(
        `SELECT id, dia_semana, hora_inicio, hora_fin, capacidad_maxima, activo
         FROM horarios WHERE gimnasio_id = $1 ORDER BY
           CASE dia_semana WHEN 'lunes' THEN 1 WHEN 'martes' THEN 2 WHEN 'miercoles' THEN 3
             WHEN 'jueves' THEN 4 WHEN 'viernes' THEN 5 WHEN 'sabado' THEN 6 WHEN 'domingo' THEN 7 END,
           hora_inicio`,
        [gId]
      )
    ]);
    res.json({ configuracion: cfgResult.rows[0] || {}, horarios: horariosResult.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

const actualizarConfiguracion = async (req, res) => {
  const {
    precio_1dia, precio_2dias, precio_3dias, precio_libre, texto_bienvenida,
    color_primario, descripcion, instagram, whatsapp,
    modo_acceso, capacidad_default, sin_limite_personas,
    planes_activos, plan_libre, alias_transferencia,
    nombre_titular, banco, abierto_24h, dias_abierto
  } = req.body;
  const gId = gymId(req);

  // Convertir strings vacíos a null para columnas numéricas
  const toNum = (v) => (v === '' || v === null || v === undefined) ? null : parseFloat(v);
  const toInt = (v) => (v === '' || v === null || v === undefined) ? null : parseInt(v);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Guardar configuración del gym
    await client.query(
      `INSERT INTO configuracion_gym (
        gimnasio_id, precio_1dia, precio_2dias, precio_3dias, precio_libre, texto_bienvenida,
        modo_acceso, capacidad_default, sin_limite_personas, planes_activos,
        plan_libre, alias_transferencia, nombre_titular, banco, abierto_24h, dias_abierto,
        descripcion, instagram, whatsapp
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (gimnasio_id) DO UPDATE SET
         precio_1dia=$2, precio_2dias=$3, precio_3dias=$4, precio_libre=$5, texto_bienvenida=$6,
         modo_acceso=$7, capacidad_default=$8, sin_limite_personas=$9, planes_activos=$10,
         plan_libre=$11, alias_transferencia=$12, nombre_titular=$13, banco=$14,
         abierto_24h=$15, dias_abierto=$16, descripcion=$17, instagram=$18, whatsapp=$19,
         actualizado_en=NOW()`,
      [
        gId,
        toNum(precio_1dia), toNum(precio_2dias), toNum(precio_3dias), toNum(precio_libre),
        texto_bienvenida || null,
        modo_acceso || 'horarios',
        toInt(capacidad_default) || 20,
        sin_limite_personas || false,
        planes_activos || ['2_dias','3_dias'],
        plan_libre || false,
        alias_transferencia || null, nombre_titular || null, banco || null,
        abierto_24h || false,
        dias_abierto || ['lunes','martes','miercoles','jueves','viernes'],
        descripcion || null, instagram || null, whatsapp || null
      ]
    );

    // Solo actualizar color_primario en gimnasios (columna que sí existe)
    if (color_primario) {
      await client.query(
        `UPDATE gimnasios SET color_primario = $1 WHERE id = $2`,
        [color_primario, gId]
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Configuración actualizada correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  } finally { client.release(); }
};

// =============================================
// HORARIOS
// =============================================

const getHorarios = async (req, res) => {
  const gId = gymId(req);
  try {
    const result = await pool.query(
      `SELECT id, dia_semana, hora_inicio, hora_fin, capacidad_maxima, activo
       FROM horarios WHERE gimnasio_id = $1
       ORDER BY CASE dia_semana
         WHEN 'lunes' THEN 1 WHEN 'martes' THEN 2 WHEN 'miercoles' THEN 3
         WHEN 'jueves' THEN 4 WHEN 'viernes' THEN 5 WHEN 'sabado' THEN 6 WHEN 'domingo' THEN 7
       END, hora_inicio`,
      [gId]
    );
    res.json({ horarios: result.rows });
  } catch { res.status(500).json({ error: 'Error al obtener horarios' }); }
};

const crearHorario = async (req, res) => {
  const { dia_semana, hora_inicio, hora_fin, capacidad_maxima } = req.body;
  const gId = gymId(req);
  try {
    const result = await pool.query(
      `INSERT INTO horarios (gimnasio_id, dia_semana, hora_inicio, hora_fin, capacidad_maxima)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [gId, dia_semana, hora_inicio, hora_fin, capacidad_maxima || 20]
    );
    res.status(201).json({ horario: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear horario' });
  }
};

const actualizarHorario = async (req, res) => {
  const { id } = req.params;
  const { dia_semana, hora_inicio, hora_fin, capacidad_maxima, activo } = req.body;
  const gId = gymId(req);
  try {
    await pool.query(
      `UPDATE horarios SET dia_semana=$1, hora_inicio=$2, hora_fin=$3,
       capacidad_maxima=$4, activo=$5 WHERE id=$6 AND gimnasio_id=$7`,
      [dia_semana, hora_inicio, hora_fin, capacidad_maxima, activo, id, gId]
    );
    res.json({ mensaje: 'Horario actualizado' });
  } catch { res.status(500).json({ error: 'Error al actualizar horario' }); }
};

const eliminarHorario = async (req, res) => {
  const { id } = req.params;
  const gId = gymId(req);
  try {
    await pool.query(`DELETE FROM horarios WHERE id=$1 AND gimnasio_id=$2`, [id, gId]);
    res.json({ mensaje: 'Horario eliminado' });
  } catch { res.status(500).json({ error: 'Error al eliminar horario' }); }
};

const bulkHorarios = async (req, res) => {
  const { slots } = req.body; // [{ dia_semana, hora_inicio, hora_fin, capacidad_maxima }]
  const gId = gymId(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Borrar todos los horarios actuales del gym
    await client.query('DELETE FROM horarios WHERE gimnasio_id=$1', [gId]);
    // Insertar los nuevos
    if (slots && slots.length > 0) {
      const values = slots.map((s, i) => {
        const base = i * 4;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5})`;
      }).join(',');
      const params = slots.flatMap(s => [gId, s.dia_semana, s.hora_inicio, s.hora_fin, s.capacidad_maxima || 20]);
      await client.query(
        `INSERT INTO horarios (gimnasio_id, dia_semana, hora_inicio, hora_fin, capacidad_maxima) VALUES ${values}`,
        params
      );
    }
    await client.query('COMMIT');
    res.json({ mensaje: `${slots?.length || 0} horarios guardados`, total: slots?.length || 0 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al guardar horarios' });
  } finally { client.release(); }
};

// =============================================
// DASHBOARD STATS
// =============================================

const getDashboard = async (req, res) => {
  const gId = gymId(req);
  try {
    const [clientes, reservasSemana, pagosPendientes, notifSinLeer] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM usuarios WHERE gimnasio_id=$1 AND rol='cliente' AND activo=true`, [gId]),
      pool.query(`SELECT COUNT(*) FROM reservas WHERE gimnasio_id=$1 AND fecha >= CURRENT_DATE AND fecha <= CURRENT_DATE + INTERVAL '7 days'`, [gId]),
      pool.query(`SELECT COUNT(*) FROM solicitudes_pago WHERE gimnasio_id=$1 AND estado='pendiente'`, [gId]),
      pool.query(`SELECT COUNT(*) FROM notificaciones WHERE gimnasio_id=$1 AND leida=false`, [gId])
    ]);
    const reservasHoy = await pool.query(`SELECT COUNT(*) FROM reservas WHERE gimnasio_id=$1 AND fecha=CURRENT_DATE`, [gId]);
    const graficSemana = await pool.query(
      `SELECT TO_CHAR(fecha,'Dy') as dia, COUNT(*) as cantidad FROM reservas
       WHERE gimnasio_id=$1 AND fecha >= CURRENT_DATE - INTERVAL '6 days' AND fecha <= CURRENT_DATE
       GROUP BY fecha, TO_CHAR(fecha,'Dy') ORDER BY fecha`, [gId]
    );
    const turnosHoy = await pool.query(
      `SELECT r.id, r.estado, u.nombre, u.apellido, h.hora_inicio, h.hora_fin
       FROM reservas r JOIN usuarios u ON u.id = r.usuario_id JOIN horarios h ON h.id = r.horario_id
       WHERE r.gimnasio_id=$1 AND r.fecha=CURRENT_DATE ORDER BY h.hora_inicio`, [gId]
    );
    const clientesRecientes = await pool.query(
      `SELECT nombre, apellido, email, plan, creado_en FROM usuarios
       WHERE gimnasio_id=$1 AND rol='cliente' AND activo=true ORDER BY creado_en DESC LIMIT 5`, [gId]
    );
    const pagosDetalle = await pool.query(
      `SELECT sp.id, sp.plan, sp.monto, sp.estado, sp.creado_en, sp.comprobante_url,
              u.nombre, u.apellido, u.email
       FROM solicitudes_pago sp JOIN usuarios u ON u.id = sp.usuario_id
       WHERE sp.gimnasio_id=$1 AND sp.estado='pendiente' ORDER BY sp.creado_en DESC`, [gId]
    );
    res.json({
      stats: {
        clientes: parseInt(clientes.rows[0].count),
        reservas_hoy: parseInt(reservasHoy.rows[0].count),
        reservas_semana: parseInt(reservasSemana.rows[0].count),
        pagos_pendientes: parseInt(pagosPendientes.rows[0].count),
        notificaciones_sin_leer: parseInt(notifSinLeer.rows[0].count)
      },
      clientes_recientes: clientesRecientes.rows,
      reservasSemana: graficSemana.rows,
      turnosHoy: turnosHoy.rows,
      pagos_pendientes: pagosDetalle.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

const gestionarPago = async (req, res) => {
  const { pagoId } = req.params;
  const { accion } = req.body;
  const gId = gymId(req);
  try {
    await pool.query(`UPDATE solicitudes_pago SET estado=$1 WHERE id=$2 AND gimnasio_id=$3`, [accion, pagoId, gId]);
    res.json({ mensaje: `Pago ${accion}` });
  } catch { res.status(500).json({ error: 'Error' }); }
};

// =============================================
// TURNOS
// =============================================

const getTurnos = async (req, res) => {
  const gId = gymId(req);
  const { fecha, estado } = req.query;
  try {
    let q = `SELECT r.id, r.fecha, r.estado, u.nombre, u.apellido, u.email,
              h.hora_inicio, h.hora_fin, h.dia_semana
             FROM reservas r
             JOIN usuarios u ON u.id = r.usuario_id
             JOIN horarios h ON h.id = r.horario_id
             WHERE r.gimnasio_id = $1`;
    const params = [gId];
    if (fecha) { params.push(fecha); q += ` AND r.fecha = $${params.length}`; }
    else { q += ` AND r.fecha = CURRENT_DATE`; }
    if (estado) { params.push(estado); q += ` AND r.estado = $${params.length}`; }
    q += ` ORDER BY h.hora_inicio, u.apellido`;
    const result = await pool.query(q, params);
    res.json({ turnos: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error' }); }
};

const marcarAsistencia = async (req, res) => {
  const { reservaId } = req.params;
  const { estado } = req.body;
  const gId = gymId(req);
  try {
    await pool.query(`UPDATE reservas SET estado=$1 WHERE id=$2 AND gimnasio_id=$3`, [estado, reservaId, gId]);
    res.json({ mensaje: 'Asistencia actualizada' });
  } catch { res.status(500).json({ error: 'Error' }); }
};

// =============================================
// PAGOS / COMPROBANTES / RECUPEROS
// =============================================

const getSolicitudesPago = async (req, res) => {
  const gId = gymId(req);
  const { estado } = req.query;
  try {
    let q = `SELECT sp.*, u.nombre, u.apellido, u.email FROM solicitudes_pago sp
             JOIN usuarios u ON u.id = sp.usuario_id WHERE sp.gimnasio_id = $1`;
    const params = [gId];
    if (estado) { params.push(estado); q += ` AND sp.estado = $${params.length}`; }
    q += ` ORDER BY sp.creado_en DESC`;
    const result = await pool.query(q, params);
    res.json({ solicitudes: result.rows });
  } catch { res.status(500).json({ error: 'Error' }); }
};

const gestionarSolicitudPago = async (req, res) => {
  const { solicitudId } = req.params;
  const { estado, notas } = req.body;
  const gId = gymId(req);
  try {
    // Si aprobado, activar el plan del usuario
    if (estado === 'aprobado') {
      const solicitud = await pool.query('SELECT * FROM solicitudes_pago WHERE id=$1', [solicitudId]);
      if (solicitud.rows[0]) {
        const { usuario_id, plan } = solicitud.rows[0];
        const venc = new Date(); venc.setMonth(venc.getMonth() + 1);
        await pool.query(
          `UPDATE usuarios SET plan=$1, bloqueado=false, fecha_vencimiento_pago=$2 WHERE id=$3 AND gimnasio_id=$4`,
          [plan, venc.toISOString().split('T')[0], usuario_id, gId]
        );
        await pool.query(
          `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1,$2,$3,$4,$5)`,
          [gId, usuario_id, '✅ Plan aprobado!', `Tu plan fue aprobado. Ya podés reservar tus turnos.`, 'info']
        ).catch(() => {});
      }
    }
    if (estado === 'rechazado') {
      const solicitud = await pool.query('SELECT usuario_id FROM solicitudes_pago WHERE id=$1', [solicitudId]);
      if (solicitud.rows[0]) {
        await pool.query(
          `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1,$2,$3,$4,$5)`,
          [gId, solicitud.rows[0].usuario_id, '❌ Comprobante rechazado', notas || 'Tu comprobante fue rechazado. Revisá los datos y volvé a intentar.', 'error']
        ).catch(() => {});
      }
    }
    await pool.query(
      `UPDATE solicitudes_pago SET estado=$1, notas_admin=$2 WHERE id=$3 AND gimnasio_id=$4`,
      [estado, notas, solicitudId, gId]
    );
    res.json({ mensaje: 'Actualizado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error' }); }
};

const getSolicitudesRecupero = async (req, res) => {
  const gId = gymId(req);
  const { estado } = req.query;
  try {
    let q = `SELECT sr.*, u.nombre, u.apellido, u.email FROM solicitudes_recupero sr
             JOIN usuarios u ON u.id = sr.usuario_id WHERE sr.gimnasio_id = $1`;
    const params = [gId];
    if (estado) { params.push(estado); q += ` AND sr.estado = $${params.length}`; }
    q += ` ORDER BY sr.creado_en DESC`;
    const result = await pool.query(q, params);
    res.json({ solicitudes: result.rows });
  } catch { res.status(500).json({ error: 'Error' }); }
};

const gestionarRecupero = async (req, res) => {
  const { recuperoId } = req.params;
  const { estado, notas } = req.body;
  const gId = gymId(req);
  try {
    if (estado === 'aprobado') {
      const sol = await pool.query('SELECT * FROM solicitudes_recupero WHERE id=$1', [recuperoId]);
      if (sol.rows[0]) {
        const { usuario_id, horario_id, fecha_recupero } = sol.rows[0];
        await pool.query(
          `INSERT INTO reservas (gimnasio_id, usuario_id, horario_id, fecha, estado)
           VALUES ($1,$2,$3,$4,'confirmada') ON CONFLICT DO NOTHING`,
          [gId, usuario_id, horario_id, fecha_recupero]
        );
        await pool.query(
          `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1,$2,$3,$4,$5)`,
          [gId, usuario_id, '✅ Recupero aprobado!', 'Tu recupero fue aprobado. Tenés tu turno reservado.', 'info']
        ).catch(() => {});
      }
    }
    await pool.query(
      `UPDATE solicitudes_recupero SET estado=$1, notas_admin=$2 WHERE id=$3 AND gimnasio_id=$4`,
      [estado, notas, recuperoId, gId]
    );
    res.json({ mensaje: 'Actualizado' });
  } catch { res.status(500).json({ error: 'Error' }); }
};

module.exports = {
  getClientes, crearCliente, actualizarCliente, eliminarCliente,
  toggleBloqueo, actualizarPlan, toggleActivo,
  getProfesores, crearProfesor, getAlumnosDeProfesor,
  getConfiguracion, actualizarConfiguracion,
  getHorarios, crearHorario, actualizarHorario, eliminarHorario, bulkHorarios,
  getDashboard, gestionarPago,
  getTurnos, marcarAsistencia,
  getSolicitudesPago, gestionarSolicitudPago,
  getSolicitudesRecupero, gestionarRecupero
};