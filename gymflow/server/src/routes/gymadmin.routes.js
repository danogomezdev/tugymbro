const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getClientes, crearCliente, actualizarCliente, eliminarCliente, toggleBloqueo, actualizarPlan, toggleActivo,
  getProfesores, crearProfesor, getAlumnosDeProfesor,
  getConfiguracion, actualizarConfiguracion,
  getHorarios, crearHorario, actualizarHorario, eliminarHorario,
  getDashboard, gestionarPago,
  getTurnos, marcarAsistencia,
  getSolicitudesPago, gestionarSolicitudPago,
  getSolicitudesRecupero, gestionarRecupero
} = require('../controllers/gymadmin.controller');
const { verificarToken, soloAdminGym, adminOProfesor, verificarGimnasio, verificarPertenencia, requiereFeature } = require('../middleware/auth.middleware');

router.use(verificarToken, verificarGimnasio, verificarPertenencia);

router.get('/dashboard', soloAdminGym, getDashboard);
router.get('/clientes', adminOProfesor, getClientes);
router.post('/clientes', soloAdminGym, crearCliente);
router.put('/clientes/:id', soloAdminGym, actualizarCliente);
router.put('/clientes/:id/bloqueo', soloAdminGym, toggleBloqueo);
router.put('/clientes/:id/activo', soloAdminGym, toggleActivo);
router.put('/clientes/:id/plan', soloAdminGym, actualizarPlan);
router.delete('/clientes/:id', soloAdminGym, eliminarCliente);

router.get('/profesores', adminOProfesor, requiereFeature('profesores'), getProfesores);
router.post('/profesores', soloAdminGym, requiereFeature('profesores'), crearProfesor);
router.get('/profesores/:profesorId/alumnos', adminOProfesor, requiereFeature('profesores'), getAlumnosDeProfesor);

router.get('/configuracion', soloAdminGym, getConfiguracion);
router.put('/configuracion', soloAdminGym, actualizarConfiguracion);

// Horarios
router.get('/horarios', adminOProfesor, getHorarios);
router.post('/horarios', soloAdminGym, crearHorario);
router.put('/horarios/:id', soloAdminGym, actualizarHorario);
router.delete('/horarios/:id', soloAdminGym, eliminarHorario);

// Turnos
router.get('/turnos', adminOProfesor, getTurnos);
router.put('/turnos/:reservaId/asistencia', adminOProfesor, marcarAsistencia);

// Pagos
router.get('/pagos/solicitudes', adminOProfesor, getSolicitudesPago);
router.put('/pagos/solicitudes/:solicitudId', soloAdminGym, gestionarSolicitudPago);
router.put('/pagos/:pagoId/gestionar', soloAdminGym, gestionarPago);

// Recuperos
router.get('/recuperos/solicitudes', adminOProfesor, getSolicitudesRecupero);
router.put('/recuperos/solicitudes/:recuperoId', soloAdminGym, gestionarRecupero);

module.exports = router;