# Frontend API Integration Summary

## 📋 Overview
Semua halaman frontend di folder `src/` sekarang terhubung langsung ke backend database melalui API. Data tidak lagi hardcoded, melainkan dimuat secara dinamis dari database.

---

## ✅ Halaman Yang Diupdate

### 1. Dashboard (`src/app/page.tsx`)
**Status:** ✅ API Connected

#### Data yang dimuat:
- **Devices**: Menggunakan `devicesAPI.getAll()`
- **Hourly Consumption**: Menggunakan `consumptionAPI.getHourly()`
- **Monthly Consumption**: Menggunakan `consumptionAPI.getMonthly()`

#### Fitur:
- Menampilkan semua perangkat dari database
- Menampilkan konsumsi energi per jam (hari ini)
- Menampilkan tren bulanan
- Filter berdasarkan lokasi/kelas (ekstrak otomatis dari database)

---

### 2. Devices (`src/app/devices/page.tsx`)
**Status:** ✅ API Connected

#### Data yang dimuat:
- **Devices**: Menggunakan `devicesAPI.getAll()`

#### Fitur:
- Menampilkan semua perangkat dengan status
- Daya saat ini, suhu, jenis device
- Filter berdasarkan lokasi/kelas
- Status online/offline dari database

---

### 3. Analytics (`src/app/analytics/page.tsx`)
**Status:** ✅ API Connected

#### Data yang dimuat:
- **Devices**: Menggunakan `devicesAPI.getAll()`
- **Monthly Data**: Menggunakan `consumptionAPI.getMonthly()`
- **Hourly Data**: Menggunakan `consumptionAPI.getHourly()`

#### Fitur:
- Tren konsumsi bulanan AC & Lampu
- Puncak penggunaan harian
- Analisis efisiensi per perangkat
- Beban per jam & sumber terbarukan

---

### 4. Alerts (`src/app/alerts/page.tsx`)
**Status:** ✅ API Connected

#### Data yang dimuat:
- **Alerts**: Menggunakan `alertsAPI.getAll()`

#### Fitur:
- Menampilkan semua alert dari database
- Filter berdasarkan status (read/unread)
- Severity level (critical, high, medium, low)
- Tandai sebagai read/delete alert

---

### 5. Settings (`src/app/settings/page.tsx`)
**Status:** ✅ API Connected (already was)

#### Data yang dimuat:
- **Settings**: Menggunakan `settingsAPI.getAll()` dan `settingsAPI.update()`

---

## 🔌 Backend API Endpoints Used

### Devices API
```
GET /api/v1/devices              → Get all devices
GET /api/v1/devices/:id          → Get specific device
GET /api/v1/devices/class/:id    → Get devices by class
POST /api/v1/devices             → Create device
PUT /api/v1/devices/:id          → Update device
DELETE /api/v1/devices/:id       → Delete device
```

### Consumption API
```
GET /api/v1/consumption/daily/:deviceId?date=YYYY-MM-DD
GET /api/v1/consumption/monthly/:deviceId?month=YYYY-MM
GET /api/v1/consumption/hourly/:deviceId?date=YYYY-MM-DD
POST /api/v1/consumption         → Record consumption data
```

### Alerts API
```
GET /api/v1/alerts               → Get all alerts
GET /api/v1/alerts/:id           → Get specific alert
GET /api/v1/alerts/count/unread  → Get unread count
POST /api/v1/alerts              → Create alert
```

### Classes API
```
GET /api/v1/classes              → Get all classes
GET /api/v1/classes/:id          → Get specific class
```

---

## 🎯 API Client Configuration

File: `src/lib/apiClient.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api/v1'
```

### Environment Variables
Tambahkan ke `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5002/api/v1
```

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────┐
│   Frontend Pages (Next.js)          │
│ ┌─────────────────────────────────┐ │
│ │ page.tsx (Dashboard)            │ │
│ │ devices/page.tsx                │ │
│ │ analytics/page.tsx              │ │
│ │ alerts/page.tsx                 │ │
│ └─────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │ useEffect()
               │ API Calls
               ▼
┌─────────────────────────────────────┐
│   API Client (apiClient.ts)         │
│ ├─ devicesAPI                       │
│ ├─ consumptionAPI                   │
│ ├─ alertsAPI                        │
│ ├─ classesAPI                       │
│ └─ settingsAPI                      │
└──────────────┬──────────────────────┘
               │ fetch()
               │ HTTP/JSON
               ▼
┌─────────────────────────────────────┐
│   Backend API (Express.js)          │
│   Port: 5002                        │
│ ├─ /api/v1/devices                  │
│ ├─ /api/v1/consumption              │
│ ├─ /api/v1/alerts                   │
│ ├─ /api/v1/classes                  │
│ └─ /api/v1/settings                 │
└──────────────┬──────────────────────┘
               │ Database
               │ Queries
               ▼
┌─────────────────────────────────────┐
│   MySQL Database                    │
│ ├─ devices table                    │
│ ├─ device_consumption table         │
│ ├─ alerts table                     │
│ ├─ classes table                    │
│ └─ settings table                   │
└─────────────────────────────────────┘
```

---

## 🚀 Cara Menggunakan

### Prerequisites
1. Backend Express.js running on `http://localhost:5002`
2. MySQL database dengan schema dari `backend/database/schema.sql`
3. Node-RED (optional, untuk IoT data collection)

### Setup Frontend
```bash
# 1. Install dependencies
npm install

# 2. Set environment variable
echo "NEXT_PUBLIC_API_URL=http://localhost:5002/api/v1" > .env.local

# 3. Run development server
npm run dev

# 4. Open browser
# http://localhost:3000
```

### Setup Backend
```bash
cd backend

# 1. Install dependencies
npm install

# 2. Setup database
mysql -u root -p < database/schema.sql

# 3. Update config/database.js dengan credentials

# 4. Start server
npm start
# Server running at http://localhost:5002
```

---

## 🔄 Error Handling

Tiap halaman memiliki error handling yang proper:

```typescript
try {
  const data = await devicesAPI.getAll()
  setDevices(data)
} catch (err) {
  setError(err.message)
  // Fallback ke mock data jika perlu
}
```

### Loading State
```typescript
if (loading) {
  return <LoadingSpinner />
}

if (error) {
  return <ErrorMessage error={error} />
}
```

---

## 📝 Data yang Sudah Terintegrasi

### Dashboard
- ✅ Menampilkan 5 perangkat dari database
- ✅ Konsumsi energi real-time
- ✅ Tren bulanan
- ✅ Filter per kelas

### Devices
- ✅ List perangkat lengkap
- ✅ Status online/offline
- ✅ Daya & suhu real-time
- ✅ Filter lokasi

### Analytics
- ✅ Data konsumsi bulanan
- ✅ Pola penggunaan harian
- ✅ Efisiensi per perangkat
- ✅ Breakdown biaya energi

### Alerts
- ✅ Alert real-time dari database
- ✅ Status severity level
- ✅ Mark as read/delete
- ✅ Filter status

---

## 🎯 Next Steps

1. **Register Devices** - Masukkan device ke database:
   ```sql
   INSERT INTO devices (device_eui, device_name, device_type, location, ...)
   VALUES ('Q1.01.02-AC-001', 'AC Q1.01.02', 'AC', 'Q1.01.02', ...);
   ```

2. **Start IoT Data Collection** - Gunakan Node-RED untuk mengirim data:
   ```bash
   node-red &
   # Import flows dari backend/nodered/*.json
   ```

3. **Monitor Dashboard** - Data akan otomatis muncul di frontend:
   ```
   http://localhost:3000
   ```

4. **Set Thresholds** - Configure alert thresholds di settings

---

## 📞 Troubleshooting

### Error: "Cannot fetch from API"
- Pastikan backend running: `npm start` di folder `backend/`
- Pastikan MySQL running
- Check `.env.local` configuration

### Error: "Database connection failed"
- Verify MySQL credentials di `backend/config/database.js`
- Ensure database schema imported: `mysql -u root -p < backend/database/schema.sql`

### No data appears
- Check if devices registered di database
- Check browser console untuk error messages
- Verify API endpoints respond: `curl http://localhost:5002/api/v1/devices`

---

## ✨ Summary

Semua halaman frontend sekarang:
✅ Terhubung ke backend API
✅ Memuat data dari database
✅ Update real-time saat data berubah
✅ Error handling yang proper
✅ Loading states yang jelas
✅ No hardcoded data

Frontend is now 100% data-driven from the backend database! 🎉
