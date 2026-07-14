-- =============================================================
-- DATA RUANGAN & PERANGKAT — PASCASARJANA PSIKOLOGI
-- Dijalankan terhadap database smart_energy_pascasarjana_psikologi
-- (dibuat oleh scripts/seed_unesa_faculties.js sebagai tenant
-- 'pascasarjana-psikologi'). Aman dijalankan berulang — INSERT IGNORE
-- berdasarkan UNIQUE key (classes.name, devices.device_eui).
--
-- Jalankan: mysql -u root smart_energy_pascasarjana_psikologi < seed_pascasarjana_psikologi.sql
-- =============================================================

USE smart_energy_pascasarjana_psikologi;

-- ── 3 Ruang Kelas Pascasarjana Lantai 2 ──
INSERT IGNORE INTO classes (name, description, building, floor, status) VALUES
('Ruang Kelas 1 Lt. 2', 'Pascasarjana Psikologi - Ruang Kelas 1 Lantai 2', 'Pascasarjana', 2, 'active'),
('Ruang Kelas 2 Lt. 2', 'Pascasarjana Psikologi - Ruang Kelas 2 Lantai 2', 'Pascasarjana', 2, 'active'),
('Ruang Kelas 3 Lt. 2', 'Pascasarjana Psikologi - Ruang Kelas 3 Lantai 2', 'Pascasarjana', 2, 'active');

-- ── Perangkat AC + Lampu per ruang ──
-- Status 'offline'/'registered': perangkat sudah terdaftar di sistem,
-- namun belum ada instalasi IoT fisik yang aktif (bukan data konsumsi
-- fiktif). Update status/current_power/current_temperature setelah
-- perangkat fisik benar-benar terpasang dan online.

INSERT IGNORE INTO devices
  (class_id, device_eui, device_name, device_type, application_type, location, device_secret, power_rating, current_power, efficiency_rating, status, iot_status)
SELECT id, 'AC-PASCA1-001', 'AC Unit Ruang Kelas 1 Lt. 2', 'AC', 'climate-control', 'Ruang Kelas 1 Lt. 2', 'secret_ac_pasca1_001', 3.0, 0, 0, 'offline', 'registered'
FROM classes WHERE name = 'Ruang Kelas 1 Lt. 2'
UNION ALL
SELECT id, 'LAMP-PASCA1-001', 'Lighting Ruang Kelas 1 Lt. 2', 'LAMP', 'lighting-control', 'Ruang Kelas 1 Lt. 2', 'secret_lamp_pasca1_001', 1.6, 0, 0, 'offline', 'registered'
FROM classes WHERE name = 'Ruang Kelas 1 Lt. 2'
UNION ALL
SELECT id, 'AC-PASCA2-001', 'AC Unit Ruang Kelas 2 Lt. 2', 'AC', 'climate-control', 'Ruang Kelas 2 Lt. 2', 'secret_ac_pasca2_001', 3.0, 0, 0, 'offline', 'registered'
FROM classes WHERE name = 'Ruang Kelas 2 Lt. 2'
UNION ALL
SELECT id, 'LAMP-PASCA2-001', 'Lighting Ruang Kelas 2 Lt. 2', 'LAMP', 'lighting-control', 'Ruang Kelas 2 Lt. 2', 'secret_lamp_pasca2_001', 1.6, 0, 0, 'offline', 'registered'
FROM classes WHERE name = 'Ruang Kelas 2 Lt. 2'
UNION ALL
SELECT id, 'AC-PASCA3-001', 'AC Unit Ruang Kelas 3 Lt. 2', 'AC', 'climate-control', 'Ruang Kelas 3 Lt. 2', 'secret_ac_pasca3_001', 3.0, 0, 0, 'offline', 'registered'
FROM classes WHERE name = 'Ruang Kelas 3 Lt. 2'
UNION ALL
SELECT id, 'LAMP-PASCA3-001', 'Lighting Ruang Kelas 3 Lt. 2', 'LAMP', 'lighting-control', 'Ruang Kelas 3 Lt. 2', 'secret_lamp_pasca3_001', 1.6, 0, 0, 'offline', 'registered'
FROM classes WHERE name = 'Ruang Kelas 3 Lt. 2';

-- ── Ringkasan ──
SELECT c.name AS ruangan, d.device_eui, d.device_type, d.status
FROM classes c JOIN devices d ON d.class_id = c.id
ORDER BY c.name, d.device_type;
