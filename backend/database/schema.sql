-- Create database
CREATE DATABASE IF NOT EXISTS smart_energy_sier;
USE smart_energy_sier;

-- Classes/Ruangan table
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kelas A, Kelas B, etc',
    description VARCHAR(255),
    location VARCHAR(100),
    building VARCHAR(50),
    floor INT,
    area DECIMAL(10, 2) COMMENT 'Area in square meters',
    capacity INT COMMENT 'Student capacity',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IoT Devices table - stores devices connected via IoT platform
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    device_eui VARCHAR(50) NOT NULL UNIQUE COMMENT 'IoT Device EUI - unique identifier from IoT platform',
    device_name VARCHAR(100) NOT NULL COMMENT 'Human-readable device name',
    device_type VARCHAR(50) NOT NULL COMMENT 'AC, LAMP, HEATER, SENSOR, etc',
    application_type VARCHAR(100) COMMENT 'Application type from IoT (e.g., energy-monitor, climate-control)',
    location VARCHAR(255) NOT NULL COMMENT 'Physical location/room',
    device_secret VARCHAR(255) COMMENT 'Authentication token for IoT communication',
    brand VARCHAR(100),
    model VARCHAR(100),
    power_rating DECIMAL(10, 2) COMMENT 'Power rating in kW',
    current_power DECIMAL(10, 2) DEFAULT 0,
    current_temperature DECIMAL(5, 2) DEFAULT NULL,
    efficiency_rating INT DEFAULT 0 COMMENT 'Percentage',
    status ENUM('active', 'idle', 'offline', 'maintenance') DEFAULT 'offline' COMMENT 'Device status',
    iot_status ENUM('registered', 'active', 'inactive', 'error') DEFAULT 'registered' COMMENT 'IoT platform status',
    last_reading TIMESTAMP NULL,
    last_heartbeat TIMESTAMP NULL COMMENT 'Last IoT heartbeat/connectivity check',
    installation_date DATE,
    warranty_expiry DATE,
    notes TEXT,
    metadata JSON COMMENT 'IoT device metadata and configuration',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_class (class_id),
    INDEX idx_device_eui (device_eui),
    INDEX idx_device_type (device_type),
    INDEX idx_status (status),
    INDEX idx_iot_status (iot_status),
    INDEX idx_location (location),
    INDEX idx_name (device_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Device Consumption Data (Hourly) - stores data from IoT uplink messages
CREATE TABLE IF NOT EXISTS device_consumption (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NULL,
    id_class CHAR(2) NULL COMMENT 'Last two digits of class name, e.g. Q1.01.02 -> 02',
    occupancy TINYINT(1) NULL COMMENT '0/1 occupancy flag, nullable when unavailable',
    power_ac DECIMAL(10, 4) DEFAULT NULL COMMENT 'AC power in kW',
    power_lamp DECIMAL(10, 4) DEFAULT NULL COMMENT 'Lamp power in kW',
    consumption DECIMAL(10, 4) DEFAULT NULL COMMENT 'Total power consumption in kW',
    consumption_date DATE NOT NULL,
    hour_start TIME NOT NULL,
    hour_end TIME NOT NULL,
    temperature DECIMAL(10, 4) DEFAULT NULL COMMENT 'Temperature from IoT sensor',
    humidity DECIMAL(10, 4) DEFAULT NULL COMMENT 'Humidity from IoT sensor',
    payload JSON COMMENT 'Raw IoT payload data',
    message_id VARCHAR(100) COMMENT 'IoT message unique identifier',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE KEY unique_consumption_device (device_id, consumption_date, hour_start),
    UNIQUE KEY unique_consumption_class (id_class, consumption_date, hour_start),
    INDEX idx_device (device_id),
    INDEX idx_class (id_class),
    INDEX idx_date (consumption_date),
    INDEX idx_datetime (consumption_date, hour_start),
    INDEX idx_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE TRIGGER trg_device_consumption_before_insert
BEFORE INSERT ON device_consumption
FOR EACH ROW
BEGIN
    IF NEW.id_class IS NOT NULL THEN
        SET NEW.id_class = RIGHT(TRIM(NEW.id_class), 2);
    END IF;

    IF NEW.consumption IS NULL THEN
        SET NEW.consumption = COALESCE(NEW.power_ac, 0) + COALESCE(NEW.power_lamp, 0);
    END IF;

    IF NEW.consumption_date IS NULL THEN
        SET NEW.consumption_date = CURDATE();
    END IF;

    IF NEW.hour_start IS NULL THEN
        SET NEW.hour_start = TIME(NOW());
    END IF;

    IF NEW.hour_end IS NULL THEN
        SET NEW.hour_end = ADDTIME(NEW.hour_start, '01:00:00');
    END IF;
END$$

DELIMITER ;

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT,
    class_id INT,
    type ENUM('warning', 'error', 'success', 'info') DEFAULT 'info',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('active', 'resolved', 'acknowledged') DEFAULT 'active',
    read_status BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_read (read_status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(255),
    data_type ENUM('string', 'integer', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(255),
    editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    language VARCHAR(10) DEFAULT 'id',
    theme VARCHAR(20) DEFAULT 'light',
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    alert_severity VARCHAR(50) DEFAULT 'high',
    consumption_threshold DECIMAL(10, 2) DEFAULT 15,
    temperature_threshold DECIMAL(5, 2) DEFAULT 70,
    cost_threshold DECIMAL(10, 2) DEFAULT 50000,
    two_factor BOOLEAN DEFAULT FALSE,
    session_timeout INT DEFAULT 30,
    auto_logout BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table for SaaS login and user management
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IoT Uplink Messages - stores incoming data from IoT devices
CREATE TABLE IF NOT EXISTS iot_uplink_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT,
    device_eui VARCHAR(50) NOT NULL,
    application_type VARCHAR(100),
    payload JSON NOT NULL COMMENT 'Raw unprocessed IoT payload',
    decoded_payload JSON COMMENT 'Decoded/processed payload',
    signal_strength INT COMMENT 'Signal strength (dBm)',
    battery_level INT COMMENT 'Battery level (%)',
    frame_counter INT COMMENT 'Frame counter from IoT device',
    received_at TIMESTAMP NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_device (device_id),
    INDEX idx_device_eui (device_eui),
    INDEX idx_received (received_at),
    INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IoT Downlink Messages - stores outgoing commands to IoT devices
CREATE TABLE IF NOT EXISTS iot_downlink_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    device_eui VARCHAR(50) NOT NULL,
    command VARCHAR(255) NOT NULL COMMENT 'Device command: on, off, set_threshold, etc',
    payload JSON NOT NULL COMMENT 'Command payload',
    status ENUM('pending', 'sent', 'acked', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    acked_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_device (device_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ruangan & perangkat SIER: jalankan backend/database/seed_sier.sql setelah
-- schema ini, berisi 19 ruangan (Ruang Meeting Red/Green/Blue, Ruang Direksi
-- RDP/RRW, Ruang Kadiv 1-11, Toilet Lt 5, Tambahan Ruang Lt 4) dan seluruh
-- perangkat Milesight/ATEN/Broadlink sesuai bagan Smart Meeting Room ICT.

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, data_type, description) VALUES
('timezone', 'Asia/Jakarta', 'string', 'Default timezone'),
('language', 'id', 'string', 'Default language'),
('theme', 'light', 'string', 'Default theme'),
('consumption_alert_threshold', '15', 'integer', 'Alert threshold for consumption'),
('temperature_alert_threshold', '70', 'integer', 'Alert threshold for temperature'),
('data_retention_days', '90', 'integer', 'Number of days to retain consumption data');

-- Default SaaS admin account (ganti password setelah login pertama)
INSERT IGNORE INTO users (full_name, email, password, role, is_active) VALUES
('Admin SIER', 'admin@sier.id', '$2a$10$u0YP0gkl1Yl2jMrO6dWMr.24Bcwz7mYb6bW8tTnSf527jZ0dx3DwK', 'admin', TRUE);
