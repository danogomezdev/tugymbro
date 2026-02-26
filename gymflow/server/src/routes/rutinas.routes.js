const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCatalogo, crearEjercicioCatalogo, toggleEjercicioCatalogo,
  getRutinaCliente, guardarRutina, getRutinaArchivada,
  getMiRutina, getMiRutinaArchivada, iniciarSesion, completarEjercicio,
  getMiHistorial, getDetalleSesion, getMiProgreso,
  getPlantillas, getPlantillaDetalle, crearPlantilla, eliminarPlantilla
} = require('../controllers/rutinas.controller');
const { verificarToken, verificarGimnasio, verificarPertenencia, adminOProfesor } = require('../middleware/auth.middleware');

router.use(verificarToken, verificarGimnasio, verificarPertenencia);

// Catálogo — cualquier usuario del gym
router.get('/catalogo', getCatalogo);
router.post('/catalogo', adminOProfesor, crearEjercicioCatalogo);
router.put('/catalogo/:id/toggle', adminOProfesor, toggleEjercicioCatalogo);

// Plantillas — admin/profesor
router.get('/plantillas', adminOProfesor, getPlantillas);
router.get('/plantillas/:plantillaId', adminOProfesor, getPlantillaDetalle);
router.post('/plantillas', adminOProfesor, crearPlantilla);
router.delete('/plantillas/:plantillaId', adminOProfesor, eliminarPlantilla);

// Rutinas de cliente — admin/profesor puede ver y editar cualquier cliente
router.get('/cliente/:usuarioId', adminOProfesor, getRutinaCliente);
router.post('/cliente/:usuarioId', adminOProfesor, guardarRutina);
router.get('/cliente/:usuarioId/archivada/:rutinaId', adminOProfesor, getRutinaArchivada);

// Rutas del cliente (su propia rutina)
router.get('/mi-rutina', getMiRutina);
router.get('/mi-rutina/archivada/:rutinaId', getMiRutinaArchivada);
router.post('/sesion/iniciar', iniciarSesion);
router.post('/sesion/:sesionId/ejercicio', completarEjercicio);
router.get('/mi-historial', getMiHistorial);
router.get('/sesion/:sesionId', getDetalleSesion);
router.get('/mi-progreso', getMiProgreso);

module.exports = router;