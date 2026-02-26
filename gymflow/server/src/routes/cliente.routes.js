const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  misReservas, crearReserva, cancelarReserva, disponibilidad,
  getConfiguracion, solicitarPlan,
  getMisAusencias, solicitarRecupero,
  getMisNotificaciones, getNotificacionesNoLeidas
} = require('../controllers/cliente.controller');
const { verificarToken, verificarGimnasio, verificarPertenencia } = require('../middleware/auth.middleware');
const upload = require('../config/multer');

router.use(verificarToken, verificarGimnasio, verificarPertenencia);

// Reservas
router.get('/reservas', misReservas);
router.post('/reservas', crearReserva);
router.put('/reservas/:id/cancelar', cancelarReserva);
router.get('/reservas/disponibilidad/:fecha', disponibilidad);

// Pagos
router.get('/pagos/configuracion', getConfiguracion);
router.post('/pagos/solicitar', upload.single('comprobante'), solicitarPlan);

// Recupero
router.get('/recupero/mis-ausencias', getMisAusencias);
router.post('/recupero/solicitar', solicitarRecupero);

// Notificaciones
router.get('/notificaciones', getMisNotificaciones);
router.get('/notificaciones/no-leidas', getNotificacionesNoLeidas);

module.exports = router;
