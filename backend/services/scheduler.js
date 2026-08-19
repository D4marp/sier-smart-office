/**
 * Cron scheduler untuk device_schedules ("Set Timer") — item #8 permintaan
 * Pak Deddy. Jalan tiap menit, cek jadwal yang jam+harinya cocok, lalu
 * menerapkan status ON/OFF ke devices dan mencatatnya di audit_logs supaya
 * muncul di halaman Log Aktivitas.
 *
 * Catatan jujur: sama seperti kontrol manual dari dashboard, ini mengubah
 * status di database kita — pengiriman command fisik ke hardware tetap
 * lewat jalur TCP/Node-RED yang sama (lihat DeviceController), yang baru
 * benar-benar sampai ke perangkat bila Node-RED/gateway sungguhan terhubung.
 */

const cron = require('node-cron');
const tenantManager = require('../config/tenantManager');
const { runWithTenant } = require('../config/tenantContext');
const Device = require('../models/Device');
const DeviceSchedule = require('../models/DeviceSchedule');
const AuditLog = require('../models/AuditLog');

const SIER_TENANT_CODE = process.env.DEFAULT_TENANT || 'sier';

async function runTick() {
  const pool = await tenantManager.getPoolByCode(SIER_TENANT_CODE);
  await runWithTenant(SIER_TENANT_CODE, pool, async () => {
    const due = await DeviceSchedule.getDueSchedules();
    for (const schedule of due) {
      try {
        const nextStatus = schedule.action === 'on' ? 'active' : 'idle';
        await Device.updateStatus(schedule.device_id, nextStatus);
        await AuditLog.create({
          user_id: null,
          action: `device_scheduled_${schedule.action}`,
          entity_type: 'device',
          entity_id: schedule.device_id,
          new_values: { status: nextStatus, schedule_id: schedule.id, time_of_day: schedule.time_of_day },
        });
        await DeviceSchedule.markRun(schedule.id);
        console.log(`⏱️  Jadwal #${schedule.id}: ${schedule.device_name || schedule.device_id} -> ${schedule.action}`);
      } catch (err) {
        console.error(`❌ Gagal menjalankan jadwal #${schedule.id}:`, err.message);
      }
    }
  });
}

function startScheduler() {
  cron.schedule('* * * * *', () => {
    runTick().catch((err) => console.error('❌ Scheduler tick gagal:', err.message));
  });
  console.log('⏱️  Device scheduler aktif (cek jadwal tiap menit)');
}

module.exports = { startScheduler };
