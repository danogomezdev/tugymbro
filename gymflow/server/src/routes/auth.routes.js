const express = require('express');
const router = express.Router();
const { loginGym, registroCliente, loginSuperAdmin, cambiarPassword } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth.middleware');

router.post('/login/:gymSlug', loginGym);
router.post('/registro/:gymSlug', registroCliente);
router.post('/superadmin/login', loginSuperAdmin);
router.put('/cambiar-password', verificarToken, cambiarPassword);

module.exports = router;
