const express = require('express');
const DeviceScheduleController = require('../controllers/DeviceScheduleController');

const router = express.Router();

router.get('/', DeviceScheduleController.getAll);
router.post('/', DeviceScheduleController.create);
router.put('/:id', DeviceScheduleController.update);
router.delete('/:id', DeviceScheduleController.delete);

module.exports = router;
