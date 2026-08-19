-- Static-version feature set (permintaan Pak Deddy):
-- master tipe perangkat, penghuni ruangan (untuk notifikasi email di masa
-- depan), dan jadwal ON/OFF otomatis per perangkat.

CREATE TABLE IF NOT EXISTS device_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50) COMMENT 'lighting, power, gateway, sensor, controller, climate, interface',
    icon VARCHAR(50),
    controllable BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_occupants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    notify_email BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    action ENUM('on', 'off') NOT NULL,
    time_of_day TIME NOT NULL,
    days_of_week VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6,7' COMMENT '1=Senin .. 7=Minggu, dipisah koma',
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_device (device_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO device_types (code, label, category, icon, controllable) VALUES
('GATEWAY', 'Gateway LoRaWAN', 'gateway', 'router', FALSE),
('LAMP', 'Smart Wall Switch (Lampu)', 'lighting', 'lightbulb', TRUE),
('SOCKET', 'Smart Socket', 'power', 'plug', FALSE),
('CONTROLLER', 'Control System Box', 'controller', 'cpu', FALSE),
('SENSOR', 'Sensor Presence / Motion & TH', 'sensor', 'radar', FALSE),
('AC', 'Air Conditioner', 'climate', 'wind', TRUE),
('INTERFACE', 'Tablet Kontrol', 'interface', 'tablet', FALSE);
