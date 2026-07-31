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
Node-RED tinggal menyalakan/mematikan perangkat fisik.

Beda dengan Psikologi (1 AC + 1 lampu per ruangan), **tiap ruangan FISIPOL punya 2 unit AC dan
2 unit lampu**. AC dikendalikan Node-RED (RM4 Pro, IR); lampu dikendalikan gateway eksternal
WS501/WS502 yang sama seperti Psikologi (bukan Node-RED — lihat `TARGETS.lamp1`/`TARGETS.lamp2`
di `DeviceController.js`, tidak ada flow-nya di folder ini). Tiap unit AC + "kedua unit sekaligus"
punya kanal TCP sendiri, jadi web dashboard bisa mengontrol AC1/AC2 independen maupun bareng:

| Ruangan | AC keduanya | AC 1 | AC 2 | Proyektor | Lampu keduanya¹ | Lampu 1¹ | Lampu 2¹ |
|---|---|---|---|---|---|---|---|
| I3.02.01 | 5201 | 5301 | 5401 | 5101 | 6001 | 6101 | 6201 |
| I3.02.02 | 5202 | 5302 | 5402 | 5102 | 6002 | 6102 | 6202 |
| I3.02.03 | 5203 | 5303 | 5403 | 5103 | 6003 | 6103 | 6203 |
| I3.02.04 | 5204 | 5304 | 5404 | 5104 | 6004 | 6104 | 6204 |
| I3.02.05 | 5205 | 5305 | 5405 | 5105 | 6005 | 6105 | 6205 |

¹ Port lampu dituju ke gateway WS501/WS502 eksternal (host `LAMP_GATEWAY_HOST`), bukan ke Node-RED —
tidak ada flow di folder ini untuk itu, hanya perlu memastikan gateway fisiknya sudah dikonfigurasi
untuk port-port tsb.

Semua port AC/proyektor di atas sudah didaftarkan di `TARGETS.ac`/`.ac1`/`.ac2`/`.projector` pada
`DeviceController.js` — begitu Node-RED di-deploy dan mendengarkan port-port ini, tombol ON/OFF di
dashboard web (AC1, AC2, "AC keduanya", dan tombol per-device di tabel status) langsung berfungsi.

**AC**: Broadlink RM4 Pro — **2 unit fisik terpisah per ruangan** (RM4 Pro sendiri-sendiri, karena
line-of-sight IR beda), masing-masing memakai kode IR hasil learning Fakultas Psikologi Q1.01.02
(unit AC/remote diasumsikan sama persis untuk kedua unit). Sebelum online: isi MAC + IP RM4 Pro
**tiap unit** di node config `RM4PRO AC 1/2 I3.02.0X` (cari-ganti string
`REPLACE_MAC_RM4PRO_*_UNIT1/2` / `REPLACE_IP_RM4PRO_*_UNIT1/2`). Bila salah satu unit ternyata beda
merek/model, pakai node "Discover"/"learn" di bawah unit tsb untuk merekam ulang kode IR-nya —
masing-masing unit punya utilitas learn sendiri.

**Lampu**: 2 unit relay WS501/WS502 eksternal per ruangan (bukan Node-RED, sama seperti Psikologi).
Tidak ada langkah tambahan di Node-RED — cukup pastikan gateway fisik sudah dikonfigurasi untuk
port lampu1/lampu2/keduanya di tabel atas.

**Proyektor**: rencana pakai ATEN SN3001P (device server RS232-ke-TCP) menggantikan RM4 Pro/IR yang
dipakai Psikologi. **Command RS232 ON/OFF belum diisi** karena merek/model proyektor FISIPOL belum
ditentukan saat flow ini dibuat — cari string `TODO` di function node `TODO: command RS232 ON/OFF I3.02.0X`
dan isi sesuai manual proyektor yang terpasang, lalu ganti `REPLACE_IP_ATEN_*` / `REPLACE_PORT_ATEN`
pada node `tcp request` dengan IP:port ATEN SN3001P yang sebenarnya.

### FIKK (U5.02.01 s/d U5.03.05)

Lihat [docs/fikk-nodered-integration.md](../../docs/fikk-nodered-integration.md) di root
project — arsitekturnya beda dari Q1.01.02 dan FISIPOL: gateway UG65 (Milesight, LoRaWAN)
terpisah dari Mini PC, jadi ada dua repo flow Node-RED (UG65 + Mini PC) alih-alih satu.

---

## 📚 Next Steps

1. Setup Node-RED
2. Import flow JSON
3. Configure MQTT connection
4. Register IoT devices in database
5. Test with MQTT messages
6. Monitor via debug nodes & database


