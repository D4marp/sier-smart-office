/**
 * Data ruangan & perangkat — FIKK Lantai 2 & 3.
 *
 * Ruangan lantai 2 (U5.02.01–04): 1 AC + 1 Lampu.
 * Ruangan lantai 3 (U5.03.05): 3 AC + 1 Lampu.
 * Diisi dengan data simulasi (status aktif, daya & suhu live, riwayat
 * konsumsi 30 hari) supaya dashboard FIKK langsung menampilkan data —
 * bukan menunggu instalasi IoT fisik seperti pola Pascasarjana Psikologi.
 *
 * Terhubung langsung ke database smart_energy_fikk (bukan lewat proxy
 * db.query tenant-context) — pola sama seperti scripts/setup_multitenant.js.
 *
 * Jalankan: node scripts/seed_fikk_lt2.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_NAME = 'smart_energy_fikk';

const ROOMS = [
  { name: 'U5.02.01', floor: 2, acCount: 1 },
  { name: 'U5.02.02', floor: 2, acCount: 1 },
  { name: 'U5.02.03', floor: 2, acCount: 1 },
  { name: 'U5.02.04', floor: 2, acCount: 1 },
  { name: 'U5.03.05', floor: 3, acCount: 3 },
];

function roomKey(name) {
  return name.replace(/\./g, '');
}

async function main() {
  console.log(`🏫 Seeding ruangan & perangkat FIKK LT2/LT3 ke '${DB_NAME}'\n`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    database: DB_NAME,
  });

  // 1. Ruangan
  console.log('1️⃣  Membuat ruangan...');
  for (const room of ROOMS) {
    await conn.query(
      `INSERT INTO classes (name, description, building, floor, status)
       VALUES (?, ?, 'FIKK', ?, 'active')
       ON DUPLICATE KEY UPDATE description = VALUES(description), building = VALUES(building), floor = VALUES(floor)`,
      [room.name, `FIKK - Ruang ${room.name} Lantai ${room.floor}`, room.floor]
    );
  }
  console.log(`   ✅ ${ROOMS.length} ruangan siap`);

  // 2. Perangkat AC + Lampu per ruangan
  console.log('\n2️⃣  Membuat perangkat AC & Lampu...');
  const [classRows] = await conn.query('SELECT id, name FROM classes WHERE name IN (?)', [ROOMS.map((r) => r.name)]);
  const classIdByName = Object.fromEntries(classRows.map((r) => [r.name, r.id]));

  let deviceCount = 0;
  for (const room of ROOMS) {
    const classId = classIdByName[room.name];
    const key = roomKey(room.name);

    for (let i = 1; i <= room.acCount; i++) {
      const suffix = room.acCount > 1 ? `-${i}` : '';
      await conn.query(
        `INSERT INTO devices
           (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, current_power, efficiency_rating, status, iot_status, installation_date)
         VALUES (?, ?, ?, 'AC', 'climate-control', ?, ?, 'Daikin', 'Inverter 1.5PK', 3.0, 0, 85, 'offline', 'registered', CURDATE())
         ON DUPLICATE KEY UPDATE device_name = VALUES(device_name), location = VALUES(location)`,
        [classId, `AC-FIKK-${key}${suffix}`, `AC Unit ${room.name}${suffix}`, room.name, `secret_ac_fikk_${key}${suffix}`.toLowerCase()]
      );
      deviceCount++;
    }

    await conn.query(
      `INSERT INTO devices
         (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, current_power, efficiency_rating, status, iot_status, installation_date)
       VALUES (?, ?, ?, 'LAMP', 'lighting-control', ?, ?, 'Philips', 'LED Panel 18W x8', 1.6, 0, 90, 'offline', 'registered', CURDATE())
       ON DUPLICATE KEY UPDATE device_name = VALUES(device_name), location = VALUES(location)`,
      [classId, `LAMP-FIKK-${key}`, `Lighting ${room.name}`, room.name, `secret_lamp_fikk_${key}`.toLowerCase()]
    );
    deviceCount++;
  }
  console.log(`   ✅ ${deviceCount} perangkat siap`);

  // 3. Riwayat konsumsi simulasi 30 hari (pola jam kerja Senin-Jumat lebih tinggi)
  console.log('\n3️⃣  Menghasilkan riwayat konsumsi simulasi 30 hari...');
  const [devices] = await conn.query('SELECT * FROM devices WHERE class_id IN (?)', [Object.values(classIdByName)]);

  await conn.query('DELETE FROM device_consumption WHERE device_id IN (?)', [devices.map((d) => d.id)]);

  const insertRows = [];
  const now = new Date();

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() - dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];
    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;

    for (let hour = 0; hour < 24; hour++) {
      const hourStartStr = `${String(hour).padStart(2, '0')}:00:00`;
      const hourEndStr = `${String((hour + 1) % 24).padStart(2, '0')}:00:00`;

      let activeProbability = 0;
      let powerFactor = 1;
      if (hour >= 7 && hour <= 16) {
        activeProbability = isWeekend ? 0.1 : 0.8;
        powerFactor = 0.8 + Math.random() * 0.4;
      } else if (hour > 16 && hour <= 19) {
        activeProbability = isWeekend ? 0.05 : 0.3;
        powerFactor = 0.5 + Math.random() * 0.3;
      } else {
        activeProbability = 0.02;
        powerFactor = 0.2;
      }

      for (const device of devices) {
        const isAc = device.device_type === 'AC';
        const isLamp = device.device_type === 'LAMP';
        if (!isAc && !isLamp) continue;

        const isActive = Math.random() < activeProbability;
        const powerRating = parseFloat(device.power_rating) || 1.0;

        let powerAc = null;
        let powerLamp = null;
        let consumption = null;
        let temperature = null;

        if (isAc) {
          powerAc = isActive ? Number((powerRating * powerFactor).toFixed(4)) : 0;
          consumption = powerAc;
          temperature = isActive ? Number((23 + Math.random() * 2).toFixed(2)) : null;
        } else {
          powerLamp = isActive ? Number((powerRating * powerFactor * 0.7).toFixed(4)) : 0;
          consumption = powerLamp;
        }

        insertRows.push([
          device.id, null, isActive ? 1 : 0, powerAc, powerLamp, consumption,
          dateStr, hourStartStr, hourEndStr, temperature, null,
          JSON.stringify({ simulated: true }), `msg-fikk-${device.id}-${dateStr}-${hour}`,
        ]);
      }
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < insertRows.length; i += chunkSize) {
    const chunk = insertRows.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    await conn.query(
      `INSERT INTO device_consumption
         (device_id, id_class, occupancy, power_ac, power_lamp, consumption, consumption_date, hour_start, hour_end, temperature, humidity, payload, message_id)
       VALUES ${placeholders}`,
      chunk.flat()
    );
  }
  console.log(`   ✅ ${insertRows.length} baris riwayat konsumsi dibuat`);

  // 4. Status & bacaan live saat ini (supaya dashboard tidak kosong)
  console.log('\n4️⃣  Memperbarui status & daya live perangkat...');
  for (const device of devices) {
    const active = Math.random() < 0.65;
    let currentPower = 0;
    let currentTemp = null;

    if (device.device_type === 'AC') {
      currentPower = active ? Number((parseFloat(device.power_rating) * (0.8 + Math.random() * 0.3)).toFixed(2)) : 0;
      currentTemp = active ? Number((23 + Math.random() * 2).toFixed(1)) : null;
    } else if (device.device_type === 'LAMP') {
      currentPower = active ? Number((parseFloat(device.power_rating) * 0.8).toFixed(2)) : 0;
    }

    await conn.query(
      `UPDATE devices SET current_power = ?, current_temperature = ?, status = ?, iot_status = 'active', last_reading = NOW(), last_heartbeat = NOW() WHERE id = ?`,
      [currentPower, currentTemp, active ? 'active' : 'idle', device.id]
    );
  }
  console.log('   ✅ Status live diperbarui');

  const [summary] = await conn.query(
    `SELECT c.name AS ruangan, d.device_type, COUNT(*) AS jumlah, ROUND(AVG(d.current_power), 2) AS avg_power
     FROM classes c JOIN devices d ON d.class_id = c.id
     WHERE c.name IN (?) GROUP BY c.name, d.device_type ORDER BY c.name, d.device_type`,
    [ROOMS.map((r) => r.name)]
  );
  console.log('\n📋 Ringkasan:');
  console.table(summary);

  await conn.end();
  console.log('🎉 Seeding FIKK LT2/LT3 selesai.');
}

main().catch((err) => {
  console.error('❌ Seeding gagal:', err.message);
  process.exit(1);
});
