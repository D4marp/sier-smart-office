const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool ke database registry (level rektorat).
// Registry menyimpan daftar tenant (fakultas) dan users terpusat.
const registryPool = mysql.createPool({
  host: process.env.REGISTRY_DB_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.REGISTRY_DB_USER || process.env.DB_USER || 'root',
  password: process.env.REGISTRY_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
  database: process.env.REGISTRY_DB_NAME || 'smart_energy_registry',
  port: Number(process.env.REGISTRY_DB_PORT || process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = registryPool;
