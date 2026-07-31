# 📚 Smart Energy Dashboard - Complete Setup Guide

Panduan lengkap untuk setup Backend dan Frontend Smart Energy Dashboard UNESA.

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Integration](#frontend-integration)
5. [Running Both Services](#running-both-services)
6. [Testing API](#testing-api)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Pastikan sudah terinstall:

- **Node.js** (v14+) - [Download](https://nodejs.org/)
- **MySQL** (v5.7+) - [Download](https://dev.mysql.com/downloads/mysql/)
- **Git** (Optional)
- **Postman** atau **Thunder Client** untuk testing API (Optional)

### Verify Installation

```bash
node --version    # v14.0.0 atau lebih tinggi
npm --version     # 6.0.0 atau lebih tinggi
mysql --version   # Ver 8.0.0 atau lebih tinggi
```

---

## Database Setup

### 1. Start MySQL Server (macOS)

Jika menggunakan Homebrew:

```bash
# Start MySQL
brew services start mysql

# Atau jika sudah terinstall
/usr/local/mysql/support-files/mysql.server start
```

Cek status:
```bash
mysql -u root -p
# Enter password (default: empty, press Enter)
```

### 2. Create Database

```bash
# Buka MySQL Client
mysql -u root -p
```

Kemudian jalankan:

```sql
-- Create Database
CREATE DATABASE IF NOT EXISTS smart_energy_dashboard;

-- Use Database
USE smart_energy_dashboard;

-- Verify Database Created
SHOW DATABASES;
SHOW TABLES;
```

### 3. Import Database Schema

**Opsi A: Dari MySQL Client**

```bash
mysql -u root -p smart_energy_dashboard < /Users/HCMPublic/Kuliah/Unesa\ Dashboard/backend/database/schema.sql
```

**Opsi B: Menggunakan MySQL Workbench**

1. Buka MySQL Workbench
2. Create new connection ke localhost
3. Double-click connection to open
4. File → Open SQL Script
5. Select `database/schema.sql`
6. Klik Execute script button

### 4. Verify Data

```bash
mysql -u root -p smart_energy_dashboard

# Jalankan queries ini
SELECT * FROM classes;
SELECT * FROM devices;
SELECT * FROM settings;
```

Harusnya ada 5 classes dan 10 devices.

---

## Backend Setup

### 1. Install Dependencies

```bash
cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard/backend
npm install
```

### 2. Configure Environment

Edit file `.env`:

```bash
# macOS / Linux
nano .env

# Windows
notepad .env
```

Update dengan database credentials Anda:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_energy_dashboard
DB_PORT=3030

PORT=5000
NODE_ENV=development

JWT_SECRET=smart_energy_dashboard_secret_key_2024
JWT_EXPIRE=7d

FRONTEND_URL=http://localhost:3001
API_PREFIX=/api/v1
```

### 3. Test Database Connection

```bash
node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
pool.getConnection().then(conn => {
  console.log('✅ Database connected!');
  conn.release();
  process.exit(0);
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

### 4. Start Backend Server

**Development Mode (dengan auto-reload):**

```bash
npm run dev
```

**Production Mode:**

```bash
npm start
```

Expected output:
```
✅ Database connected successfully
🚀 Smart Energy Dashboard API running on port 5000
📊 Environment: development
```

Backend sekarang berjalan di: `http://localhost:5000`

---

## Frontend Integration

### 1. Update Frontend Configuration

Edit `.env.local` di folder frontend:

```bash
cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard
touch .env.local
```

Isi dengan:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 2. Install Additional Dependencies (Optional)

```bash
npm install axios
# atau
npm install fetch-api-wrapper
```

### 3. Create API Service

Buat file `src/lib/apiClient.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = {
  // Helper function
  async request(method: string, endpoint: string, data?: any) {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, options);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Classes
  classes: {
    getAll: () => apiClient.request('GET', '/classes'),
    getById: (id: number) => apiClient.request('GET', `/classes/${id}`),
    create: (data: any) => apiClient.request('POST', '/classes', data),
    update: (id: number, data: any) => apiClient.request('PUT', `/classes/${id}`, data),
    delete: (id: number) => apiClient.request('DELETE', `/classes/${id}`),
  },

  // Devices
  devices: {
    getAll: () => apiClient.request('GET', '/devices'),
    getByClass: (classId: number) => apiClient.request('GET', `/devices/class/${classId}`),
    getById: (id: number) => apiClient.request('GET', `/devices/${id}`),
    create: (data: any) => apiClient.request('POST', '/devices', data),
    update: (id: number, data: any) => apiClient.request('PUT', `/devices/${id}`, data),
    updateStatus: (id: number, status: string) => apiClient.request('PATCH', `/devices/${id}/status`, { status }),
    updateReading: (id: number, power: number, temperature?: number) =>
      apiClient.request('PATCH', `/devices/${id}/reading`, { power, temperature }),
    delete: (id: number) => apiClient.request('DELETE', `/devices/${id}`),
  },

  // Consumption
  consumption: {
    getDaily: (deviceId: number, date: string) =>
      apiClient.request('GET', `/consumption/daily/${deviceId}?date=${date}`),
    getMonthly: (deviceId: number, year: number, month: number) =>
      apiClient.request('GET', `/consumption/monthly/${deviceId}?year=${year}&month=${month}`),
    getHourly: (classId: number, date: string) =>
      apiClient.request('GET', `/consumption/hourly/class/${classId}?date=${date}`),
    create: (data: any) => apiClient.request('POST', '/consumption', data),
    bulkCreate: (data: any[]) =>
      apiClient.request('POST', '/consumption/bulk', { consumptionData: data }),
  },

  // Alerts
  alerts: {
    getAll: (filters?: any) => {
      let query = '/alerts';
      if (filters) {
        const params = new URLSearchParams(filters).toString();
        query += `?${params}`;
      }
      return apiClient.request('GET', query);
    },
    getById: (id: number) => apiClient.request('GET', `/alerts/${id}`),
    getByDevice: (deviceId: number) => apiClient.request('GET', `/alerts/device/${deviceId}`),
    getUnreadCount: () => apiClient.request('GET', '/alerts/count/unread'),
    create: (data: any) => apiClient.request('POST', '/alerts', data),
    markAsRead: (id: number) => apiClient.request('PATCH', `/alerts/${id}/read`),
    update: (id: number, data: any) => apiClient.request('PUT', `/alerts/${id}`, data),
    delete: (id: number) => apiClient.request('DELETE', `/alerts/${id}`),
  },

  // Settings
  settings: {
    getAll: () => apiClient.request('GET', '/settings'),
    getByKey: (key: string) => apiClient.request('GET', `/settings/${key}`),
    set: (key: string, value: any) => apiClient.request('POST', '/settings', { key, value }),
    getUserSettings: (userId: number) => apiClient.request('GET', `/settings/user/${userId}`),
    updateUserSettings: (userId: number, data: any) =>
      apiClient.request('PUT', `/settings/user/${userId}`, data),
  },
};
```

### 4. Update Page Components

Contoh penggunaan di `src/app/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'

export default function Dashboard() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Get devices dari API
        const result = await apiClient.devices.getAll()
        if (result.success) {
          setDevices(result.data)
        }
      } catch (err) {
        setError(err.message)
        console.error('Error fetching devices:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh setiap 30 detik
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    // Your JSX here
  )
}
```

---

## Running Both Services

### Terminal 1 - Backend Server

```bash
cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard/backend
npm run dev
```

Output:
```
✅ Database connected successfully
🚀 Smart Energy Dashboard API running on port 5000
```

### Terminal 2 - Frontend Server

```bash
cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard
npm run dev
```

Output:
```
> smart-energy-dashboard-unesa@0.1.0 dev
> next dev
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3001
  - Environments: .env.local
```

### Terminal 3 - MySQL (Optional, jika perlu monitor)

```bash
mysql -u root -p smart_energy_dashboard
```

---

## Testing API

### Menggunakan cURL

```bash
# Test backend health
curl http://localhost:5000/health

# Get all classes
curl http://localhost:5000/api/v1/classes

# Get all devices
curl http://localhost:5000/api/v1/devices

# Create alert
curl -X POST http://localhost:5000/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": 1,
    "class_id": 1,
    "type": "warning",
    "title": "Test Alert",
    "message": "This is a test alert",
    "severity": "high"
  }'
```

### Menggunakan Postman

1. Buka Postman
2. New → Request
3. Method: GET
4. URL: `http://localhost:5000/api/v1/classes`
5. Send

### Menggunakan Thunder Client di VS Code

1. Install Thunder Client extension
2. Buat New Request
3. Isi URL dan method
4. Send

---

## Troubleshooting

### ❌ MySQL Connection Error

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3030
```

**Solusi:**

```bash
# Check if MySQL is running
brew services list

# Start MySQL if not running
brew services start mysql

# Atau jika menggunakan brew services
mysql.server start

# Verify connection
mysql -u root -p
```

### ❌ Port 5000 Already in Use

**Solusi:**

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Atau ubah PORT di .env
PORT=5001
```

### ❌ Port 3001 Already in Use

**Solusi:**

```bash
# Di package.json, ubah start script
"start": "next start -p 3002"

# Atau jalankan dengan port berbeda
npm run dev -- -p 3002
```

### ❌ Database Not Found

**Solusi:**

```bash
# Check databases
mysql -u root -p -e "SHOW DATABASES;"

# Create database
mysql -u root -p -e "CREATE DATABASE smart_energy_dashboard;"

# Import schema
mysql -u root -p smart_energy_dashboard < database/schema.sql
```

### ❌ Module Not Found

**Error:**
```
Cannot find module 'express'
```

**Solusi:**

```bash
cd backend
npm install
```

### ❌ CORS Error di Frontend

**Error:**
```
Access to XMLHttpRequest blocked by CORS
```

**Solusi:**

Pastikan `.env.local` di frontend sudah benar:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### ❌ Connection Refused di Frontend

**Solusi:**

1. Pastikan backend server sudah running
2. Cek URL di apiClient.ts
3. Cek firewall settings

---

## Struktur Project

```
Unesa Dashboard/
├── backend/                          # Backend Express API
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── ClassController.js
│   │   ├── DeviceController.js
│   │   ├── ConsumptionController.js
│   │   ├── AlertController.js
│   │   └── SettingsController.js
│   ├── models/
│   │   ├── Class.js
│   │   ├── Device.js
│   │   ├── Consumption.js
│   │   ├── Alert.js
│   │   └── Settings.js
│   ├── routes/
│   │   ├── classRoutes.js
│   │   ├── deviceRoutes.js
│   │   ├── consumptionRoutes.js
│   │   ├── alertRoutes.js
│   │   └── settingsRoutes.js
│   ├── database/
│   │   └── schema.sql
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── server.js
│   └── README.md
│
├── src/                              # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx
│   │   ├── devices/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── alerts/page.tsx
│   │   └── settings/page.tsx
│   └── lib/
│       └── apiClient.ts             # API Service
│
├── .env.local                        # Frontend env (buat baru)
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## Quick Start Script

**macOS/Linux:**

```bash
#!/bin/bash

echo "🚀 Starting Smart Energy Dashboard..."

# Start MySQL
brew services start mysql

# Start Backend
cd backend
npm install
npm run dev &
BACKEND_PID=$!

# Start Frontend
cd ..
npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started:"
echo "   📊 Backend  : http://localhost:5000"
echo "   🎨 Frontend : http://localhost:3001"
echo "   🗄️  Database : localhost:3030"
echo ""
echo "Press Ctrl+C to stop all services"

wait
```

**Windows:**

```batch
@echo off
echo 🚀 Starting Smart Energy Dashboard...

start "MySQL" cmd /k "mysql -u root -p"
start "Backend" cmd /k "cd backend && npm install && npm run dev"
start "Frontend" cmd /k "npm install && npm run dev"

echo.
echo ✅ Services started:
echo    📊 Backend  : http://localhost:5000
echo    🎨 Frontend : http://localhost:3001
echo    🗄️  Database : localhost:3030
```

---

## Next Steps

1. ✅ Database sudah siap
2. ✅ Backend API sudah berjalan
3. ✅ Frontend siap menerima data dari API
4. 📊 Mulai mengintegrasikan data real-time
5. 🔔 Setup alert notifications
6. 📈 Add more analytics features

---

## Support & Resources

- [Express.js Docs](https://expressjs.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [MySQL Docs](https://dev.mysql.com/doc/)
- [API Design Best Practices](https://restfulapi.net/)

---

**Version**: 1.0.0
**Last Updated**: 2024
**Status**: ✅ Production Ready
