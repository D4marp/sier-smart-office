# Integrasi Node-RED FMIPA (UG65 LT4 + UG65 LT2)

FMIPA memakai **2 gateway UG65 fisik terpisah** (satu per lantai), keduanya
dikontrol lewat **satu Mini PC** yang sama (pola UG65+Mini PC seperti
[FIP](fip-nodered-integration.md) dan [FIKK](fikk-nodered-integration.md) —
baca dulu bagian
[fip-nodered-integration.md § Panduan umum](fip-nodered-integration.md#panduan-umum-untuk-fakultas-lain-yang-punya-ug65)
kalau belum familiar dengan kenapa arsitekturnya begini: **UG65 tidak bisa
menjalankan node HTTP sama sekali**, cuma TCP).

| | UG65 LT4 — `FMIPA_LT4_Gateway` | UG65 LT2 — `FMIPA_LT2_Gateway` |
|---|---|---|
| Admin/network-server | `https://192.168.137.245/#networkserver/device` | `https://192.168.137.163/#networkserver/device` |
| Device terdaftar | 20 device (4 ruangan) — lihat tabel di bawah | 5 device (1 ruangan, C14.02.03) — lihat tabel di bawah |
| Flow di repo ini | `backend/nodered/FMIPA-UG65-LT4.json` (**1 file, 1 tab, semua ruangan**) | `backend/nodered/FMIPA-UG65-LT2.json` (1 file, 1 tab) |

Mini PC menjalankan **dua** flow (pola sama seperti FIP —
[fip-nodered-integration.md](fip-nodered-integration.md) — yang juga punya
`FIP-ACCESS-CONTROL.json` terpisah dari `FIP-CONTROL-HUB.json`):

| File Mini PC | Fungsi |
|---|---|
| `backend/nodered/FMIPA-CONTROL-HUB.json` | Relay kontrol ON/OFF AC/lampu (Web ↔ kedua UG65) + relay telemetri UG65 → Web |
| `backend/nodered/FMIPA-ACCESS-CONTROL.json` | Terima event Hikvision (tap RFID/NFC) dari **kelima ruangan**, nyalakan ruangan itu (lewat endpoint yang sama dengan hub di atas) + kirim alert ke Web |

Keduanya jalan di **satu** Node-RED Mini PC yang sama (dua tab dalam satu
instance, atau di-import terpisah — bebas), bukan dua Node-RED terpisah.

### Kenapa 1 file per UG65, bukan 1 file per ruangan

Versi awal flow ini sempat dipecah 1 file/tab per ruangan (port TCP sendiri,
`manual_override`/`gate_all_vs_unit` sendiri per ruangan) — ternyata makin
banyak ruangan makin susah dirawat karena LOGIKA yang sama (baca payload,
cek override, decode sensor) ter-copy-paste berkali-kali. Sekarang tiap UG65
cuma punya **satu** flow dengan:

- **1 port TCP override** (`:5300`) untuk *semua* ruangan gateway itu — beda
  ruangan dibedakan lewat field `classKey` di payload JSON, bukan lewat port
  terpisah.
- **1 salinan** tiap fungsi (`manual_override_shared`, `fanout_units`,
  decoder VS370/WS502, `occupancy_auto_control_shared`, dst.) yang dipakai
  bersama oleh semua ruangan di gateway itu (dibedakan lewat `msg.classKey`
  yang di-tag tepat setelah `Device Filter`).
- Yang **tetap per-ruangan** (tidak bisa digeneralisasi lebih jauh, karena
  memang 1:1 dengan hardware): `Device Filter` (EUI spesifik), switch
  "pilih unit+state", dan node `LoRa Output` (EUI+hex spesifik per relay).

Menambah ruangan baru ke gateway yang sudah ada = tambah 1 entry di config
`ROOM_DEVICES`/`ROOM_TO_UG` (lihat kode di `manual_override_shared` /
`parse_control_request`) + 1 switch "unit+state" + 8 node `LoRa Output` baru
untuk ruangan itu — **tidak perlu** menambah node baru di Mini PC hub sama
sekali (routing hub cukup tambah 1 baris di `ROOM_TO_UG`).

### Tombol test manual di Node-RED (pola sama seperti FIP)

Tiap ruangan di kedua file UG65 punya node **inject** (tombol, klik langsung
di kanvas Node-RED) untuk uji fisik tanpa lewat Web/backend sama sekali:

- 2 tombol per ruangan: "semua unit ON" / "semua unit OFF".
- 2 tombol per unit (AC A, AC B, Lampu A, Lampu B) × ON/OFF = 8 tombol per
  ruangan, langsung ke switch relay yang bersangkutan.

Pakai tombol per-unit AC untuk verifikasi hex WS523 (lihat checklist di
bawah) sebelum demo — klik "TEST: AC A WS523_A ON", lihat reaksi fisik AC-nya
di ruangan itu.

## Status: sudah dibuat, BELUM diverifikasi di hardware asli

File-file Node-RED di atas sudah lengkap secara struktur (bisa di-import ke
Node-RED) dan pakai EUI device yang sebenarnya (dari daftar `networkserver`
kedua UG65), tapi **belum pernah di-deploy & diuji di UG65/Mini PC yang
sesungguhnya**. Sebelum dipakai produksi, checklist ini WAJIB diselesaikan:

- [ ] **Hex payload LoRa Output untuk WS523 (AC) PAKAI KODE WS502 SEBAGAI
      TEBAKAN, BELUM TERVERIFIKASI** (`0833ff` ON / `0830ff` OFF, sama
      dengan lampu) — ini keputusan sadar (dikonfirmasi user) supaya
      kontrol AC tidak 100% mati untuk demo, berdasar WS523 satu keluarga
      produk Milesight dengan WS502 yang sudah terbukti jalan di FIP.
      **WAJIB diuji ke 1 unit AC dulu** (nyalakan lewat inject node di
      Node-RED, cek reaksi fisik AC-nya) **sebelum demo sungguhan** — kalau
      ternyata salah/tidak bereaksi, cari kode yang benar dari dokumentasi
      downlink resmi Milesight WS523 dan ganti field `payload` di node
      `LoRa Output` AC terkait (10 node di LT4, 2 node di LT2).
- [ ] **IP UG65 dipakai juga untuk Node-RED & TCP override**
      (`192.168.137.245`/`.163`, port 5300 di masing-masing) — ini **asumsi**
      mengikuti pola FIP (satu IP untuk semua layanan UG65: admin web,
      Node-RED, TCP). Belum dikonfirmasi `https://<ip>/node-red/`
      benar-benar bisa diakses. Cek dulu sebelum import flow ke sana.
- [x] **IP LAN Mini PC** — tcp-out "ke Mini PC" di kedua file UG65 diisi
      `192.168.137.1` (port 5400), dikonfirmasi dari `ipconfig` adapter
      Ethernet 2 di mesin ini — satu subnet dengan kedua UG65
      (`192.168.137.245`/`.163`). **Kalau Mini PC produksi FMIPA ternyata
      mesin fisik lain** (bukan mesin dev ini), ganti IP-nya di kedua file
      UG65 sebelum deploy ke sana.
- [ ] **`NODERED_BASE_URL` belum di-set** di `backend/.env` Mini PC FMIPA —
      default-nya menunjuk ke Mini PC fakultas lain (`10.12.1.150`). Harus
      diisi `NODERED_BASE_URL=http://127.0.0.1:1880` (asumsi backend & Node-RED
      Mini PC jalan di mesin yang sama) supaya `controlViaNodeRed()` di
      `backend/controllers/DeviceController.js` memanggil Node-RED yang benar.
- [x] **`classes`/`devices` FMIPA sudah di-seed** — `backend/database/seed_fmipa.sql`
      (5 ruangan, 25 device, `device_name` diakhiri `-A`/`-B` sesuai regex
      unit di `controlViaNodeRed`). Device ID asli dari seed ini juga sudah
      dipakai di `ROOM_DEVICE_IDS` pada `build_device_status_patch_shared`
      dan `get_data_WS502_A` (lihat poin "Daya real-time" di bawah).
- [x] **`X-Tenant` header di semua panggilan Node-RED → backend** — awalnya
      hilang, menyebabkan `resolveTenant()` backend jatuh ke
      `DEFAULT_TENANT` (fakultas lain di `.env`) dan semua PATCH/POST
      (status, reading, consumption, alert) gagal diam-diam dengan pesan
      "Device not found" walau request-nya sendiri sukses terkirim.
      Sudah ditambahkan `"x-tenant": "fmipa"` di `forward_telemetry_to_web`
      (hub, dipakai semua telemetri UG65) dan `build_access_alert_shared`
      (access control). Diverifikasi langsung lewat simulasi TCP ke
      Mini PC — device status & reading benar-benar ter-update di DB
      setelah fix, gagal sebelum fix.
- [x] **Daya real-time ("Lampu — Daya Saat Ini") sekarang di-PATCH** —
      sebelumnya flow FMIPA cuma POST `/api/v1/consumption` (histori/grafik
      7 hari), TIDAK PATCH `/api/v1/devices/:id/reading` (real-time,
      dipakai kartu KPI & tabel status). Tanpa `/reading`, frontend
      (`src/app/fakultas/[code]/page.tsx`) fallback ke `power_rating`
      statis (3.0 kW AC / 1.6 kW lampu) tiap device berstatus `active` --
      **bukan** daya sungguhan. Sekarang `get_data_WS502_A (shared)` juga
      mengirim PATCH reading untuk WS502_A tiap uplink, pakai device ID
      asli dari `ROOM_DEVICE_IDS` (pola sama seperti
      `patch_lamp_reading_O2.02.10` di FIP). **AC (WS523) masih belum**
      karena belum ada decoder WS523 terverifikasi -- lihat poin
      "Telemetri WS502_B, WS523_A/B belum di-decode" di bawah, gap yang
      sama, belum berubah.
- [ ] **UG65 LT2 baru ada 1 ruangan** (C14.02.03) — kalau ada ruangan lain
      di lantai itu yang menyusul didaftarkan, ikuti langkah "Kenapa 1 file
      per UG65" di atas untuk menambahkannya ke `FMIPA-UG65-LT2.json`.
- [ ] **Penamaan device WS502 di LT2 tidak konsisten** dengan LT4 —
      `WS502_A_2_C14.02.03` dan `WS502_B_2_C14.02.03B` (ada sisipan `_2_`
      dan akhiran `B` ganda) dibanding pola bersih `WS502_A_<ruangan>` di
      LT4. Ini cuma label di network-server (tidak mempengaruhi flow, yang
      dipakai flow adalah EUI-nya), tapi kalau mau konsisten sebaiknya
      di-rename di network-server UG65 LT2.
- [ ] **Node-RED di Mini PC belum ikut auto-start** — `deploy/start-fmipa.ps1`
      saat ini cuma menjalankan XAMPP+Backend+Frontend, belum menjalankan
      Node-RED. Perlu dicek dulu bagaimana Node-RED di Mini PC ini biasanya
      dijalankan (service Windows terpisah / `node-red` manual / PM2) sebelum
      ditambahkan ke script boot.
- [ ] **Telemetri WS502_B, WS523_A, WS523_B belum di-decode** — baru VS370
      (occupancy) dan WS502_A (lampu, representatif) yang dipasang Device
      Filter + decoder + POST `/api/v1/consumption`. Duplikasi pola yang
      sama untuk WS502_B kalau perlu data per-unit; WS523 belum ada script
      decoder resmi di flow ini (ambil dari dokumentasi Milesight WS523,
      sama seperti VS370/WS502 di-paste dari dokumentasi mereka).
- [ ] **PATCH status per-device** (`/api/v1/devices/:id/status`, `/reading`)
      belum disertakan di flow — butuh `device.id` dari database yang belum
      ada (lihat poin `classes`/`devices` di atas). Baru consumption POST
      (pakai `class_code`, bukan id) yang jalan tanpa perlu tahu ID.
- [x] **IP terminal Hikvision terisi** — dikonfirmasi dari network scan
      user, dan diverifikasi dari sisi kita (`curl` ke `/ISAPI/System/deviceInfo`
      tiap IP, semua balas 401 — signature khas Hikvision, bukan tebakan
      buta). Pemetaan IP→ruangan:

      | Ruangan | IP Hikvision |
      |---|---|
      | C14.04.02 | `192.168.137.50` |
      | C14.04.05 | `192.168.137.14` |
      | C14.04.08 | `192.168.137.162` |
      | C14.04.09 | `192.168.137.38` |
      | C14.02.03 | `192.168.137.25` |

      ⚠️ **Satu hal belum pasti**: user menulis ruangan **"C14.04.03"**
      untuk IP `192.168.137.50` — ruangan itu **tidak ada** di data EUI
      LoRaWAN (yang ada cuma `.02`/`.05`/`.08`/`.09`). Diasumsikan typo
      untuk **C14.04.02** (satu-satunya ruangan LT4 yang belum kebagian
      IP) dan sudah dipakai sebagai asumsi di file. **WAJIB dikonfirmasi
      ulang sebelum demo** — kalau ternyata `.50` itu untuk ruangan lain,
      tap kartu di C14.04.02 akan salah sasaran (menyalakan ruangan yang
      salah).
- [ ] **Model/protokol terminal Hikvision FMIPA belum dikonfirmasi** —
      `FMIPA-ACCESS-CONTROL.json` meng-copy asumsi Major 5/Minor 1 (kode
      event "verifikasi akses berhasil") dan node type
      `hikvisionUltimateAccessControlTerminal` dari flow FIP yang terbukti
      jalan dengan model **DS-K1T342MFX**. Kalau model Hikvision FMIPA
      berbeda, kode event/behavior node bisa berbeda juga — perlu dicek.
- [ ] **npm package `node-red-contrib-hikvision-ultimate`** perlu
      ter-install di Node-RED Mini PC (sudah dideklarasikan di node
      `global-config` dalam file, tapi Node-RED tidak auto-install —
      install manual dulu lewat Manage Palette kalau belum ada).

## Otomasi: RFID/NFC + Okupansi (pola sama seperti FIP)

Prioritas kendali per ruangan (dari yang paling menang), berlaku sama untuk
**semua 5 ruangan** (LT4 dan LT2):

1. **Tombol Web (ON/OFF via API)** — menang mutlak **30 menit** sejak
   ditekan (`override_<classKey>`, dicek oleh `occupancy_auto_control_shared`
   di kedua file UG65 — kalau aktif, otomasi RFID/okupansi diam total).
2. **Tap RFID/NFC** (Hikvision, `FMIPA-ACCESS-CONTROL.json`) — begitu
   terverifikasi (Major 5/Minor 1): kirim `POST /api/<classKey>`
   `{state:"on", source:"door_access"}` ke `FMIPA-CONTROL-HUB.json` →
   `manual_override_shared` di UG65 yang bersangkutan set
   `door_window_<classKey>` aktif **25 menit**. Selama itu ruangan tetap
   menyala (semua unit AC+lampu), TIDAK mengikuti sensor okupansi.
3. **Sensor VS370 (default)** — `occupancy_auto_control_shared` bereaksi
   tiap ada laporan VS370 baru: `occupied` → nyala, `vacant` → mati. Event
   -driven, bukan timer proaktif.

## Fix: event akses tidak tersimpan dengan benar (`class_id` NULL)

Ditemukan lewat tes langsung (simulasi tap): `build_access_alert_shared` di
`FMIPA-ACCESS-CONTROL.json` memang sudah kirim event akses ke
`POST /api/v1/alerts/device-event` (baris `alerts` benar-benar tersimpan di
database), **tapi** `class_id`-nya selalu `NULL` — kode ruangan cuma ada di
`metadata.room` (JSON blob), bukan di kolom `class_id` yang sebenarnya.
Akibatnya `Alert.getByClass()` (model, `WHERE class_id = ?` — dipakai
tampilan alert per-ruangan) **tidak akan pernah** menemukan event akses
manapun, walau datanya ada di database.

Diperbaiki: `check_access_granted_and_tag` sekarang juga men-tag
`msg.classId` (dari `FMIPA_CLASS_IDS`, hasil `SELECT id, name FROM classes`
di `smart_energy_fmipa` setelah `seed_fmipa.sql`), dan
`build_access_alert_shared` mengirim `class_id` itu di payload. Diverifikasi
langsung: simulasi tap C14.04.02 → baris `alerts` baru dengan `class_id = 1`
(cocok dengan `classes.id` C14.04.02 yang sebenarnya).

⚠️ `FMIPA_CLASS_IDS` di `gen-fmipa.js` (generator, bukan bagian repo) pakai
angka hasil query manual saat itu (`1..5` sesuai urutan insert
`seed_fmipa.sql`). Kalau `classes` FMIPA pernah di-seed ulang dari state
yang berbeda (bukan database kosong), **verifikasi ulang** ID-nya lewat
`SELECT id, name FROM classes` sebelum percaya mapping ini.

## MQTT (jalur telemetri alternatif, pola FIKK) — BELUM TERVERIFIKASI

FIKK menerima telemetri UG65→Mini PC lewat MQTT (bukan cuma custom node
"LoRa Input"), dari broker MQTT bawaan network-server UG65 sendiri. Kedua
file UG65 FMIPA sekarang punya node `mqtt-broker`+`mqtt in` sebagai **jalur
paralel** ke LoRa Input yang sudah ada (tidak menggantikan) — begitu sampai
di `route_mqtt_uplink_by_eui`, hasilnya masuk ke decoder shared yang SAMA
(VS370/WS502), jadi efeknya identik baik data datang lewat LoRa Input
maupun MQTT.

**Ini murni kerangka, belum ada satupun yang dikonfirmasi dari hardware
asli**:
- Broker: diasumsikan di IP UG65 itu sendiri, port `1883` (default MQTT) —
  belum dicek apakah UG65 FMIPA benar-benar menjalankan broker di situ.
- Topic: placeholder `TODO/VERIFY/TOPIC/#` — harus diganti sesuai topic
  asli.
- Struktur payload JSON: diasumsikan mirip pola umum ChirpStack
  (`{devEui, data (base64), fPort}`), **belum dikonfirmasi** dari payload
  MQTT asli UG65.

Cek semua ini di admin UG65 masing-masing (Network Server → Application →
Integration → MQTT) sebelum jalur ini berguna. Sampai saat itu, node
`mqtt in` kemungkinan besar tidak menerima apa-apa (topic salah) atau
error parse (format beda dari asumsi) — **tidak berbahaya**, cuma tidak
berfungsi, dan tidak mengganggu jalur LoRa Input yang sudah terbukti jalan.

## Proyektor (SN3001P) — pola FIKK, backend langsung, belum ada data

FIKK mengontrol proyektor via IR blaster **SN3001P** **langsung dari
backend lewat TCP** (`FIKK_PROJECTOR_IR` di `DeviceController.js`) — bukan
lewat Node-RED sama sekali. FMIPA sekarang punya `FMIPA_PROJECTOR_IR` yang
mengikuti pola sama (lihat kode di sana), tapi **objeknya masih kosong**:

- Network scan menemukan 2 device SN3001P nyata di jaringan FMIPA
  (`192.168.137.28` dan `192.168.137.60` / `SN300X.mshome.net`), tapi
  **belum dikonfirmasi ruangan mana masing-masing**.
- **Belum ada kode IR ON/OFF yang di-learn** untuk ruangan manapun (sama
  seperti gap FIKK — cuma U5.02.01 yang confirmed di sana).

Sengaja dibiarkan kosong (bukan ditebak) supaya endpoint kontrol proyektor
mengembalikan 404 alih-alih menembak kode yang salah. Isi begitu datanya
ada:
```js
const FMIPA_PROJECTOR_IR = {
  c140402: { host: '192.168.137.28', port: 5301, onHex: '...', offHex: '...' }
};
```
Tidak perlu baris `classes`/`devices` tambahan untuk proyektor sampai
ruangannya dikonfirmasi — kalau dipaksa ditambahkan sekarang tanpa tahu
`class_id` yang benar, bisa salah ruangan.

## Kenapa (hampir) tidak perlu ubah `DeviceController.js`

FMIPA ikut pola **FIKK** (fallback HTTP), bukan pola FIP (TCP langsung dari
backend): classKey FMIPA (`c140402`, dst.) **sengaja tidak didaftarkan** di
`TARGETS` pada `backend/controllers/DeviceController.js`. Akibatnya
`resolveTcpTarget()` selalu `null` untuk device FMIPA, otomatis jatuh ke
`getNodeRedClassEndpointUrl()` yang memanggil
`POST http://<NODERED_BASE_URL>/api/<classKey>` — endpoint inilah yang
diimplementasikan oleh `http in` node di `FMIPA-CONTROL-HUB.json`. Satu
pengecualian: `FMIPA_PROJECTOR_IR` (lihat di atas) — proyektor FIKK/FMIPA
memang dikendalikan backend langsung, bukan lewat Node-RED, jadi butuh
entry map di kode (bukan cuma data), tapi objeknya kosong sampai datanya
ada, jadi tidak mengubah perilaku apa pun untuk sekarang.

## Rencana port

| Port | Di mana | Arah | Isi |
|---|---|---|---|
| 1880 (`/api/:classKey`) | Mini PC (`FMIPA-CONTROL-HUB.json`) | Backend → Mini PC | kontrol ON/OFF, HTTP fallback (pola FIKK), satu pintu masuk semua ruangan |
| 5400 | Mini PC (`FMIPA-CONTROL-HUB.json`) | UG65 (kedua gateway) → Mini PC | relay telemetri (consumption) ke Web |
| 5300 | UG65 LT4 (`FMIPA-UG65-LT4.json`) | Mini PC → UG65 LT4 | override, **satu port untuk semua ruangan LT4** — dibedakan lewat `classKey` di payload |
| 5300 | UG65 LT2 (`FMIPA-UG65-LT2.json`) | Mini PC → UG65 LT2 | override, satu port untuk semua ruangan LT2 (aman pakai nomor port sama dengan LT4 karena beda IP/mesin) |

## Daftar device UG65 #1 (`FMIPA_LT4_Gateway`, 4 ruangan × 5 device)

Diambil dari `https://192.168.137.245/#networkserver/device`. Setiap
ruangan: 2 unit AC (WS523, akhiran `-A`/`-B`), 2 unit lampu (WS502 3W-EU,
akhiran `-A`/`-B`), 1 sensor okupansi (VS370).

| Ruangan | Device | EUI |
|---|---|---|
| C14.04.02 | AC A (WS523) | `24E1241480603858` |
| C14.04.02 | AC B (WS523) | `24E124148060C77B` |
| C14.04.02 | Lampu A (WS502) | `24E124771063C28D` |
| C14.04.02 | Lampu B (WS502) | `24E124771063354D` |
| C14.04.02 | Okupansi (VS370) | `24E1247730636D7B` |
| C14.04.05 | AC A (WS523) | `24E124148060EAB9` |
| C14.04.05 | AC B (WS523) | `24E12414806097F2` |
| C14.04.05 | Lampu A (WS502) | `24E1247710633F62` |
| C14.04.05 | Lampu B (WS502) | `24E124771063F3DB` |
| C14.04.05 | Okupansi (VS370) | `24E124773063BC9A` |
| C14.04.08 | AC A (WS523) | `24E124148060B53B` |
| C14.04.08 | AC B (WS523) | `24E1241480605120` |
| C14.04.08 | Lampu A (WS502) | `24E1247710636DE8` |
| C14.04.08 | Lampu B (WS502) | `24E124771063ECF8` |
| C14.04.08 | Okupansi (VS370) | `24E124773063969F` |
| C14.04.09 | AC A (WS523) | `24E124148060ECFC` |
| C14.04.09 | AC B (WS523) | `24E124148060DB65` |
| C14.04.09 | Lampu A (WS502) | `24E124771063C788` |
| C14.04.09 | Lampu B (WS502) | `24E124771063962D` |
| C14.04.09 | Okupansi (VS370) | `24E124773063D3F2` |

Catatan: pada saat data ini diambil, hanya sebagian device berstatus
"Online" (sisanya "Never activated" — belum pernah mengirim uplink sama
sekali). Itu tidak menghalangi kontrol ON/OFF (downlink LoRa Class C tidak
butuh device pernah uplink dulu), tapi berarti belum ada data telemetri
awal untuk device yang "Never activated" sampai device itu benar-benar
menyala/terhubung.

## Daftar device UG65 LT2 (`FMIPA_LT2_Gateway`, 1 ruangan × 5 device)

Diambil dari `https://192.168.137.163/#networkserver/device`.

| Ruangan | Device | EUI |
|---|---|---|
| C14.02.03 | AC A (WS523) | `24E124148060DAC1` |
| C14.02.03 | AC B (WS523) | `24E124148060A687` |
| C14.02.03 | Lampu A (WS502) | `24E124771063A184` |
| C14.02.03 | Lampu B (WS502) | `24E1247710630C7B` |
| C14.02.03 | Okupansi (VS370) | `24E1247730634F97` |

## Cara deploy (ringkas)

1. Selesaikan semua item checklist "BELUM diverifikasi" di atas.
2. Di UG65 LT4 (`https://192.168.137.245/node-red/`): import
   `FMIPA-UG65-LT4.json` → Deploy. Di UG65 LT2
   (`https://192.168.137.163/node-red/`): import
   `FMIPA-UG65-LT2.json` → Deploy.
3. Di Mini PC (`http://localhost:1880` atau `http://127.0.0.1:1880`):
   import `FMIPA-CONTROL-HUB.json` → Deploy. Kalau IP Hikvision sudah ada,
   isi ke `FMIPA-ACCESS-CONTROL.json` lalu import juga → Deploy (boleh
   ditunda kalau IP Hikvision belum ada — kontrol AC/lampu tetap jalan
   tanpa file ini, cuma otomasi tap RFID yang belum aktif).
4. Set `NODERED_BASE_URL` di `backend/.env` Mini PC, restart backend.
5. Seed `classes`+`devices` FMIPA di database (lihat checklist di atas).
6. Uji ON/OFF lewat dashboard Web untuk 1 unit dulu (mis. Lampu A
   C14.04.02, yang hex-nya sudah proven), baru lanjut ke unit lain setelah
   WS523 hex terkonfirmasi.
7. Baru setelah itu jalankan `deploy/install-task-fmipa.ps1` (as
   Administrator) supaya dashboard auto-start saat Mini PC boot — pastikan
   path & asumsi XAMPP di `deploy/start-fmipa.ps1` sudah benar dulu (lihat
   catatan di file itu).
