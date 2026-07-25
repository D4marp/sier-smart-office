const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load backend environment variables from backend/.env when running from repository root
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Multi-tenant: registry rektorat + satu database per fakultas
const tenantManager = require('./config/tenantManager');
const { resolveTenant } = require('./middleware/tenantMiddleware');

tenantManager.init().catch((err) => {
  console.error('❌ Registry rektorat tidak dapat dihubungi:', err.message);
  console.error('   Jalankan: node scripts/setup_multitenant.js');
});

// Import routes
const classRoutes = require('./routes/classRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const consumptionRoutes = require('./routes/consumptionRoutes');
const alertRoutes = require('./routes/alertRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

const app = express();

let allowedOrigins = [];
if (process.env.FRONTEND_URL) {
  allowedOrigins = process.env.FRONTEND_URL.split(',').map(origin => origin.trim());
}
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003'
  );
}
allowedOrigins = [...new Set(allowedOrigins.filter(Boolean))];

function isDevelopmentLanOrigin(origin) {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV) {
    return false;
  }

  try {
    const url = new URL(origin);
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    const isAllowedPort = ['3000', '3001', '3002', '3003'].includes(port);
    const isPrivateHost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname.startsWith('10.') ||
      url.hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);

    return isAllowedPort && isPrivateHost;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (no Origin header) and configured frontends.
    if (!origin || allowedOrigins.includes(origin) || isDevelopmentLanOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';

// Route data per-fakultas: berjalan di dalam tenant context (resolveTenant
// memilih database fakultas berdasarkan header X-Tenant / JWT / DEFAULT_TENANT)
app.use(`${apiPrefix}/classes`, resolveTenant, classRoutes);
app.use(`${apiPrefix}/devices`, resolveTenant, deviceRoutes);
app.use(`${apiPrefix}/consumption`, resolveTenant, consumptionRoutes);
app.use(`${apiPrefix}/alerts`, resolveTenant, alertRoutes);
app.use(`${apiPrefix}/settings`, resolveTenant, settingsRoutes);

// Route registry rektorat: users terpusat + manajemen tenant (tanpa tenant context)
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/tenants`, tenantRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Smart Energy Dashboard API is running'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Energy Dashboard API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
