const RoomOccupant = require('../models/RoomOccupant');

class RoomOccupantController {
  static async getAll(req, res) {
    try {
      const { classId } = req.query;
      const data = classId ? await RoomOccupant.getByClass(classId) : await RoomOccupant.getAll();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { class_id, full_name, email, phone, notify_email } = req.body;
      if (!class_id || !full_name) {
        return res.status(400).json({ success: false, message: 'class_id dan full_name wajib diisi' });
      }
      const result = await RoomOccupant.create({ class_id, full_name, email, phone, notify_email });
      res.status(201).json({ success: true, message: 'Penghuni ruangan ditambahkan', data: { id: result.insertId } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await RoomOccupant.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Penghuni ruangan tidak ditemukan' });
      }
      await RoomOccupant.update(id, req.body);
      res.json({ success: true, message: 'Penghuni ruangan diperbarui' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await RoomOccupant.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Penghuni ruangan tidak ditemukan' });
      }
      await RoomOccupant.delete(id);
      res.json({ success: true, message: 'Penghuni ruangan dihapus' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = RoomOccupantController;
