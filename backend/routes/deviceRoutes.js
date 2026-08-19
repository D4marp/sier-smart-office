const express = require('express');
const DeviceController = require('../controllers/DeviceController');

const router = express.Router();

// Get all devices
router.get('/', DeviceController.getAll);

// Get devices by class
router.get('/class/:classId', DeviceController.getByClass);

// Get devices by class code
router.get('/class-code/:classCode', DeviceController.getByClassCode);

// Get devices by type
router.get('/type/:type', DeviceController.getByType);

// Get device by ID
router.get('/:id', DeviceController.getById);

// Create new device
router.post('/', DeviceController.create);

// Update device
router.put('/:id', DeviceController.update);

// Update device status
router.patch('/:id/status', DeviceController.updateStatus);

// Send ON/OFF control command via Node-RED
router.post('/:id/control', DeviceController.controlViaNodeRed);

// Send ON/OFF control command for all devices in a class via Node-RED
router.post('/class-code/:classCode/control', DeviceController.controlClassViaNodeRed);

// Send ON/OFF control command for a specific device type in a class via Node-RED
router.post('/class-code/:classCode/control/:deviceType', DeviceController.controlClassDeviceTypeViaNodeRed);

// Update device reading (power & temperature)
router.patch('/:id/reading', DeviceController.updateReading);

// Latest IoT telemetry (battery/signal) for a device
router.get('/:id/telemetry', DeviceController.getTelemetry);

// Restart device (stub — lihat catatan di DeviceController.restart)
router.post('/:id/restart', DeviceController.restart);

// Delete device
router.delete('/:id', DeviceController.delete);

module.exports = router;
