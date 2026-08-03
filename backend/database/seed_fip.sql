-- =============================================================
-- DATA RUANGAN & PERANGKAT — FIP (Fakultas Ilmu Pendidikan)
-- Dijalankan terhadap database smart_energy_fip
-- (dibuat oleh scripts/seed_unesa_faculties.js sebagai tenant 'fip').
-- Aman dijalankan berulang — INSERT IGNORE berdasarkan UNIQUE key
-- (classes.name, devices.device_eui).
--
-- Ruangan: "Umum Fakultas" — O2.02.10 s/d O2.02.14
-- Hardware sebenarnya (LoRaWAN Milesight via gateway "FIP_Unesa_Gateway",
-- lihat docs/fip-nodered-integration.md) — BUKAN Broadlink RM4 Pro/ATEN
-- seperti FISIPOL. Per ruang:
--   1x AC       — kontrol via Modbus TCP (gateway USR RS485-Ethernet,
--                 192.168.1.107:502), tidak ada feedback daya (watt) dari AC.
--   1x LAMP     — Milesight WS502 (relay + power monitoring), EUI asli LoRaWAN.
--   1x SENSOR   — Milesight VS370 (occupancy/PIR), EUI asli LoRaWAN.
--
-- Jalankan: mysql -u root smart_energy_fip < seed_fip.sql
-- =============================================================

USE smart_energy_fip;

-- ── 5 Ruang "Umum Fakultas" (Lantai 2) ──
INSERT IGNORE INTO classes (name, description, building, floor, status) VALUES
('O2.02.10', 'Umum Fakultas - Ruang O2.02.10', 'Umum Fakultas', 2, 'active'),
('O2.02.11', 'Umum Fakultas - Ruang O2.02.11', 'Umum Fakultas', 2, 'active'),
('O2.02.12', 'Umum Fakultas - Ruang O2.02.12', 'Umum Fakultas', 2, 'active'),
('O2.02.13', 'Umum Fakultas - Ruang O2.02.13', 'Umum Fakultas', 2, 'active'),
('O2.02.14', 'Umum Fakultas - Ruang O2.02.14', 'Umum Fakultas', 2, 'active');

-- ── Bersihkan device placeholder lama (asumsi Broadlink 2xAC+2xLampu yang
--    salah, dibuat sebelum hardware sebenarnya diketahui) ──
DELETE FROM devices WHERE device_eui IN (
  'AC-O20210-001','AC-O20210-002','LAMP-O20210-001','LAMP-O20210-002','VS321-O20210-001',
  'AC-O20211-001','AC-O20211-002','LAMP-O20211-001','LAMP-O20211-002','VS321-O20211-001',
  'AC-O20212-001','AC-O20212-002','LAMP-O20212-001','LAMP-O20212-002','VS321-O20212-001',
  'AC-O20213-001','AC-O20213-002','LAMP-O20213-001','LAMP-O20213-002','VS321-O20213-001',
  'AC-O20214-001','AC-O20214-002','LAMP-O20214-001','LAMP-O20214-002','VS321-O20214-001'
);

-- ── Perangkat sebenarnya per ruang (1x AC modbus + 1x WS502 lampu + 1x VS370 sensor) ──
-- Status 'offline'/'registered' -> update ke 'active'/'registered' oleh
-- Node-RED (via PATCH /devices/:id/status) begitu perangkat online.
INSERT IGNORE INTO devices
  (class_id, device_eui, device_name, device_type, application_type, location, device_secret, power_rating, current_power, efficiency_rating, status, iot_status)
SELECT id, 'AC-MODBUS-O20210',  'AC O2.02.10',        'AC',     'climate-control',    'O2.02.10', 'secret_ac_o20210',  3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.10'
UNION ALL
SELECT id, '24E124771057E2BB', 'Lighting O2.02.10 (WS502)', 'LAMP', 'lighting-control', 'O2.02.10', 'secret_lamp_o20210', 0.06, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.10'
UNION ALL
SELECT id, '24E12477306168FB', 'Sensor Okupansi O2.02.10 (VS370)', 'SENSOR', 'occupancy-sensor', 'O2.02.10', 'secret_vs370_o20210', 0.01, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.10'
UNION ALL
SELECT id, 'AC-MODBUS-O20211',  'AC O2.02.11',        'AC',     'climate-control',    'O2.02.11', 'secret_ac_o20211',  3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.11'
UNION ALL
SELECT id, '24E1247710632D66', 'Lighting O2.02.11 (WS502)', 'LAMP', 'lighting-control', 'O2.02.11', 'secret_lamp_o20211', 0.06, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.11'
UNION ALL
SELECT id, '24E1247730612192', 'Sensor Okupansi O2.02.11 (VS370)', 'SENSOR', 'occupancy-sensor', 'O2.02.11', 'secret_vs370_o20211', 0.01, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.11'
UNION ALL
SELECT id, 'AC-MODBUS-O20212',  'AC O2.02.12',        'AC',     'climate-control',    'O2.02.12', 'secret_ac_o20212',  3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.12'
UNION ALL
SELECT id, '24E1247710578A86', 'Lighting O2.02.12 (WS502)', 'LAMP', 'lighting-control', 'O2.02.12', 'secret_lamp_o20212', 0.06, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.12'
UNION ALL
SELECT id, '24E1247730613C14', 'Sensor Okupansi O2.02.12 (VS370)', 'SENSOR', 'occupancy-sensor', 'O2.02.12', 'secret_vs370_o20212', 0.01, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.12'
UNION ALL
SELECT id, 'AC-MODBUS-O20213',  'AC O2.02.13',        'AC',     'climate-control',    'O2.02.13', 'secret_ac_o20213',  3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.13'
UNION ALL
SELECT id, '24E124771063A624', 'Lighting O2.02.13 (WS502)', 'LAMP', 'lighting-control', 'O2.02.13', 'secret_lamp_o20213', 0.06, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.13'
UNION ALL
SELECT id, '24E124773061DB97', 'Sensor Okupansi O2.02.13 (VS370)', 'SENSOR', 'occupancy-sensor', 'O2.02.13', 'secret_vs370_o20213', 0.01, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.13'
UNION ALL
SELECT id, 'AC-MODBUS-O20214',  'AC O2.02.14',        'AC',     'climate-control',    'O2.02.14', 'secret_ac_o20214',  3.0, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.14'
UNION ALL
SELECT id, '24E124771057C1CF', 'Lighting O2.02.14 (WS502)', 'LAMP', 'lighting-control', 'O2.02.14', 'secret_lamp_o20214', 0.06, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.14'
UNION ALL
SELECT id, '24E1247730613617', 'Sensor Okupansi O2.02.14 (VS370)', 'SENSOR', 'occupancy-sensor', 'O2.02.14', 'secret_vs370_o20214', 0.01, 0, 0, 'offline', 'registered' FROM classes WHERE name = 'O2.02.14';

-- ── Ringkasan ──
SELECT c.building AS gedung, c.name AS ruangan, d.device_eui, d.device_type, d.status
FROM classes c JOIN devices d ON d.class_id = c.id
ORDER BY c.name, d.device_type;
