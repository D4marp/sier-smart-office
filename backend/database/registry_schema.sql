-- =============================================================
-- REGISTRY DATABASE (level REKTORAT)
-- Menyimpan daftar tenant (fakultas) beserta kredensial database
-- masing-masing, dan user terpusat untuk seluruh universitas.
-- Setiap fakultas memiliki database operasional sendiri
-- (lihat tenant_schema.sql).
-- =============================================================

CREATE DATABASE IF NOT EXISTS smart_energy_registry
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
USE smart_energy_registry;

-- Daftar tenant (fakultas). Level rektorat tidak punya baris di sini;
-- rektorat direpresentasikan oleh user dengan role 'superadmin'
-- dan tenant_id NULL (akses lintas fakultas).
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kode unik tenant, mis. psikologi, fbs, ft',
    name VARCHAR(150) NOT NULL COMMENT 'Nama fakultas, mis. Fakultas Psikologi',
    type ENUM('fakultas', 'unit') DEFAULT 'fakultas',
    db_host VARCHAR(150) DEFAULT NULL COMMENT 'NULL = pakai DB_HOST dari env backend',
    db_port INT DEFAULT NULL COMMENT 'NULL = pakai DB_PORT dari env backend',
    db_name VARCHAR(100) NOT NULL COMMENT 'Nama database operasional fakultas',
    db_user VARCHAR(100) DEFAULT NULL COMMENT 'NULL = pakai DB_USER dari env backend',
    db_password VARCHAR(255) DEFAULT NULL COMMENT 'NULL = pakai DB_PASSWORD dari env backend',
    status ENUM('active', 'inactive') DEFAULT 'active',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User terpusat seluruh universitas.
-- role 'superadmin' + tenant_id NULL  -> rektorat, akses semua fakultas
-- role admin/manager/viewer + tenant_id -> terkunci pada satu fakultas
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT DEFAULT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'admin', 'manager', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_tenant (tenant_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit lintas tenant (aksi level rektorat: provisioning, manajemen user, dsb.)
CREATE TABLE IF NOT EXISTS registry_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    tenant_code VARCHAR(50),
    action VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_tenant (tenant_code),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
