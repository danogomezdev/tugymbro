const pool = require('../config/db');

const gId = (req) => req.gimnasio?.id;
const userId = (req) => req.usuario?.id;
const esAdmin = (req) => req.usuario?.rol === 'admin_gym';

// =============================================
// CATÁLOGO DE EJERCICIOS
// =============================================

const getCatalogo = async (req, res) => {
  try {
    const gimnasioId = req.gimnasio?.id;
    const result = await pool.query(
      `SELECT * FROM ejercicios_catalogo 
       WHERE (gimnasio_id = $1 OR gimnasio_id IS NULL)
       ORDER BY grupo_muscular, nombre`,
      [gimnasioId]
    );
    res.json({ ejercicios: result.rows });
  } catch (error) {
    console.error('getCatalogo error:', error);
    res.status(500).json({ error: 'Error al obtener catálogo' });
  }
};

const crearEjercicioCatalogo = async (req, res) => {
  const { nombre, descripcion, grupo_muscular } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ejercicios_catalogo (nombre, descripcion, grupo_muscular)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, descripcion, grupo_muscular]
    );
    res.status(201).json({ ejercicio: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Ya existe ese ejercicio' });
    res.status(500).json({ error: 'Error al crear ejercicio' });
  }
};

const toggleEjercicioCatalogo = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE ejercicios_catalogo SET activo = NOT activo WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ejercicio: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ejercicio' });
  }
};

// =============================================
// ADMIN - Gestión de rutinas
// =============================================

const getRutinaCliente = async (req, res) => {
  const { usuarioId } = req.params;
  const gimnasioId = gId(req);
  try {
    // Rutina activa
    const rutinaActiva = await pool.query(
      `SELECT r.*, u.nombre, u.apellido, u.email, u.plan
       FROM rutinas r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id = $1 AND r.estado = 'activa' AND r.gimnasio_id = $2
       ORDER BY r.creado_en DESC LIMIT 1`,
      [usuarioId, gimnasioId]
    );

    // Historial de rutinas archivadas
    const historialRutinas = await pool.query(
      `SELECT id, nombre, descripcion, fecha_inicio, fecha_fin, creado_en
       FROM rutinas
       WHERE usuario_id = $1 AND gimnasio_id = $2 AND estado = 'archivada'
       ORDER BY fecha_fin DESC`,
      [usuarioId, gimnasioId]
    );

    if (rutinaActiva.rows.length === 0) {
      const usuario = await pool.query(
        'SELECT nombre, apellido, email, plan FROM usuarios WHERE id = $1', [usuarioId]
      );
      return res.json({ rutina: null, cliente: usuario.rows[0] || null, historialRutinas: historialRutinas.rows });
    }

    const ejercicios = await pool.query(
      `SELECT re.*, ec.grupo_muscular
       FROM rutina_ejercicios re
       LEFT JOIN ejercicios_catalogo ec ON re.catalogo_id = ec.id
       WHERE re.rutina_id = $1
       ORDER BY re.dia_numero, re.orden, re.id`,
      [rutinaActiva.rows[0].id]
    );

    const diasMap = {};
    ejercicios.rows.forEach(e => {
      const dia = e.dia_numero || 1;
      if (!diasMap[dia]) diasMap[dia] = [];
      diasMap[dia].push(e);
    });

    res.json({
      rutina: {
        ...rutinaActiva.rows[0],
        dias: diasMap,
        cliente: {
          nombre: rutinaActiva.rows[0].nombre,
          apellido: rutinaActiva.rows[0].apellido,
          email: rutinaActiva.rows[0].email,
          plan: rutinaActiva.rows[0].plan
        }
      },
      historialRutinas: historialRutinas.rows
    });
  } catch (error) {
    console.error('Error obteniendo rutina:', error);
    res.status(500).json({ error: 'Error al obtener rutina' });
  }
};

const guardarRutina = async (req, res) => {
  const { usuarioId } = req.params;
  const { nombre, descripcion, dias, nueva_rutina } = req.body;
  // nueva_rutina=true => archivar la actual y crear nueva
  // nueva_rutina=false => editar la rutina activa actual
  const adminId = req.usuario.id;

  const client = await pool.connect();
  const gymId = gId(req);
  try {
    await client.query('BEGIN');

    let rutinaId;

    if (nueva_rutina) {
      // Archivar rutina activa anterior
      await client.query(
        `UPDATE rutinas SET estado = 'archivada', fecha_fin = CURRENT_DATE
         WHERE usuario_id = $1 AND gimnasio_id = $2 AND estado = 'activa'`,
        [usuarioId, gymId]
      );
      // Crear nueva rutina activa
      const rutinaResult = await client.query(
        `INSERT INTO rutinas (gimnasio_id, usuario_id, nombre, descripcion, estado, fecha_inicio)
         VALUES ($1, $2, $3, $4, 'activa', CURRENT_DATE)
         RETURNING id`,
        [gymId, usuarioId, nombre || 'Mi Rutina', descripcion]
      );
      rutinaId = rutinaResult.rows[0].id;
    } else {
      // Editar rutina activa existente
      const existing = await client.query(
        `SELECT id FROM rutinas WHERE usuario_id = $1 AND gimnasio_id = $2 AND estado = 'activa' ORDER BY creado_en DESC LIMIT 1`,
        [usuarioId, gymId]
      );
      if (existing.rows.length > 0) {
        rutinaId = existing.rows[0].id;
        await client.query(
          `UPDATE rutinas SET nombre = $1, descripcion = $2 WHERE id = $3`,
          [nombre || 'Mi Rutina', descripcion, rutinaId]
        );
      } else {
        // No tiene rutina activa, crear una nueva
        const rutinaResult = await client.query(
          `INSERT INTO rutinas (gimnasio_id, usuario_id, nombre, descripcion, estado, fecha_inicio)
           VALUES ($1, $2, $3, $4, 'activa', CURRENT_DATE)
           RETURNING id`,
          [gymId, usuarioId, nombre || 'Mi Rutina', descripcion]
        );
        rutinaId = rutinaResult.rows[0].id;
      }
    }

    for (const [diaNum, ejercicios] of Object.entries(dias)) {
      for (let i = 0; i < ejercicios.length; i++) {
        const { catalogo_id, nombre: ejNombre, series, repeticiones, peso_kg, peso_fijo, notas, unidad_reps } = ejercicios[i];
        await client.query(
          `INSERT INTO rutina_ejercicios (rutina_id, gimnasio_id, catalogo_id, nombre, series, repeticiones, peso_kg, peso_fijo, notas, orden, dia_numero, unidad_reps)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [rutinaId, gymId, catalogo_id || null, ejNombre, series || 3, repeticiones || 10, peso_kg || null, peso_fijo || false, notas || null, i, parseInt(diaNum), unidad_reps || 'reps']
        );
      }
    }

    await client.query('COMMIT');

    const notifMsg = nueva_rutina
      ? 'El admin te asignó una nueva rutina de entrenamiento. ¡A entrenar!'
      : 'El admin actualizó tu rutina de entrenamiento.';
    await pool.query(
      `INSERT INTO notificaciones (gimnasio_id, usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4, $5)`,
      [gymId, usuarioId, nueva_rutina ? '💪 Nueva rutina asignada' : '📝 Rutina actualizada', notifMsg, 'info']
    );

    res.json({ mensaje: 'Rutina guardada correctamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error guardando rutina:', error);
    res.status(500).json({ error: 'Error al guardar rutina' });
  } finally {
    client.release();
  }
};

// Obtener ejercicios de una rutina archivada (para vista historial)
const getRutinaArchivada = async (req, res) => {
  const { rutinaId } = req.params;
  const adminId = req.usuario.id;
  try {
    const rutina = await pool.query(`SELECT * FROM rutinas WHERE id = $1`, [rutinaId]);
    if (rutina.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    const ejercicios = await pool.query(
      `SELECT re.* FROM rutina_ejercicios re WHERE re.rutina_id = $1 ORDER BY re.dia_numero, re.orden`,
      [rutinaId]
    );

    const diasMap = {};
    ejercicios.rows.forEach(e => {
      const dia = e.dia_numero || 1;
      if (!diasMap[dia]) diasMap[dia] = [];
      diasMap[dia].push(e);
    });

    res.json({ rutina: { ...rutina.rows[0], dias: diasMap } });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rutina archivada' });
  }
};

const getHistorialCliente = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const sesiones = await pool.query(
      `SELECT s.id, s.fecha, s.completada, s.dia_rutina,
              COUNT(se.id) as total_ejercicios,
              COUNT(se.id) FILTER (WHERE se.completado = true) as completados
       FROM sesiones_entrenamiento s
       LEFT JOIN sesion_ejercicios se ON se.sesion_id = s.id
       WHERE s.usuario_id = $1
       GROUP BY s.id
       ORDER BY s.fecha DESC
       LIMIT 30`,
      [usuarioId]
    );
    res.json({ sesiones: sesiones.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// =============================================
// CLIENTE
// =============================================

const getMiRutina = async (req, res) => {
  const usuarioId = req.usuario.id;
  try {
    // Rutina activa
    const rutina = await pool.query(
      `SELECT r.* FROM rutinas r
       WHERE r.usuario_id = $1 AND r.estado = 'activa'
       ORDER BY r.creado_en DESC LIMIT 1`,
      [usuarioId]
    );

    // Historial de rutinas anteriores
    const historialRutinas = await pool.query(
      `SELECT id, nombre, fecha_inicio, fecha_fin FROM rutinas
       WHERE usuario_id = $1 AND gimnasio_id = $2 AND estado = 'archivada'
       ORDER BY fecha_fin DESC`,
      [usuarioId, gId(req)]
    );

    if (rutina.rows.length === 0) return res.json({ rutina: null, historialRutinas: historialRutinas.rows });

    const ejercicios = await pool.query(
      `SELECT re.*, ec.grupo_muscular
       FROM rutina_ejercicios re
       LEFT JOIN ejercicios_catalogo ec ON re.catalogo_id = ec.id
       WHERE re.rutina_id = $1
       ORDER BY re.dia_numero, re.orden, re.id`,
      [rutina.rows[0].id]
    );

    const diasMap = {};
    ejercicios.rows.forEach(e => {
      const dia = e.dia_numero || 1;
      if (!diasMap[dia]) diasMap[dia] = [];
      diasMap[dia].push(e);
    });

    // Historial de pesos por ejercicio
    const progreso = await pool.query(
      `SELECT se.nombre_ejercicio, se.peso_usado, s.fecha
       FROM sesion_ejercicios se
       JOIN sesiones_entrenamiento s ON se.sesion_id = s.id
       WHERE s.usuario_id = $1 AND se.completado = true AND se.peso_usado IS NOT NULL
       ORDER BY se.nombre_ejercicio, s.fecha DESC`,
      [usuarioId]
    );

    const progresoMap = {};
    progreso.rows.forEach(p => {
      if (!progresoMap[p.nombre_ejercicio]) progresoMap[p.nombre_ejercicio] = [];
      if (progresoMap[p.nombre_ejercicio].length < 10)
        progresoMap[p.nombre_ejercicio].push({ peso: p.peso_usado, fecha: p.fecha });
    });

    Object.values(diasMap).forEach(ejs => {
      ejs.forEach(e => { e.historial_pesos = progresoMap[e.nombre] || []; });
    });

    res.json({ rutina: { ...rutina.rows[0], dias: diasMap }, historialRutinas: historialRutinas.rows });
  } catch (error) {
    console.error('Error obteniendo rutina:', error);
    res.status(500).json({ error: 'Error al obtener rutina' });
  }
};

// Cliente: ver ejercicios de una rutina archivada
const getMiRutinaArchivada = async (req, res) => {
  const { rutinaId } = req.params;
  const usuarioId = req.usuario.id;
  try {
    const rutina = await pool.query(
      `SELECT * FROM rutinas WHERE id = $1 AND usuario_id = $2`,
      [rutinaId, usuarioId]
    );
    if (rutina.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    const ejercicios = await pool.query(
      `SELECT re.* FROM rutina_ejercicios re WHERE re.rutina_id = $1 ORDER BY re.dia_numero, re.orden`,
      [rutinaId]
    );

    const diasMap = {};
    ejercicios.rows.forEach(e => {
      const dia = e.dia_numero || 1;
      if (!diasMap[dia]) diasMap[dia] = [];
      diasMap[dia].push(e);
    });

    res.json({ rutina: { ...rutina.rows[0], dias: diasMap } });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rutina' });
  }
};

const iniciarSesion = async (req, res) => {
  const usuarioId = req.usuario.id;
  const hoy = new Date().toISOString().split('T')[0];

  try {
    const sesionExistente = await pool.query(
      `SELECT s.*,
        json_agg(json_build_object(
          'id', se.id, 'ejercicio_id', se.ejercicio_id,
          'completado', se.completado, 'peso_usado', se.peso_usado,
          'nombre_ejercicio', se.nombre_ejercicio,
          'series_realizadas', se.series_realizadas,
          'repeticiones_realizadas', se.repeticiones_realizadas
        ) ORDER BY re.orden) as ejercicios_estado
       FROM sesiones_entrenamiento s
       LEFT JOIN sesion_ejercicios se ON se.sesion_id = s.id
       LEFT JOIN rutina_ejercicios re ON se.ejercicio_id = re.id
       WHERE s.usuario_id = $1 AND s.fecha = $2
       GROUP BY s.id`,
      [usuarioId, hoy]
    );

    if (sesionExistente.rows.length > 0) {
      return res.json({ sesion: sesionExistente.rows[0], nueva: false });
    }

    // Calcular qué día de rutina le toca esta semana
    const sesionesSemana = await pool.query(
      `SELECT COUNT(*) FROM sesiones_entrenamiento
       WHERE usuario_id = $1
         AND fecha >= ($2::date - EXTRACT(ISODOW FROM $2::date)::int + 1)
         AND fecha <= ($2::date - EXTRACT(ISODOW FROM $2::date)::int + 7)`,
      [usuarioId, hoy]
    );

    // Obtener plan del usuario para saber cuántos días tiene
    const usuarioData = await pool.query('SELECT plan FROM usuarios WHERE id = $1', [usuarioId]);
    const planDias = { '1_dia': 1, '2_dias': 2, '3_dias': 3 };
    const maxDias = planDias[usuarioData.rows[0]?.plan] || 3;
    const diaRutina = (parseInt(sesionesSemana.rows[0].count) % maxDias) + 1;

    const rutina = await pool.query(
      `SELECT r.id FROM rutinas r WHERE r.usuario_id = $1 AND r.estado = 'activa' ORDER BY r.creado_en DESC LIMIT 1`,
      [usuarioId]
    );
    if (rutina.rows.length === 0) return res.status(404).json({ error: 'No tenés rutina asignada todavía.' });

    const ejercicios = await pool.query(
      `SELECT re.* FROM rutina_ejercicios re
       WHERE re.rutina_id = $1 AND re.dia_numero = $2
       ORDER BY re.orden, re.id`,
      [rutina.rows[0].id, diaRutina]
    );

    const ejerciciosFinales = ejercicios.rows.length > 0
      ? ejercicios.rows
      : (await pool.query(`SELECT re.* FROM rutina_ejercicios re WHERE re.rutina_id = $1 AND re.dia_numero = 1 ORDER BY re.orden`, [rutina.rows[0].id])).rows;

    const sesion = await pool.query(
      `INSERT INTO sesiones_entrenamiento (usuario_id, fecha, dia_rutina) VALUES ($1, $2, $3) RETURNING *`,
      [usuarioId, hoy, diaRutina]
    );

    for (const ej of ejerciciosFinales) {
      await pool.query(
        `INSERT INTO sesion_ejercicios (sesion_id, ejercicio_id, nombre_ejercicio, series_realizadas, repeticiones_realizadas, dia_numero)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sesion.rows[0].id, ej.id, ej.nombre, ej.series, ej.repeticiones, diaRutina]
      );
    }

    const sesionCompleta = await pool.query(
      `SELECT s.*,
        json_agg(json_build_object(
          'id', se.id, 'ejercicio_id', se.ejercicio_id,
          'completado', se.completado, 'peso_usado', se.peso_usado,
          'nombre_ejercicio', se.nombre_ejercicio,
          'series_realizadas', se.series_realizadas,
          'repeticiones_realizadas', se.repeticiones_realizadas
        ) ORDER BY re.orden) as ejercicios_estado
       FROM sesiones_entrenamiento s
       LEFT JOIN sesion_ejercicios se ON se.sesion_id = s.id
       LEFT JOIN rutina_ejercicios re ON se.ejercicio_id = re.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [sesion.rows[0].id]
    );

    res.status(201).json({ sesion: sesionCompleta.rows[0], nueva: true, diaRutina });
  } catch (error) {
    console.error('Error iniciando sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

const completarEjercicio = async (req, res) => {
  const { sesionEjercicioId } = req.params;
  const { peso_usado, notas_cliente, completado } = req.body;
  const usuarioId = req.usuario.id;

  try {
    const check = await pool.query(
      `SELECT se.id FROM sesion_ejercicios se
       JOIN sesiones_entrenamiento s ON se.sesion_id = s.id
       WHERE se.id = $1 AND s.usuario_id = $2`,
      [sesionEjercicioId, usuarioId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      `UPDATE sesion_ejercicios SET completado = $1, peso_usado = $2, notas_cliente = $3,
         completado_en = CASE WHEN $1 = true THEN NOW() ELSE NULL END
       WHERE id = $4`,
      [completado, peso_usado || null, notas_cliente || null, sesionEjercicioId]
    );

    const pendientes = await pool.query(
      `SELECT COUNT(*) FROM sesion_ejercicios se
       JOIN sesiones_entrenamiento s ON se.sesion_id = s.id
       WHERE s.usuario_id = $1 AND s.fecha = CURRENT_DATE AND se.completado = false`,
      [usuarioId]
    );
    if (parseInt(pendientes.rows[0].count) === 0) {
      await pool.query(
        `UPDATE sesiones_entrenamiento SET completada = true WHERE usuario_id = $1 AND fecha = CURRENT_DATE`,
        [usuarioId]
      );
    }

    res.json({ mensaje: 'Ejercicio actualizado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ejercicio' });
  }
};

const getMiHistorial = async (req, res) => {
  const usuarioId = req.usuario.id;
  try {
    const sesiones = await pool.query(
      `SELECT s.id, s.fecha, s.completada, s.dia_rutina,
              COUNT(se.id) as total_ejercicios,
              COUNT(se.id) FILTER (WHERE se.completado = true) as completados
       FROM sesiones_entrenamiento s
       LEFT JOIN sesion_ejercicios se ON se.sesion_id = s.id
       WHERE s.usuario_id = $1
       GROUP BY s.id
       ORDER BY s.fecha DESC
       LIMIT 30`,
      [usuarioId]
    );
    res.json({ sesiones: sesiones.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

const getDetalleSesion = async (req, res) => {
  const { sesionId } = req.params;
  const usuarioId = req.usuario.id;
  try {
    const sesion = await pool.query(
      `SELECT * FROM sesiones_entrenamiento WHERE id = $1 AND usuario_id = $2`,
      [sesionId, usuarioId]
    );
    if (sesion.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    const ejercicios = await pool.query(
      `SELECT se.* FROM sesion_ejercicios se
       LEFT JOIN rutina_ejercicios re ON se.ejercicio_id = re.id
       WHERE se.sesion_id = $1 ORDER BY re.orden`,
      [sesionId]
    );

    res.json({ sesion: sesion.rows[0], ejercicios: ejercicios.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener detalle' });
  }
};

const getMiProgreso = async (req, res) => {
  const usuarioId = req.usuario.id;
  try {
    const result = await pool.query(
      `SELECT se.nombre_ejercicio, se.peso_usado, s.fecha, s.dia_rutina
       FROM sesion_ejercicios se
       JOIN sesiones_entrenamiento s ON se.sesion_id = s.id
       WHERE s.usuario_id = $1 AND se.completado = true AND se.nombre_ejercicio IS NOT NULL
       ORDER BY se.nombre_ejercicio, s.fecha ASC`,
      [usuarioId]
    );

    const progresoMap = {};
    result.rows.forEach(r => {
      if (!progresoMap[r.nombre_ejercicio]) progresoMap[r.nombre_ejercicio] = [];
      progresoMap[r.nombre_ejercicio].push({ fecha: r.fecha, peso: r.peso_usado, dia_rutina: r.dia_rutina });
    });

    res.json({ progreso: progresoMap });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener progreso' });
  }
};


// =============================================
// PLANTILLAS
// =============================================

const getPlantillas = async (req, res) => {
  try {
    const plantillas = await pool.query(
      `SELECT p.*, COUNT(pe.id) as total_ejercicios
       FROM rutinas_plantillas p
       LEFT JOIN plantilla_ejercicios pe ON pe.plantilla_id = p.id
       WHERE (p.gimnasio_id = $1 OR p.gimnasio_id IS NULL) AND p.activa = true
       GROUP BY p.id
       ORDER BY p.nombre`,
      [gId(req)]
    );
    res.json({ plantillas: plantillas.rows });
  } catch (error) {
    console.error('getPlantillas error:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
};

const getPlantillaDetalle = async (req, res) => {
  const { plantillaId } = req.params;
  try {
    const plantilla = await pool.query(`SELECT * FROM rutinas_plantillas WHERE id = $1`, [plantillaId]);
    if (plantilla.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    const ejercicios = await pool.query(
      `SELECT pe.*, ec.grupo_muscular FROM plantilla_ejercicios pe
       LEFT JOIN ejercicios_catalogo ec ON pe.catalogo_id = ec.id
       WHERE pe.plantilla_id = $1 ORDER BY pe.dia_numero, pe.orden`,
      [plantillaId]
    );

    const diasMap = {};
    ejercicios.rows.forEach(e => {
      const dia = e.dia_numero || 1;
      if (!diasMap[dia]) diasMap[dia] = [];
      diasMap[dia].push(e);
    });

    res.json({ plantilla: { ...plantilla.rows[0], dias: diasMap } });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
};

const crearPlantilla = async (req, res) => {
  const { nombre, descripcion, nivel, dias } = req.body;
  const gymId = gId(req);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const plantillaResult = await client.query(
      `INSERT INTO rutinas_plantillas (gimnasio_id, nombre, descripcion, nivel)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [gymId, nombre, descripcion, nivel || 'intermedio']
    );
    const plantillaId = plantillaResult.rows[0].id;

    for (const [diaNum, ejercicios] of Object.entries(dias)) {
      for (let i = 0; i < ejercicios.length; i++) {
        const { catalogo_id, nombre: ejNombre, series, repeticiones, peso_kg, unidad_reps, peso_fijo, notas } = ejercicios[i];
        await client.query(
          `INSERT INTO plantilla_ejercicios (plantilla_id, catalogo_id, nombre, series, repeticiones, peso_kg, unidad_reps, peso_fijo, notas, orden, dia_numero)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [plantillaId, catalogo_id || null, ejNombre, series || 3, repeticiones || 10, peso_kg || null, unidad_reps || 'reps', peso_fijo || false, notas || null, i, parseInt(diaNum)]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Plantilla creada.', id: plantillaId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al crear plantilla' });
  } finally {
    client.release();
  }
};

const eliminarPlantilla = async (req, res) => {
  const { plantillaId } = req.params;
  try {
    await pool.query(`DELETE FROM rutinas_plantillas WHERE id = $1 AND gimnasio_id = $2`, [plantillaId, gId(req)]);
    res.json({ mensaje: 'Plantilla eliminada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
};
module.exports = {
  getCatalogo, crearEjercicioCatalogo, toggleEjercicioCatalogo,
  getRutinaCliente, guardarRutina, getRutinaArchivada, getHistorialCliente,
  getMiRutina, getMiRutinaArchivada, iniciarSesion, completarEjercicio,
  getMiHistorial, getDetalleSesion, getMiProgreso,
  getPlantillas, getPlantillaDetalle, crearPlantilla, eliminarPlantilla
};