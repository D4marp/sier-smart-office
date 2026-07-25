-- =============================================================
-- DATA RUANGAN & PERANGKAT — FISIPOL (Fakultas Ilmu Sosial dan Ilmu Politik)
-- Dijalankan terhadap database smart_energy_fisipol
-- (dibuat oleh scripts/seed_unesa_faculties.js sebagai tenant 'fisipol').
-- Aman dijalankan berulang — INSERT IGNORE berdasarkan UNIQUE key
-- (classes.name, devices.device_eui).
--
-- Ruangan: "Umum Fakultas" — I3.02.01 s/d I3.02.05
-- Perangkat per ruang mengikuti setup Fakultas Psikologi:
--   AC (climate-control) + Lampu (lighting-control) + Sensor Suhu VS321 (environment-sensor)
--
-- Jalankan: mysql -u root smart_energy_fisipol < seed_fisipol.sql
-- =============================================================

USE smart_energy_fisipol;

-- ── 5 Ruang "Umum Fakultas" (Gedung I3, Lantai 2) ──
INSERT IGNORE INTO classes (name, description, building, floor, status) VALUES
('I3.02.01', 'Umum Fakultas - Ruang I3.02.01', 'Umum Fakultas', 2, 'active'),
('I3.02.02', 'Umum Fakultas - Ruang I3.02.02', 'Umum Fakultas', 2, 'active'),
('I3.02.03', 'Umum Fakultas - Ruang I3.02.03', 'Umum Fakultas', 2, 'active'),
('I3.02.04', 'Umum Fakultas - Ruang I3.02.04', 'Umum Fakultas', 2, 'active'),
('I3.02.05', 'Umum Fakultas - Ruang I3.02.05', 'Umum Fakultas', 2, 'active');

-- ── Perangkat AC + Lampu per ruang ──
-- Status 'offline'/'registered': perangkat sudah terdaftar di sistem, namun
-- belum ada instalasi IoT fisik yang aktif (bukan data konsumsi fiktif).
-- Update status/current_power/current_temperature setelah perangkat fisik
-- benar-benar terpasang dan online.
INSERT IGNORE INTO devices
  (class_id, device_eui, device_name, device_type, application_type, location, device_secret, power_rating, current_power, efficiency_rating, status, iot_status)
SELECT id, 'AC-I30201-001',   'AC Unit I3.02.01',  'AC',   'climate-control',  'I3.02.01', 'secret_ac_i30201_001',   3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.01'
UNION ALL
SELECT id, 'LAMP-I30201-001', 'Lighting I3.02.01', 'LAMP', 'lighting-control', 'I3.02.01', 'secret_lamp_i30201_001', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.01'
UNION ALL
SELECT id, 'AC-I30202-001',   'AC Unit I3.02.02',  'AC',   'climate-control',  'I3.02.02', 'secret_ac_i30202_001',   3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.02'
UNION ALL
SELECT id, 'LAMP-I30202-001', 'Lighting I3.02.02', 'LAMP', 'lighting-control', 'I3.02.02', 'secret_lamp_i30202_001', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.02'
UNION ALL
SELECT id, 'AC-I30203-001',   'AC Unit I3.02.03',  'AC',   'climate-control',  'I3.02.03', 'secret_ac_i30203_001',   3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.03'
UNION ALL
SELECT id, 'LAMP-I30203-001', 'Lighting I3.02.03', 'LAMP', 'lighting-control', 'I3.02.03', 'secret_lamp_i30203_001', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.03'
UNION ALL
SELECT id, 'AC-I30204-001',   'AC Unit I3.02.04',  'AC',   'climate-control',  'I3.02.04', 'secret_ac_i30204_001',   3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.04'
UNION ALL
SELECT id, 'LAMP-I30204-001', 'Lighting I3.02.04', 'LAMP', 'lighting-control', 'I3.02.04', 'secret_lamp_i30204_001', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.04'
UNION ALL
SELECT id, 'AC-I30205-001',   'AC Unit I3.02.05',  'AC',   'climate-control',  'I3.02.05', 'secret_ac_i30205_001',   3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.05'
UNION ALL
SELECT id, 'LAMP-I30205-001', 'Lighting I3.02.05', 'LAMP', 'lighting-control', 'I3.02.05', 'secret_lamp_i30205_001', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.05';

-- ── Sensor Suhu VS321 per ruang (temperature + humidity) ──
INSERT IGNORE INTO devices
  (class_id, device_eui, device_name, device_type, application_type, location, device_secret, power_rating, current_power, efficiency_rating, status, iot_status)
SELECT id, 'VS321-I30201-001', 'Sensor Suhu I3.02.01', 'SENSOR', 'environment-sensor', 'I3.02.01', 'secret_vs321_i30201_001', 0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.01'
UNION ALL
SELECT id, 'VS321-I30202-001', 'Sensor Suhu I3.02.02', 'SENSOR', 'environment-sensor', 'I3.02.02', 'secret_vs321_i30202_001', 0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.02'
UNION ALL
SELECT id, 'VS321-I30203-001', 'Sensor Suhu I3.02.03', 'SENSOR', 'environment-sensor', 'I3.02.03', 'secret_vs321_i30203_001', 0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.03'
UNION ALL
SELECT id, 'VS321-I30204-001', 'Sensor Suhu I3.02.04', 'SENSOR', 'environment-sensor', 'I3.02.04', 'secret_vs321_i30204_001', 0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.04'
UNION ALL
SELECT id, 'VS321-I30205-001', 'Sensor Suhu I3.02.05', 'SENSOR', 'environment-sensor', 'I3.02.05', 'secret_vs321_i30205_001', 0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'I3.02.05';

-- ── Ringkasan ──
SELECT c.building AS gedung, c.name AS ruangan, d.device_eui, d.device_type, d.status
FROM classes c JOIN devices d ON d.class_id = c.id
ORDER BY c.name, d.device_type;
