const express = require('express');
const RoomOccupantController = require('../controllers/RoomOccupantController');

const router = express.Router();

router.get('/', RoomOccupantController.getAll);
router.post('/', RoomOccupantController.create);
router.put('/:id', RoomOccupantController.update);
router.delete('/:id', RoomOccupantController.delete);

module.exports = router;
