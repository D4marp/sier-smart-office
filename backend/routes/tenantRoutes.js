const express = require('express');
const TenantController = require('../controllers/TenantController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

// Daftar tenant: superadmin melihat semua tenant; user fakultas hanya melihat tenant miliknya.
router.get('/', TenantController.getAll);

// Rollup lintas-fakultas untuk rektorat
router.get('/overview', requireRole('superadmin'), TenantController.overview);

// Provisioning & manajemen tenant hanya untuk rektorat
router.post('/', requireRole('superadmin'), TenantController.create);
router.put('/:code', requireRole('superadmin'), TenantController.update);

module.exports = router;
