const express = require('express');
const router = express.Router();
const {
  getGimnasios, getSolicitudesGimnasio, aprobarGimnasio, rechazarSolicitud,
  suspenderGimnasio, reactivarGimnasio, cambiarPlanGimnasio, getDetalleGimnasio,
  getPlanes, actualizarPlan, getStats, getUsuarios,
  crearGimnasio, crearUsuario, importarClientes
} = require('../controllers/superadmin.controller');
const { verificarToken, soloSuperAdmin } = require('../middleware/auth.middleware');

router.use(verificarToken, soloSuperAdmin);

router.get('/stats', getStats);
router.get('/gimnasios', getGimnasios);
router.post('/gimnasios', soloSuperAdmin, crearGimnasio);
router.get('/gimnasios/:gymId', getDetalleGimnasio);
router.put('/gimnasios/:gymId/suspender', suspenderGimnasio);
router.put('/gimnasios/:gymId/reactivar', reactivarGimnasio);
router.put('/gimnasios/:gymId/plan', cambiarPlanGimnasio);
router.get('/solicitudes', getSolicitudesGimnasio);
router.post('/solicitudes/:solicitudId/aprobar', aprobarGimnasio);
router.post('/solicitudes/:solicitudId/rechazar', rechazarSolicitud);
router.get('/planes', getPlanes);
router.put('/planes/:planId', actualizarPlan);
router.get('/usuarios', getUsuarios);
router.post('/usuarios', soloSuperAdmin, crearUsuario);
router.post('/importar-clientes', soloSuperAdmin, importarClientes);

module.exports = router;