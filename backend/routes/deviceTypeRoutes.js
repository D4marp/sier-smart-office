const express = require('express');
const DeviceTypeController = require('../controllers/DeviceTypeController');

const router = express.Router();

router.get('/', DeviceTypeController.getAll);
router.post('/', DeviceTypeController.create);
router.put('/:id', DeviceTypeController.update);
router.delete('/:id', DeviceTypeController.delete);

module.exports = router;
