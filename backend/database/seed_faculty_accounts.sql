-- =============================================================
-- AKUN ADMIN PER FAKULTAS + AKUN REKTORAT
-- Dijalankan terhadap database REGISTRY (smart_energy_registry) —
-- users disimpan terpusat di sini, bukan di database masing-masing
-- fakultas. Aman dijalankan berulang: INSERT IGNORE berdasarkan
-- email (UNIQUE), akun yang sudah ada (mis. admin.fbs@unesa.ac.id,
-- admin.magetan@unesa.ac.id, rektorat@unesa.ac.id) TIDAK ditimpa.
--
-- Jalankan: mysql -u root smart_energy_registry < seed_faculty_accounts.sql
-- =============================================================

USE smart_energy_registry;

-- ── Akun REKTORAT (superadmin, tenant_id NULL = akses semua fakultas) ──
INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
VALUES (NULL, 'Rektorat UNESA', 'rektorat@unesa.ac.id',
        '$2a$10$D2fMOS7gaVQiwI48HXBqSuwXMkEZCWhzBsc98cGUcGTclnKxnRAc6',
        'superadmin', TRUE);

-- ── Akun ADMIN per fakultas (terkunci pada tenant masing-masing) ──

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Ilmu Pendidikan', 'admin.fip@unesa.ac.id',
       '$2a$10$LHEPnIpb/dGP.qDqXhRgnODH91nTzre42TRoTtpUA.VsjRRalYzmy',
       'admin', TRUE
FROM tenants WHERE code = 'fip';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Ilmu Keolahragaan dan Kesehatan', 'admin.fikk@unesa.ac.id',
       '$2a$10$Ufo2GkL7REggQKRRbRcbo.rL4cN1MSq2UIf7UzGofxAPCmrKEn7m.',
       'admin', TRUE
FROM tenants WHERE code = 'fikk';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Psikologi', 'admin.psikologi@unesa.ac.id',
       '$2a$10$H79g.L4X9kOpCFY1pGhU0Oec98UWiLGgSPTz6Bkqq78cY.MKCvpKO',
       'admin', TRUE
FROM tenants WHERE code = 'psikologi';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Kedokteran', 'admin.fk@unesa.ac.id',
       '$2a$10$qIvywUc37rVnhL.O9otUheG2fnpMcUp7fAc2gGf2RvUdwYwaKjQCi',
       'admin', TRUE
FROM tenants WHERE code = 'fk';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Teknik', 'admin.ft@unesa.ac.id',
       '$2a$10$0.MjPawfJK/XYu8rkPMEx.rdgYVk1MOHOC8JUpgTpkhee0arx6x4e',
       'admin', TRUE
FROM tenants WHERE code = 'ft';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Ekonomika dan Bisnis', 'admin.feb@unesa.ac.id',
       '$2a$10$dJX/CeMEh88eyA9o10x27.UvCI9eQx3DSJon5iQ.oJ/pOxyeQ3l56',
       'admin', TRUE
FROM tenants WHERE code = 'feb';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Matematika dan Ilmu Pengetahuan Alam', 'admin.fmipa@unesa.ac.id',
       '$2a$10$M.Z9kZMKCkBwzoAbR.DlZeg0/N2zq1Mb2.2KAhf4My0/DS5nNIc9q',
       'admin', TRUE
FROM tenants WHERE code = 'fmipa';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Ilmu Sosial dan Ilmu Politik', 'admin.fisipol@unesa.ac.id',
       '$2a$10$xZ2p7pMFg9KkMYDYqyH/1.9yyuPU4FIlTDE22ama7dMTZqBSxotsO',
       'admin', TRUE
FROM tenants WHERE code = 'fisipol';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Vokasi', 'admin.fv@unesa.ac.id',
       '$2a$10$KwYnfIFu3QCxj09AeF9KAucbbrXE2uTHiwfllzLKDZrP5KSbPi7jy',
       'admin', TRUE
FROM tenants WHERE code = 'fv';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Hukum', 'admin.fh@unesa.ac.id',
       '$2a$10$KYTplK3DqS8OXCU3kiWKMOU88bcb8EztUqp1QgsIKoAzWvZ3er9nK',
       'admin', TRUE
FROM tenants WHERE code = 'fh';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Fakultas Ketahanan Pangan', 'admin.fkp@unesa.ac.id',
       '$2a$10$h.xCP2WD4fWdkc6gPt/MPeS1GsjgOS3WqaQVkydtAy4nGNBbSzxfG',
       'admin', TRUE
FROM tenants WHERE code = 'fkp';

-- Fakultas Bahasa dan Seni (fbs) sudah punya akun admin dari sesi
-- sebelumnya (admin.fbs@unesa.ac.id) — tidak diulang di sini.

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Kampus Magetan', 'admin.magetan@unesa.ac.id',
       '$2a$10$8QepghHB4UYX7JIQDCxtsuYVmQc.s9jWJnp7OGA6N8zPDJo/P9Lw6',
       'admin', TRUE
FROM tenants WHERE code = 'magetan';

INSERT IGNORE INTO users (tenant_id, full_name, email, password, role, is_active)
SELECT id, 'Admin Pascasarjana Psikologi', 'admin.pascasarjana.psikologi@unesa.ac.id',
       '$2a$10$dIjTVjrJEB4lpkR/yoxoZeMsYwavHUaLtTtEd06C7xKC/JskgveYq',
       'admin', TRUE
FROM tenants WHERE code = 'pascasarjana-psikologi';

-- ── Ringkasan ──
SELECT u.email, u.role,
       COALESCE(t.name, 'Rektorat (semua fakultas)') AS tenant,
       COALESCE(JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.campus')), '-') AS campus
FROM users u
LEFT JOIN tenants t ON t.id = u.tenant_id
ORDER BY u.role, tenant;
