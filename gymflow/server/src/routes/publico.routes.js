const express = require('express');
const router = express.Router();
const { getInfoGym, solicitarRegistroGym, buscarGyms } = require('../controllers/publico.controller');

router.get('/gym/:gymSlug', getInfoGym);
router.post('/solicitar-registro', solicitarRegistroGym);

// Nuevo: buscador de gimnasios para la pantalla Welcome
router.get('/gyms/buscar', buscarGyms);

module.exports = router;
