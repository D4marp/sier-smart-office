# Node-RED Setup untuk IoT Data Collection

## 📦 Files dalam folder ini:

- **Q1.01.02.json** - Original (IR Remote Control flow)
- **Q1.01.02-SENSOR-FLOW.json** ✨ (Energy Monitor - Data Collection)
- **Q1.01.03.json, Q1.01.04.json** - Untuk class lain
- **FLOW-DOCUMENTATION.md** - Dokumentasi lengkap
- **PAYLOAD-EXAMPLES.md** - Test cases dan device payload
- **README.md** - File ini

---

## 🚀 Quick Start

### Step 1: Install Node-RED
```bash
sudo npm install -g node-red
```

### Step 2: Start Node-RED
```bash
node-red
```
Accessible di `http://localhost:1880`

### Step 3: Deploy Flow
1. Import `Q1.01.02-SENSOR-FLOW.json` ke Node-RED
2. Configure MQTT broker
3. Deploy dan test

---

## 🔗 Data Flow

```
IoT Device (MQTT)
    ↓
[MQTT Input]
    ↓
[Parse & Validate]
    ↓
[Format for API]
    ↓
[HTTP POST to Backend]
    ↓
[Database]
```

---

## 📊 Setup Requirements

- Node.js & npm
- Node-RED
- MQTT Broker (Mosquitto)
- Backend API running (port 5000)
- MySQL database

---

## 🧪 Testing

```bash
mosquitto_pub -h localhost -t "sensor/q1.01.02/ac" -m '{
  "device_id": 1,
  "consumption": 2.5,
  "temperature": 24,
  "humidity": 65
}'
```

### Test payload 1T342MFX

Untuk test event access control, import file [1T342MFX-TEST.json](1T342MFX-TEST.json) lalu klik inject node **Send 1T342MFX Event**.

Endpoint backend yang dipakai flow ini:

`http://10.12.1.97:5000/api/v1/alerts/device-event`

### One-click test semua kelas

Import file [CLASS-TEST-SUITE.json](CLASS-TEST-SUITE.json) lalu klik inject node **Run All Class Tests**.
Flow ini akan mengirim payload test AC/Lamp untuk semua kelas secara berurutan ke endpoint:

`http://10.12.1.97:5000/api/v1/consumption`

### Monitor online/offline per ruangan

Status aktif/tidak aktif ditentukan dari data terakhir perangkat:

- sumber waktu: `last_reading` atau `last_heartbeat` dari API `/devices`
- rule: jika selisih waktu <= 5 menit -> `active`, jika lebih -> `offline`

Flow monitor dipisah per ruangan (tidak digabung):

- [DEVICE-MONITOR-Q1.01.02.json](DEVICE-MONITOR-Q1.01.02.json)
- [DEVICE-MONITOR-Q1.01.03.json](DEVICE-MONITOR-Q1.01.03.json)
- [DEVICE-MONITOR-Q1.01.04.json](DEVICE-MONITOR-Q1.01.04.json)
- [DEVICE-MONITOR-Q1.01.09.json](DEVICE-MONITOR-Q1.01.09.json)
- [DEVICE-MONITOR-Q1.01.11.json](DEVICE-MONITOR-Q1.01.11.json)

### Sinkron ON/OFF dari collector (real-time)

Flow [Q1.01.02-COLLECTOR.json](Q1.01.02-COLLECTOR.json) sudah disambungkan langsung ke backend untuk status ON/OFF:

- perintah AC ON (16-24 C) -> status device AC `active`
- perintah AC OFF -> status device AC `offline`
- perintah relay lamp open -> status device Lamp `active`
- perintah relay lamp close -> status device Lamp `offline`

Flow akan mencari device berdasarkan kombinasi `class_code` + `device_type`, lalu mengirim PATCH ke:

`http://10.12.1.97:5000/api/v1/devices/:id/status`

### FISIPOL — Umum Fakultas (I3.02.01 s/d I3.02.05)

- [I3.02.01-COLLECTOR.json](I3.02.01-COLLECTOR.json)
- [I3.02.02-COLLECTOR.json](I3.02.02-COLLECTOR.json)
- [I3.02.03-COLLECTOR.json](I3.02.03-COLLECTOR.json)
- [I3.02.04-COLLECTOR.json](I3.02.04-COLLECTOR.json)
- [I3.02.05-COLLECTOR.json](I3.02.05-COLLECTOR.json)
- [FISIPOL-GLOBAL-CONFIG.json](FISIPOL-GLOBAL-CONFIG.json) — import sekali saja (deklarasi modul `node-red-contrib-broadlink-control`)

Arsitektur beda dengan flow `Q1.01.02-COLLECTOR.json` di atas: **tidak ada HTTP PATCH dari Node-RED**.
Backend (`backend/controllers/DeviceController.js`, map `TARGETS`) yang membuka koneksi TCP
langsung ke Node-RED lalu menulis status ke database sendiri setelah TCP terkirim sukses —
Node-RED tinggal menyalakan/mematikan perangkat fisik. Tiap ruangan mendengarkan dua port TCP:

| Ruangan | Port AC | Port Proyektor |
|---|---|---|
| I3.02.01 | 5201 | 5101 |
| I3.02.02 | 5202 | 5102 |
| I3.02.03 | 5203 | 5103 |
| I3.02.04 | 5204 | 5104 |
| I3.02.05 | 5205 | 5105 |

Sudah didaftarkan di `TARGETS.ac` / `TARGETS.projector` pada `DeviceController.js` — begitu Node-RED
di-deploy dan mendengarkan port ini, tombol ON/OFF di dashboard web langsung berfungsi.

**AC**: Broadlink RM4 Pro, memakai kode IR hasil learning Fakultas Psikologi Q1.01.02 (unit AC/remote
diasumsikan sama persis). Sebelum online: isi MAC + IP RM4 Pro tiap ruangan di node config
`RM4PRO I3.02.0X` (cari-ganti string `REPLACE_MAC_RM4PRO_*` / `REPLACE_IP_RM4PRO_*`). Bila unit AC
ruangan tsb ternyata beda merek/model, pakai node "Discover"/"learn" yang sudah disediakan di flow
untuk merekam ulang kode IR-nya.

**Proyektor**: rencana pakai ATEN SN3001P (device server RS232-ke-TCP) menggantikan RM4 Pro/IR yang
dipakai Psikologi. **Command RS232 ON/OFF belum diisi** karena merek/model proyektor FISIPOL belum
ditentukan saat flow ini dibuat — cari string `TODO` di function node `TODO: command RS232 ON/OFF I3.02.0X`
dan isi sesuai manual proyektor yang terpasang, lalu ganti `REPLACE_IP_ATEN_*` / `REPLACE_PORT_ATEN`
pada node `tcp request` dengan IP:port ATEN SN3001P yang sebenarnya.

---

## 📚 Next Steps

1. Setup Node-RED
2. Import flow JSON
3. Configure MQTT connection
4. Register IoT devices in database
5. Test with MQTT messages
6. Monitor via debug nodes & database


