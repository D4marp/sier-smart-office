-- =============================================================
-- DATA RUANGAN & PERANGKAT — FMIPA (Fakultas Matematika dan IPA)
-- Dijalankan terhadap database smart_energy_fmipa
-- (dibuat oleh scripts/seed_unesa_faculties.js sebagai tenant 'fmipa').
-- Aman dijalankan berulang — INSERT IGNORE berdasarkan UNIQUE key
-- (classes.name, devices.device_eui).
--
-- FMIPA pakai pola UG65+Mini PC (seperti FIP/FIKK), BUKAN TCP langsung
-- dari backend (beda dari FISIPOL) — lihat
-- docs/fmipa-nodered-integration.md. classKey FMIPA sengaja tidak
-- didaftarkan di TARGETS backend/controllers/DeviceController.js, jadi
-- kontrol jatuh ke fallback HTTP Node-RED (getNodeRedClassEndpointUrl).
-- Unit individual (AC A/B, Lampu A/B) dibedakan lewat akhiran "-A"/"-B" di
-- device_name (dibaca controlViaNodeRed lewat regex /-([ABC])$/), SAMA
-- seperti pola FIKK — bukan akhiran numerik -001/-002 seperti FISIPOL.
--
-- 4 ruangan di UG65 LT4 (FMIPA_LT4_Gateway) + 1 ruangan di UG65 LT2
-- (FMIPA_LT2_Gateway). device_eui di bawah adalah EUI LoRaWAN asli (dari
-- network-server kedua UG65), bukan data fiktif.
--
-- Jalankan: mysql -u root smart_energy_fmipa < seed_fmipa.sql
-- =============================================================

USE smart_energy_fmipa;

-- ── 5 Ruangan ──
INSERT IGNORE INTO classes (name, description, building, floor, status) VALUES
('C14.04.02', 'FMIPA - Ruang C14.04.02 (Lantai 4)', 'Gedung C14', 4, 'active'),
('C14.04.05', 'FMIPA - Ruang C14.04.05 (Lantai 4)', 'Gedung C14', 4, 'active'),
('C14.04.08', 'FMIPA - Ruang C14.04.08 (Lantai 4)', 'Gedung C14', 4, 'active'),
('C14.04.09', 'FMIPA - Ruang C14.04.09 (Lantai 4)', 'Gedung C14', 4, 'active'),
('C14.02.03', 'FMIPA - Ruang C14.02.03 (Lantai 2)', 'Gedung C14', 2, 'active');

-- ── Perangkat per ruang: 2x AC (WS523) + 2x Lampu (WS502) + 1x Sensor
--    Okupansi (VS370). Status 'offline'/'registered': terdaftar di sistem,
--    menunggu Node-RED benar-benar di-deploy & mengirim data pertama.
INSERT IGNORE INTO devices
  (class_id, device_eui, device_name, device_type, application_type, location, device_secret, power_rating, current_power, efficiency_rating, status, iot_status)
SELECT id, '24E1241480603858', 'AC Unit C14.04.02-A',    'AC',     'climate-control',   'C14.04.02', 'secret_ws523_c140402_a', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.02'
UNION ALL
SELECT id, '24E124148060C77B', 'AC Unit C14.04.02-B',    'AC',     'climate-control',   'C14.04.02', 'secret_ws523_c140402_b', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.02'
UNION ALL
SELECT id, '24E124771063C28D', 'Lighting C14.04.02-A',   'LAMP',   'lighting-control',  'C14.04.02', 'secret_ws502_c140402_a', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.02'
UNION ALL
SELECT id, '24E124771063354D', 'Lighting C14.04.02-B',   'LAMP',   'lighting-control',  'C14.04.02', 'secret_ws502_c140402_b', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.02'
UNION ALL
SELECT id, '24E1247730636D7B', 'Occupancy Sensor C14.04.02', 'SENSOR', 'occupancy-sensor', 'C14.04.02', 'secret_vs370_c140402',   0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.02'

UNION ALL
SELECT id, '24E124148060EAB9', 'AC Unit C14.04.05-A',    'AC',     'climate-control',   'C14.04.05', 'secret_ws523_c140405_a', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.05'
UNION ALL
SELECT id, '24E12414806097F2', 'AC Unit C14.04.05-B',    'AC',     'climate-control',   'C14.04.05', 'secret_ws523_c140405_b', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.05'
UNION ALL
SELECT id, '24E1247710633F62', 'Lighting C14.04.05-A',   'LAMP',   'lighting-control',  'C14.04.05', 'secret_ws502_c140405_a', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.05'
UNION ALL
SELECT id, '24E124771063F3DB', 'Lighting C14.04.05-B',   'LAMP',   'lighting-control',  'C14.04.05', 'secret_ws502_c140405_b', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.05'
UNION ALL
SELECT id, '24E124773063BC9A', 'Occupancy Sensor C14.04.05', 'SENSOR', 'occupancy-sensor', 'C14.04.05', 'secret_vs370_c140405',   0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.05'

UNION ALL
SELECT id, '24E124148060B53B', 'AC Unit C14.04.08-A',    'AC',     'climate-control',   'C14.04.08', 'secret_ws523_c140408_a', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.08'
UNION ALL
SELECT id, '24E1241480605120', 'AC Unit C14.04.08-B',    'AC',     'climate-control',   'C14.04.08', 'secret_ws523_c140408_b', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.08'
UNION ALL
SELECT id, '24E1247710636DE8', 'Lighting C14.04.08-A',   'LAMP',   'lighting-control',  'C14.04.08', 'secret_ws502_c140408_a', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.08'
UNION ALL
SELECT id, '24E124771063ECF8', 'Lighting C14.04.08-B',   'LAMP',   'lighting-control',  'C14.04.08', 'secret_ws502_c140408_b', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.08'
UNION ALL
SELECT id, '24E124773063969F', 'Occupancy Sensor C14.04.08', 'SENSOR', 'occupancy-sensor', 'C14.04.08', 'secret_vs370_c140408',   0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.08'

UNION ALL
SELECT id, '24E124148060ECFC', 'AC Unit C14.04.09-A',    'AC',     'climate-control',   'C14.04.09', 'secret_ws523_c140409_a', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.09'
UNION ALL
SELECT id, '24E124148060DB65', 'AC Unit C14.04.09-B',    'AC',     'climate-control',   'C14.04.09', 'secret_ws523_c140409_b', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.09'
UNION ALL
SELECT id, '24E124771063C788', 'Lighting C14.04.09-A',   'LAMP',   'lighting-control',  'C14.04.09', 'secret_ws502_c140409_a', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.09'
UNION ALL
SELECT id, '24E124771063962D', 'Lighting C14.04.09-B',   'LAMP',   'lighting-control',  'C14.04.09', 'secret_ws502_c140409_b', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.09'
UNION ALL
SELECT id, '24E124773063D3F2', 'Occupancy Sensor C14.04.09', 'SENSOR', 'occupancy-sensor', 'C14.04.09', 'secret_vs370_c140409',   0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.04.09'

UNION ALL
SELECT id, '24E124148060DAC1', 'AC Unit C14.02.03-A',    'AC',     'climate-control',   'C14.02.03', 'secret_ws523_c140203_a', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.02.03'
UNION ALL
SELECT id, '24E124148060A687', 'AC Unit C14.02.03-B',    'AC',     'climate-control',   'C14.02.03', 'secret_ws523_c140203_b', 3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.02.03'
UNION ALL
SELECT id, '24E124771063A184', 'Lighting C14.02.03-A',   'LAMP',   'lighting-control',  'C14.02.03', 'secret_ws502_c140203_a', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.02.03'
UNION ALL
SELECT id, '24E1247710630C7B', 'Lighting C14.02.03-B',   'LAMP',   'lighting-control',  'C14.02.03', 'secret_ws502_c140203_b', 1.6, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.02.03'
UNION ALL
SELECT id, '24E1247730634F97', 'Occupancy Sensor C14.02.03', 'SENSOR', 'occupancy-sensor', 'C14.02.03', 'secret_vs370_c140203',   0.1, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'C14.02.03';
