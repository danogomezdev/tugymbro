const express = require('express');
const router = express.Router();
const { getInfoGym, solicitarRegistroGym } = require('../controllers/publico.controller');

router.get('/gym/:gymSlug', getInfoGym);
router.post('/solicitar-registro', solicitarRegistroGym);

module.exports = router;
