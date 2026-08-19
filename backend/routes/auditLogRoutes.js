const express = require('express');
const AuditLogController = require('../controllers/AuditLogController');

const router = express.Router();

router.get('/device-activity', AuditLogController.getDeviceActivity);

module.exports = router;
