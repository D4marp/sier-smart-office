-- SIER smart office room & device seed data
-- Generated from "Bagan Smart Meeting Room ICT" (Divisi Teknologi Informasi dan Komunikasi, PT SIER)
-- Replaces the old UNESA per-faculty classroom seed data.

-- Rooms
INSERT INTO classes (name, description, building, floor, capacity, status) VALUES
('Ruang Meeting Red', 'Ruang meeting SIER dengan kontrol lampu, soket, dan sensor presence via tablet Android', 'Gedung Kantor SIER', NULL, 10, 'active'),
('Ruang Meeting Green', 'Ruang meeting SIER dengan kontrol lampu, soket, dan sensor presence via tablet Android', 'Gedung Kantor SIER', NULL, 10, 'active'),
('Ruang Meeting Blue', 'Ruang meeting SIER dengan kontrol lampu, soket, dan sensor presence via tablet Android', 'Gedung Kantor SIER', NULL, 10, 'active'),
('Tambahan Ruang Lt 4', 'Penambahan sensor IoT lantai 4: gateway, panel switch, sensor presence, dan 6 smart socket', 'Gedung Kantor SIER', 4, NULL, 'active'),
('Ruang Direksi RDP', 'Ruang direksi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 6, 'active'),
('Ruang Direksi RRW', 'Ruang direksi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 6, 'active'),
('Lantai 5 Toilet 1', 'Monitoring motion, suhu/kelembapan, dan energi AC toilet lantai 5', 'Gedung Kantor SIER', 5, NULL, 'active'),
('Lantai 5 Toilet 2', 'Monitoring motion, suhu/kelembapan, dan energi AC toilet lantai 5', 'Gedung Kantor SIER', 5, NULL, 'active'),
('Ruang Kadiv 1', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 2', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 3', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 4', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 5', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 6', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 7', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 8', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 9', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 10', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active'),
('Ruang Kadiv 11', 'Ruang kepala divisi dengan kontrol lampu, AC (Broadlink RM4 Pro), dan sensor presence', 'Gedung Kantor SIER', NULL, 3, 'active');

-- Devices
-- Ruang Meeting Red
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-UG65-01', 'Gateway LoRaWAN Ruang Meeting Red', 'GATEWAY', 'lorawan-gateway', 'Ruang Meeting Red', 'secret_red-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Red';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-WS502-01', 'Smart Wall Switch Ruang Meeting Red', 'LAMP', 'lighting-control', 'Ruang Meeting Red', 'secret_red-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Meeting Red';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-VK2200-01', 'Control System Box Ruang Meeting Red', 'CONTROLLER', 'room-control', 'Ruang Meeting Red', 'secret_red-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Meeting Red';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-TABLET-01', 'Tablet Kontrol Ruang Meeting Red', 'INTERFACE', 'control-interface', 'Ruang Meeting Red', 'secret_red-tablet-01', 'Generic', 'Android Tablet', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Red';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-VS370-01', 'Presence Sensor Ruang Meeting Red', 'SENSOR', 'presence-sensor', 'Ruang Meeting Red', 'secret_red-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Red';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-VS321-01', 'Wall Presence Sensor Ruang Meeting Red', 'SENSOR', 'presence-sensor', 'Ruang Meeting Red', 'secret_red-vs321-01', 'Milesight', 'VS321', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Red';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RED-WS523-01', 'Smart Socket Ruang Meeting Red', 'SOCKET', 'energy-monitor', 'Ruang Meeting Red', 'secret_red-ws523-01', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Meeting Red';

-- Ruang Meeting Green
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-UG65-01', 'Gateway LoRaWAN Ruang Meeting Green', 'GATEWAY', 'lorawan-gateway', 'Ruang Meeting Green', 'secret_grn-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Green';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-WS502-01', 'Smart Wall Switch Ruang Meeting Green', 'LAMP', 'lighting-control', 'Ruang Meeting Green', 'secret_grn-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Meeting Green';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-VK2200-01', 'Control System Box Ruang Meeting Green', 'CONTROLLER', 'room-control', 'Ruang Meeting Green', 'secret_grn-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Meeting Green';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-TABLET-01', 'Tablet Kontrol Ruang Meeting Green', 'INTERFACE', 'control-interface', 'Ruang Meeting Green', 'secret_grn-tablet-01', 'Generic', 'Android Tablet', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Green';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-VS370-01', 'Presence Sensor Ruang Meeting Green', 'SENSOR', 'presence-sensor', 'Ruang Meeting Green', 'secret_grn-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Green';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-VS321-01', 'Wall Presence Sensor Ruang Meeting Green', 'SENSOR', 'presence-sensor', 'Ruang Meeting Green', 'secret_grn-vs321-01', 'Milesight', 'VS321', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Green';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'GRN-WS523-01', 'Smart Socket Ruang Meeting Green', 'SOCKET', 'energy-monitor', 'Ruang Meeting Green', 'secret_grn-ws523-01', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Meeting Green';

-- Ruang Meeting Blue
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-UG65-01', 'Gateway LoRaWAN Ruang Meeting Blue', 'GATEWAY', 'lorawan-gateway', 'Ruang Meeting Blue', 'secret_blu-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-WS502-01', 'Smart Wall Switch Ruang Meeting Blue', 'LAMP', 'lighting-control', 'Ruang Meeting Blue', 'secret_blu-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-VK2200-01', 'Control System Box Ruang Meeting Blue', 'CONTROLLER', 'room-control', 'Ruang Meeting Blue', 'secret_blu-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-TABLET-01', 'Tablet Kontrol Ruang Meeting Blue', 'INTERFACE', 'control-interface', 'Ruang Meeting Blue', 'secret_blu-tablet-01', 'Generic', 'Android Tablet', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-VS370-01', 'Presence Sensor Ruang Meeting Blue 1', 'SENSOR', 'presence-sensor', 'Ruang Meeting Blue', 'secret_blu-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-VS370-02', 'Presence Sensor Ruang Meeting Blue 2', 'SENSOR', 'presence-sensor', 'Ruang Meeting Blue', 'secret_blu-vs370-02', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-VS321-01', 'Wall Presence Sensor Ruang Meeting Blue', 'SENSOR', 'presence-sensor', 'Ruang Meeting Blue', 'secret_blu-vs321-01', 'Milesight', 'VS321', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'BLU-WS523-01', 'Smart Socket Ruang Meeting Blue', 'SOCKET', 'energy-monitor', 'Ruang Meeting Blue', 'secret_blu-ws523-01', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Meeting Blue';

-- Tambahan Ruang Lt 4
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS203-01', 'Smart Panel Switch Lt 4', 'LAMP', 'lighting-control', 'Tambahan Ruang Lt 4', 'secret_l4-ws203-01', 'Milesight', 'WS203', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-UG65-01', 'Gateway LoRaWAN Lt 4', 'GATEWAY', 'lorawan-gateway', 'Tambahan Ruang Lt 4', 'secret_l4-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-VS321-01', 'Wall Presence Sensor Lt 4', 'SENSOR', 'presence-sensor', 'Tambahan Ruang Lt 4', 'secret_l4-vs321-01', 'Milesight', 'VS321', 0.1, 100, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS523-01', 'Smart Socket Lt 4 1', 'SOCKET', 'energy-monitor', 'Tambahan Ruang Lt 4', 'secret_l4-ws523-01', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS523-02', 'Smart Socket Lt 4 2', 'SOCKET', 'energy-monitor', 'Tambahan Ruang Lt 4', 'secret_l4-ws523-02', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS523-03', 'Smart Socket Lt 4 3', 'SOCKET', 'energy-monitor', 'Tambahan Ruang Lt 4', 'secret_l4-ws523-03', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS523-04', 'Smart Socket Lt 4 4', 'SOCKET', 'energy-monitor', 'Tambahan Ruang Lt 4', 'secret_l4-ws523-04', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS523-05', 'Smart Socket Lt 4 5', 'SOCKET', 'energy-monitor', 'Tambahan Ruang Lt 4', 'secret_l4-ws523-05', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'L4-WS523-06', 'Smart Socket Lt 4 6', 'SOCKET', 'energy-monitor', 'Tambahan Ruang Lt 4', 'secret_l4-ws523-06', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Tambahan Ruang Lt 4';

-- Ruang Direksi RDP
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-UG65-01', 'Gateway LoRaWAN Ruang Direksi RDP', 'GATEWAY', 'lorawan-gateway', 'Ruang Direksi RDP', 'secret_rdp-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-WS502-01', 'Smart Wall Switch Ruang Direksi RDP 1', 'LAMP', 'lighting-control', 'Ruang Direksi RDP', 'secret_rdp-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-WS502-02', 'Smart Wall Switch Ruang Direksi RDP 2', 'LAMP', 'lighting-control', 'Ruang Direksi RDP', 'secret_rdp-ws502-02', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-WS501-01', 'Smart Wall Switch 1-Gang Ruang Direksi RDP', 'LAMP', 'lighting-control', 'Ruang Direksi RDP', 'secret_rdp-ws501-01', 'Milesight', 'WS501', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-VK2200-01', 'Control System Box Ruang Direksi RDP', 'CONTROLLER', 'room-control', 'Ruang Direksi RDP', 'secret_rdp-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-VS321-01', 'Wall Presence Sensor Ruang Direksi RDP', 'SENSOR', 'presence-sensor', 'Ruang Direksi RDP', 'secret_rdp-vs321-01', 'Milesight', 'VS321', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-VS370-01', 'Presence Sensor Ruang Direksi RDP', 'SENSOR', 'presence-sensor', 'Ruang Direksi RDP', 'secret_rdp-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-RM4PRO-01', 'IR Controller AC Ruang Direksi RDP 1', 'CONTROLLER', 'climate-control', 'Ruang Direksi RDP', 'secret_rdp-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-RM4PRO-02', 'IR Controller AC Ruang Direksi RDP 2', 'CONTROLLER', 'climate-control', 'Ruang Direksi RDP', 'secret_rdp-rm4pro-02', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-AC-01', 'AC Unit Ruang Direksi RDP 1', 'AC', 'climate-control', 'Ruang Direksi RDP', 'secret_rdp-ac-01', 'Generic', 'Split AC', 1.5, 90, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-AC-02', 'AC Unit Ruang Direksi RDP 2', 'AC', 'climate-control', 'Ruang Direksi RDP', 'secret_rdp-ac-02', 'Generic', 'Split AC', 1.5, 90, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-WS523-01', 'Smart Socket Ruang Direksi RDP 1', 'SOCKET', 'energy-monitor', 'Ruang Direksi RDP', 'secret_rdp-ws523-01', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RDP-WS523-02', 'Smart Socket Ruang Direksi RDP 2', 'SOCKET', 'energy-monitor', 'Ruang Direksi RDP', 'secret_rdp-ws523-02', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RDP';

-- Ruang Direksi RRW
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-UG65-01', 'Gateway LoRaWAN Ruang Direksi RRW', 'GATEWAY', 'lorawan-gateway', 'Ruang Direksi RRW', 'secret_rrw-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-WS502-01', 'Smart Wall Switch Ruang Direksi RRW 1', 'LAMP', 'lighting-control', 'Ruang Direksi RRW', 'secret_rrw-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-WS502-02', 'Smart Wall Switch Ruang Direksi RRW 2', 'LAMP', 'lighting-control', 'Ruang Direksi RRW', 'secret_rrw-ws502-02', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-WS501-01', 'Smart Wall Switch 1-Gang Ruang Direksi RRW', 'LAMP', 'lighting-control', 'Ruang Direksi RRW', 'secret_rrw-ws501-01', 'Milesight', 'WS501', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-VK2200-01', 'Control System Box Ruang Direksi RRW', 'CONTROLLER', 'room-control', 'Ruang Direksi RRW', 'secret_rrw-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-VS321-01', 'Wall Presence Sensor Ruang Direksi RRW', 'SENSOR', 'presence-sensor', 'Ruang Direksi RRW', 'secret_rrw-vs321-01', 'Milesight', 'VS321', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-VS370-01', 'Presence Sensor Ruang Direksi RRW 1', 'SENSOR', 'presence-sensor', 'Ruang Direksi RRW', 'secret_rrw-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-VS370-02', 'Presence Sensor Ruang Direksi RRW 2', 'SENSOR', 'presence-sensor', 'Ruang Direksi RRW', 'secret_rrw-vs370-02', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-RM4PRO-01', 'IR Controller AC Ruang Direksi RRW 1', 'CONTROLLER', 'climate-control', 'Ruang Direksi RRW', 'secret_rrw-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-RM4PRO-02', 'IR Controller AC Ruang Direksi RRW 2', 'CONTROLLER', 'climate-control', 'Ruang Direksi RRW', 'secret_rrw-rm4pro-02', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-AC-01', 'AC Unit Ruang Direksi RRW 1', 'AC', 'climate-control', 'Ruang Direksi RRW', 'secret_rrw-ac-01', 'Generic', 'Split AC', 1.5, 90, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-AC-02', 'AC Unit Ruang Direksi RRW 2', 'AC', 'climate-control', 'Ruang Direksi RRW', 'secret_rrw-ac-02', 'Generic', 'Split AC', 1.5, 90, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-WS523-01', 'Smart Socket Ruang Direksi RRW 1', 'SOCKET', 'energy-monitor', 'Ruang Direksi RRW', 'secret_rrw-ws523-01', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'RRW-WS523-02', 'Smart Socket Ruang Direksi RRW 2', 'SOCKET', 'energy-monitor', 'Ruang Direksi RRW', 'secret_rrw-ws523-02', 'Milesight', 'WS523', 0, 96, 'active' FROM classes WHERE name = 'Ruang Direksi RRW';

-- Lantai 5 Toilet 1
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-UG65-01', 'Gateway LoRaWAN Lantai 5 Toilet 1', 'GATEWAY', 'lorawan-gateway', 'Lantai 5 Toilet 1', 'secret_t5a-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-WS502-01', 'Smart Wall Switch Lantai 5 Toilet 1 1', 'LAMP', 'lighting-control', 'Lantai 5 Toilet 1', 'secret_t5a-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-WS502-02', 'Smart Wall Switch Lantai 5 Toilet 1 2', 'LAMP', 'lighting-control', 'Lantai 5 Toilet 1', 'secret_t5a-ws502-02', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-WS502-03', 'Smart Wall Switch Lantai 5 Toilet 1 3', 'LAMP', 'lighting-control', 'Lantai 5 Toilet 1', 'secret_t5a-ws502-03', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-VS330-01', 'Motion & TH Sensor Lantai 5 Toilet 1 1', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 1', 'secret_t5a-vs330-01', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-VS330-02', 'Motion & TH Sensor Lantai 5 Toilet 1 2', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 1', 'secret_t5a-vs330-02', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-VS330-03', 'Motion & TH Sensor Lantai 5 Toilet 1 3', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 1', 'secret_t5a-vs330-03', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5A-VS330-04', 'Motion & TH Sensor Lantai 5 Toilet 1 4', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 1', 'secret_t5a-vs330-04', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 1';

-- Lantai 5 Toilet 2
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-UG65-01', 'Gateway LoRaWAN Lantai 5 Toilet 2', 'GATEWAY', 'lorawan-gateway', 'Lantai 5 Toilet 2', 'secret_t5b-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-WS502-01', 'Smart Wall Switch Lantai 5 Toilet 2 1', 'LAMP', 'lighting-control', 'Lantai 5 Toilet 2', 'secret_t5b-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-WS502-02', 'Smart Wall Switch Lantai 5 Toilet 2 2', 'LAMP', 'lighting-control', 'Lantai 5 Toilet 2', 'secret_t5b-ws502-02', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-WS502-03', 'Smart Wall Switch Lantai 5 Toilet 2 3', 'LAMP', 'lighting-control', 'Lantai 5 Toilet 2', 'secret_t5b-ws502-03', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-VS330-01', 'Motion & TH Sensor Lantai 5 Toilet 2 1', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 2', 'secret_t5b-vs330-01', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-VS330-02', 'Motion & TH Sensor Lantai 5 Toilet 2 2', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 2', 'secret_t5b-vs330-02', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-VS330-03', 'Motion & TH Sensor Lantai 5 Toilet 2 3', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 2', 'secret_t5b-vs330-03', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'T5B-VS330-04', 'Motion & TH Sensor Lantai 5 Toilet 2 4', 'SENSOR', 'environment-sensor', 'Lantai 5 Toilet 2', 'secret_t5b-vs330-04', 'Milesight', 'VS330', 0.1, 100, 'active' FROM classes WHERE name = 'Lantai 5 Toilet 2';

-- Ruang Kadiv 1
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV01-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 1', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 1', 'secret_kdv01-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV01-WS502-01', 'Smart Wall Switch Ruang Kadiv 1', 'LAMP', 'lighting-control', 'Ruang Kadiv 1', 'secret_kdv01-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV01-VK2200-01', 'Control System Box Ruang Kadiv 1', 'CONTROLLER', 'room-control', 'Ruang Kadiv 1', 'secret_kdv01-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV01-VS370-01', 'Presence Sensor Ruang Kadiv 1', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 1', 'secret_kdv01-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 1';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV01-RM4PRO-01', 'IR Controller AC Ruang Kadiv 1', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 1', 'secret_kdv01-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 1';

-- Ruang Kadiv 2
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV02-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 2', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 2', 'secret_kdv02-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV02-WS502-01', 'Smart Wall Switch Ruang Kadiv 2', 'LAMP', 'lighting-control', 'Ruang Kadiv 2', 'secret_kdv02-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV02-VK2200-01', 'Control System Box Ruang Kadiv 2', 'CONTROLLER', 'room-control', 'Ruang Kadiv 2', 'secret_kdv02-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV02-VS370-01', 'Presence Sensor Ruang Kadiv 2', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 2', 'secret_kdv02-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 2';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV02-RM4PRO-01', 'IR Controller AC Ruang Kadiv 2', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 2', 'secret_kdv02-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 2';

-- Ruang Kadiv 3
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV03-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 3', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 3', 'secret_kdv03-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 3';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV03-WS502-01', 'Smart Wall Switch Ruang Kadiv 3', 'LAMP', 'lighting-control', 'Ruang Kadiv 3', 'secret_kdv03-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 3';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV03-VK2200-01', 'Control System Box Ruang Kadiv 3', 'CONTROLLER', 'room-control', 'Ruang Kadiv 3', 'secret_kdv03-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 3';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV03-VS370-01', 'Presence Sensor Ruang Kadiv 3', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 3', 'secret_kdv03-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 3';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV03-RM4PRO-01', 'IR Controller AC Ruang Kadiv 3', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 3', 'secret_kdv03-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 3';

-- Ruang Kadiv 4
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV04-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 4', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 4', 'secret_kdv04-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV04-WS502-01', 'Smart Wall Switch Ruang Kadiv 4', 'LAMP', 'lighting-control', 'Ruang Kadiv 4', 'secret_kdv04-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV04-VK2200-01', 'Control System Box Ruang Kadiv 4', 'CONTROLLER', 'room-control', 'Ruang Kadiv 4', 'secret_kdv04-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV04-VS370-01', 'Presence Sensor Ruang Kadiv 4', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 4', 'secret_kdv04-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 4';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV04-RM4PRO-01', 'IR Controller AC Ruang Kadiv 4', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 4', 'secret_kdv04-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 4';

-- Ruang Kadiv 5
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV05-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 5', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 5', 'secret_kdv05-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 5';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV05-WS502-01', 'Smart Wall Switch Ruang Kadiv 5', 'LAMP', 'lighting-control', 'Ruang Kadiv 5', 'secret_kdv05-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 5';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV05-VK2200-01', 'Control System Box Ruang Kadiv 5', 'CONTROLLER', 'room-control', 'Ruang Kadiv 5', 'secret_kdv05-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 5';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV05-VS370-01', 'Presence Sensor Ruang Kadiv 5', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 5', 'secret_kdv05-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 5';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV05-RM4PRO-01', 'IR Controller AC Ruang Kadiv 5', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 5', 'secret_kdv05-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 5';

-- Ruang Kadiv 6
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV06-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 6', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 6', 'secret_kdv06-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 6';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV06-WS502-01', 'Smart Wall Switch Ruang Kadiv 6', 'LAMP', 'lighting-control', 'Ruang Kadiv 6', 'secret_kdv06-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 6';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV06-VK2200-01', 'Control System Box Ruang Kadiv 6', 'CONTROLLER', 'room-control', 'Ruang Kadiv 6', 'secret_kdv06-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 6';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV06-VS370-01', 'Presence Sensor Ruang Kadiv 6', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 6', 'secret_kdv06-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 6';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV06-RM4PRO-01', 'IR Controller AC Ruang Kadiv 6', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 6', 'secret_kdv06-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 6';

-- Ruang Kadiv 7
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV07-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 7', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 7', 'secret_kdv07-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 7';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV07-WS502-01', 'Smart Wall Switch Ruang Kadiv 7', 'LAMP', 'lighting-control', 'Ruang Kadiv 7', 'secret_kdv07-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 7';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV07-VK2200-01', 'Control System Box Ruang Kadiv 7', 'CONTROLLER', 'room-control', 'Ruang Kadiv 7', 'secret_kdv07-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 7';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV07-VS370-01', 'Presence Sensor Ruang Kadiv 7', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 7', 'secret_kdv07-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 7';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV07-RM4PRO-01', 'IR Controller AC Ruang Kadiv 7', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 7', 'secret_kdv07-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 7';

-- Ruang Kadiv 8
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV08-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 8', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 8', 'secret_kdv08-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 8';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV08-WS502-01', 'Smart Wall Switch Ruang Kadiv 8', 'LAMP', 'lighting-control', 'Ruang Kadiv 8', 'secret_kdv08-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 8';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV08-VK2200-01', 'Control System Box Ruang Kadiv 8', 'CONTROLLER', 'room-control', 'Ruang Kadiv 8', 'secret_kdv08-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 8';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV08-VS370-01', 'Presence Sensor Ruang Kadiv 8', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 8', 'secret_kdv08-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 8';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV08-RM4PRO-01', 'IR Controller AC Ruang Kadiv 8', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 8', 'secret_kdv08-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 8';

-- Ruang Kadiv 9
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV09-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 9', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 9', 'secret_kdv09-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 9';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV09-WS502-01', 'Smart Wall Switch Ruang Kadiv 9', 'LAMP', 'lighting-control', 'Ruang Kadiv 9', 'secret_kdv09-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 9';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV09-VK2200-01', 'Control System Box Ruang Kadiv 9', 'CONTROLLER', 'room-control', 'Ruang Kadiv 9', 'secret_kdv09-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 9';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV09-VS370-01', 'Presence Sensor Ruang Kadiv 9', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 9', 'secret_kdv09-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 9';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV09-RM4PRO-01', 'IR Controller AC Ruang Kadiv 9', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 9', 'secret_kdv09-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 9';

-- Ruang Kadiv 10
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV10-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 10', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 10', 'secret_kdv10-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 10';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV10-WS502-01', 'Smart Wall Switch Ruang Kadiv 10', 'LAMP', 'lighting-control', 'Ruang Kadiv 10', 'secret_kdv10-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 10';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV10-VK2200-01', 'Control System Box Ruang Kadiv 10', 'CONTROLLER', 'room-control', 'Ruang Kadiv 10', 'secret_kdv10-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 10';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV10-VS370-01', 'Presence Sensor Ruang Kadiv 10', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 10', 'secret_kdv10-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 10';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV10-RM4PRO-01', 'IR Controller AC Ruang Kadiv 10', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 10', 'secret_kdv10-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 10';

-- Ruang Kadiv 11
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV11-UG65-01', 'Gateway LoRaWAN Ruang Kadiv 11', 'GATEWAY', 'lorawan-gateway', 'Ruang Kadiv 11', 'secret_kdv11-ug65-01', 'Milesight', 'UG65', 0.01, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 11';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV11-WS502-01', 'Smart Wall Switch Ruang Kadiv 11', 'LAMP', 'lighting-control', 'Ruang Kadiv 11', 'secret_kdv11-ws502-01', 'Milesight', 'WS502', 0, 96, 'active' FROM classes WHERE name = 'Ruang Kadiv 11';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV11-VK2200-01', 'Control System Box Ruang Kadiv 11', 'CONTROLLER', 'room-control', 'Ruang Kadiv 11', 'secret_kdv11-vk2200-01', 'ATEN', 'VK2200', 0.02, 97, 'active' FROM classes WHERE name = 'Ruang Kadiv 11';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV11-VS370-01', 'Presence Sensor Ruang Kadiv 11', 'SENSOR', 'presence-sensor', 'Ruang Kadiv 11', 'secret_kdv11-vs370-01', 'Milesight', 'VS370', 0.1, 100, 'active' FROM classes WHERE name = 'Ruang Kadiv 11';
INSERT INTO devices (class_id, device_eui, device_name, device_type, application_type, location, device_secret, brand, model, power_rating, efficiency_rating, iot_status)
SELECT id, 'KDV11-RM4PRO-01', 'IR Controller AC Ruang Kadiv 11', 'CONTROLLER', 'climate-control', 'Ruang Kadiv 11', 'secret_kdv11-rm4pro-01', 'Broadlink', 'RM4 Pro', 0.01, 98, 'active' FROM classes WHERE name = 'Ruang Kadiv 11';


