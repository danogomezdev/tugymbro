require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── RUTAS ───────────────────────────────────────────────────────────────────

// Públicas (sin auth)
app.use('/api/public', require('./routes/publico.routes'));

// Auth
app.use('/api/auth', require('./routes/auth.routes'));

// Super Admin (vos - dueño de la plataforma)
app.use('/api/superadmin', require('./routes/superadmin.routes'));

// Gym - rutas con contexto de gimnasio
// Formato: /api/gym/:gymSlug/admin/...
app.use('/api/gym/:gymSlug/admin', require('./routes/gymadmin.routes'));

// Rutinas — /api/gym/:gymSlug/rutinas/...
app.use('/api/gym/:gymSlug/rutinas', require('./routes/rutinas.routes'));

// Cliente — /api/gym/:gymSlug/cliente/...
app.use('/api/gym/:gymSlug/cliente', require('./routes/cliente.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'TGB - Tu Gym Bro',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🏋️  TGB - Tu Gym Bro`);
  console.log(`🚀 Server corriendo en http://localhost:${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);

  // Test DB
  try {
    await pool.query('SELECT 1');
    console.log('✅ Base de datos conectada');
  } catch (err) {
    console.error('❌ Error conectando DB:', err.message);
  }
});
