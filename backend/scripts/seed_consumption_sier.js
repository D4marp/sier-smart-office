/**
 * Generate 14 hari data konsumsi energi sintetis (demo) untuk device AC/LAMP
 * di tenant SIER, supaya dashboard/analitik tidak kosong saat direview.
 * Data ini SINTETIS untuk keperluan demo UI — bukan pembacaan sensor asli.
 *
 * Jalankan: node scripts/seed_consumption_sier.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const tenantManager = require('../config/tenantManager');
const { runWithTenant } = require('../config/tenantContext');
const db = require('../config/database');

const SIER_TENANT_CODE = process.env.DEFAULT_TENANT || 'sier';

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Faktor okupansi kantor per jam: rendah malam/dini hari, puncak jam kerja 08-17.
function hourActivityFactor(hour, weekend) {
  if (weekend) return hour >= 8 && hour <= 16 ? 0.15 : 0.03;
  if (hour < 6 || hour >= 21) return 0.05;
  if (hour >= 8 && hour <= 17) return 0.75 + Math.random() * 0.25;
  return 0.25 + Math.random() * 0.2;
}

async function seed() {
  const [devices] = await db.query('SELECT * FROM devices');
  console.log(`Ditemukan ${devices.length} perangkat.`);

  await db.query('DELETE FROM device_consumption');

  const rows = [];
  const now = new Date();

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];
    const weekend = isWeekend(targetDate);

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = `${String(hour).padStart(2, '0')}:00:00`;
      const hourEnd = `${String((hour + 1) % 24).padStart(2, '0')}:00:00`;
      const factor = hourActivityFactor(hour, weekend);

      for (const device of devices) {
        if (device.device_type !== 'AC' && device.device_type !== 'LAMP') continue;

        const rating = parseFloat(device.power_rating) || (device.device_type === 'AC' ? 1.5 : 0.1);
        const occupancy = factor > 0.3 && Math.random() < factor ? 1 : 0;
        const noise = 0.85 + Math.random() * 0.3;
        const powerAc = device.device_type === 'AC' ? Number((rating * factor * noise).toFixed(4)) : 0;
        const powerLamp = device.device_type === 'LAMP' ? Number((rating * factor * noise).toFixed(4)) : 0;
        const consumption = Number((powerAc + powerLamp).toFixed(4));
        const temperature = device.device_type === 'AC' ? Number((23 + Math.random() * 3).toFixed(1)) : null;

        // id_class dibiarkan NULL: constraint unique_consumption_class dimaksudkan
        // untuk satu baris agregat per ruangan per jam (jalur ingest berbeda),
        // bukan untuk banyak device (AC+LAMP) di ruangan yang sama di jam yang sama.
        rows.push([
          device.id, null, occupancy, powerAc || null, powerLamp || null, consumption,
          dateStr, hourStart, hourEnd, temperature, null,
        ]);
      }
    }
  }

  console.log(`Menyisipkan ${rows.length} baris konsumsi...`);
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await db.query(
      `INSERT INTO device_consumption
         (device_id, id_class, occupancy, power_ac, power_lamp, consumption, consumption_date, hour_start, hour_end, temperature, humidity)
       VALUES ?`,
      [chunk]
    );
  }

  console.log('✅ Selesai.');
}

async function main() {
  const pool = await tenantManager.getPoolByCode(SIER_TENANT_CODE);
  await runWithTenant(SIER_TENANT_CODE, pool, seed);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Gagal:', err.message);
    process.exit(1);
  });
