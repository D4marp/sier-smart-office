# Integrasi Node-RED FIP (O2.02.10 s/d O2.02.14)

Dokumen ini menjelaskan arsitektur integrasi LoRaWAN untuk tenant **FIP**.
**PENTING untuk fakultas lain yang meniru pola ini**: baca bagian
["Kenapa 2 Node-RED, bukan 1"](#kenapa-2-node-red-bukan-1) dan
["Panduan umum untuk fakultas lain"](#panduan-umum-untuk-fakultas-lain-yang-punya-ug65)
di bawah sebelum mulai — kesalahan paling umum (dan paling banyak menghabiskan
waktu debug di FIP) adalah mencoba pasang node `http in`/`http request` di
Node-RED UG65, padahal **UG65 tidak bisa menjalankan node HTTP sama sekali**.

## Ada 2 Node-RED, bukan 1

| | UG65 | Mini PC |
|---|---|---|
| Alamat | `https://192.168.1.150/node-red/` | `http://192.168.1.190:1880` (`127.0.0.1:1880` dari mesin ini sendiri) |
| Isi | 5 file `O2.02.1X-COLLECTOR.json` (satu tab per ruangan) | `FIP-ACCESS-CONTROL.json` (Hikvision) + `FIP-CONTROL-HUB.json` (API AC/Lampu) |
| Bisa HTTP? | **TIDAK BISA** — firmware UG65 cuma punya node TCP (`tcp in`/`tcp out`), tidak ada `http in`/`http request` sama sekali | **BISA** — Node-RED penuh (npm), boleh HTTP ke mana saja |
| Peran | Jalankan node custom Milesight (`LoRa Input`, `LoRa Output`, `Device Filter`) + Modbus + terima/kirim TCP | Satu-satunya titik yang boleh bicara ke Web (backend `:5001`) |

### Kenapa 2 Node-RED, bukan 1

Sebelumnya sempat dicoba pasang `http in`/`http request` langsung di flow
ruangan (yang berjalan di UG65) — hasilnya: node itu tidak pernah benar-benar
listening (port tidak pernah terbuka walau sudah Deploy berkali-kali, error
port bentrok, dsb). Setelah dicek, ternyata **flow 5 ruangan itu memang jalan
di UG65** (gateway LoRaWAN fisik terpisah, `192.168.1.150`), bukan di Mini PC
(`192.168.1.190`) seperti asumsi awal — dan **firmware UG65 tidak menyediakan
node `http in`/`http request` sama sekali**, cuma TCP. Semua percobaan pasang
HTTP di sana pasti gagal, terlepas sebagus apa pun konfigurasinya.

**Kalau fakultas lain punya gateway LoRaWAN fisik terpisah (UG65 atau
sejenisnya) — JANGAN pasang node `http in`/`http request` di Node-RED
gateway itu.** Pola yang benar (dipakai FIP & FIKK):

```
Gateway LoRaWAN (UG65, dst.)          Mini PC (jalankan backend+frontend)
  - LoRa Input/Output, Modbus           - http in / http request (BOLEH)
  - tcp in / tcp out (BOLEH)            - tcp in / tcp out (relay)
  - HTTP: TIDAK BISA                    - satu-satunya titik ke Web
```

Semua komunikasi ke Web (consumption, status device, alert) dari gateway
HARUS lewat TCP dulu ke Mini PC, baru Mini PC yang benar-benar memanggil HTTP.
Begitu juga kontrol dari Web ke gateway: Mini PC yang menerima HTTP dari
backend, lalu meneruskan ke gateway lewat TCP.

## Hardware

Gateway LoRaWAN: **FIP_Unesa_Gateway** (di UG65, `192.168.1.150`). Per ruang:

- **1x VS370** (Milesight, sensor okupansi PIR)
- **1x WS502** (Milesight, relay 2-channel + power monitoring — dipakai untuk
  lampu; EUI yang sama juga dipakai sebagai target `LoRa Output` ON/OFF)
- **AC** — dikontrol lewat **Modbus TCP** ke gateway RS485-Ethernet **"USR"**
  (`192.168.1.107:502`), satu `unit id` Modbus per ruang. Tidak ada feedback
  daya (watt) dari AC — hanya ON/OFF, tanpa metering.
- **Hikvision DS-K1T342MFX** (access control/RFID) per ruang, terhubung ke
  Mini PC lewat node `hikvisionUltimateAccessControlTerminal`
  (`node-red-contrib-hikvision-ultimate`).

| Ruangan | Modbus unit ID | VS370 EUI | WS502 EUI | Access Control IP |
|---|---|---|---|---|
| O2.02.10 | 2 | 24E12477306168FB | 24E124771057E2BB | 192.168.1.61 |
| O2.02.11 | 4 | 24E1247730612192 | 24E1247710632D66 | 192.168.1.60 |
| O2.02.12 | 5 | 24E1247730613C14 | 24E1247710578A86 | 192.168.1.63 |
| O2.02.13 | 3 | 24E124773061DB97 | 24E124771063A624 | 192.168.1.64 |
| O2.02.14 | 1 | 24E1247730613617 | 24E124771057C1CF | 192.168.1.62 |

**Satu switch gabungan AC+Lampu per ruangan** — FIP tidak punya unit AC/lampu
ganda per ruangan (beda dari FIKK: 2-3 unit `-A`/`-B`/`-C`). Satu switch
ON/OFF menyalakan AC (Modbus) **dan** lampu (LoRa Output ke WS502)
**sekaligus** — tidak bisa independen, karena begitu memang wiring switch
yang sudah ada sebelum integrasi ini dibuat.

## Referensi Port

| Port | Di mana | Arah | Isi |
|---|---|---|---|
| 5100 | Mini PC (`FIP-CONTROL-HUB.json`) | Backend → Mini PC | `{classKey, state, source}` — kontrol ON/OFF, satu pintu masuk untuk 5 ruangan |
| 5200 | Mini PC (`FIP-CONTROL-HUB.json`) | UG65 → Mini PC | `{method, url, payload}` — relay telemetri (consumption/status/reading) yang lalu di-HTTP-kan Mini PC ke Web |
| 5110–5114 | UG65 (per ruangan) | Mini PC → UG65 | `{state, source}` — diterima `manual_override`, satu port unik per ruangan (O2.02.10=5110 ... O2.02.14=5114) |
| 801–805 | UG65 (per ruangan) | Mini PC → UG65 | **Jalur LAMA** dari Hikvision (tap RFID → paksa "on" tanpa syarat). Sekarang **duplikat** dengan jalur baru (5100→5110-5114) yang menghormati override Web/jendela 25 menit — lihat catatan di bawah. |
| 502 | `192.168.1.107` (gateway USR) | UG65 → USR | Modbus TCP, kontrol AC (write-only, tanpa metering) |

**Soal port 801-805**: jalur ini FUNGSINYA SAMA dengan trigger RFID→otomasi
yang baru (lihat bawah), tapi versinya "bodoh" (langsung paksa `"on"`, tidak
tahu override Web atau jendela waktu). Kedua jalur ini **masih sama-sama
aktif** saat dokumen ini ditulis — belum diputuskan untuk menonaktifkan yang
lama. **TODO: nonaktifkan `tcp out`/`tcp in` 801-805 di kedua sisi** begitu
otomasi baru (5100→5110-5114) dikonfirmasi stabil, supaya tidak ada
perintah ganda yang saling tabrak.

## Alur kontrol (Web -> perangkat fisik)

```
Web Dashboard
    │  ON/OFF: POST /api/v1/devices/class-code/O2.02.1X/control/ac|lamp
    ▼
Backend (DeviceController.js, TARGETS.ac/.lamp)
    │  classKey FIP (o20210, dst.) SEMUA menunjuk ke port 5100 di Mini PC
    │  (bukan port per-ruangan lagi -- disederhanakan jadi satu pintu masuk)
    ▼
Mini PC — FIP-CONTROL-HUB.json
    │  tcp in :5100 -> route_control_by_classKey -> switch (per classKey)
    │  -> build_state_json_<room> -> tcp out ke UG65 (port 5110-5114)
    ▼
UG65 — O2.02.1X-COLLECTOR.json
    │  manual_override (baca {state, source}) -> switch ON/OFF (existing)
    ▼
    ├─ change "AC ON/OFF" -> modbus-write (USR, 192.168.1.107:502)
    └─ LoRa Output (fPort 85, hex 0833ff/0830ff) -> WS502 EUI ruangan
```

## Alur telemetri (perangkat fisik -> Web)

```
LoRaWAN uplink (VS370 occupancy / WS502 active_power) -- UG65
    ▼
Device Filter -> Decoder Milesight (existing, tidak diubah)
    ▼
function build_consumption_from_occupancy / _from_lamp / patch_*_status / _reading
    │  UG65 tidak bisa HTTP -- payload dibungkus {method, url, payload}
    │  lalu dikirim TCP ke Mini PC, bukan dipanggil langsung dari sini
    ▼
Mini PC — FIP-CONTROL-HUB.json
    │  tcp in :5200 -> forward_telemetry_to_web -> http request (dgn retry 3x)
    ▼
Backend: POST /api/v1/consumption, PATCH /devices/:id/status|reading
```

`power_ac` sengaja tidak dikirim (tidak ada meter di sisi AC) — kolom itu
tetap kosong di `device_consumption` untuk FIP kecuali suatu saat dipasang
metering AC terpisah.

## Otomasi: RFID + Okupansi

Prioritas kendali per ruangan (dari yang paling menang):

1. **Tombol Web (ON/OFF via API)** — menang mutlak **30 menit** sejak
   ditekan (`global.override_<room>`, dicek oleh semua logic otomatis di
   bawah — kalau aktif, otomasi RFID/okupansi diam total).
2. **Tap RFID** (Hikvision, Major5/Minor1) — begitu terdeteksi:
   `FIP-ACCESS-CONTROL.json` kirim `{classKey, state:"on", source:"door_access"}`
   ke `FIP-CONTROL-HUB.json` (port 5100) → diteruskan ke UG65 → `manual_override`
   set `global.door_window_<room>` aktif **25 menit**. Selama 25 menit itu,
   ruangan tetap menyala, TIDAK mengikuti sensor okupansi.
3. **Sensor VS370 (default, setelah #1 dan #2 tidak aktif)** —
   `occupancy_auto_control_<room>` (di setiap `O2.02.1X-COLLECTOR.json`,
   disisipkan setelah "Parse VS370") bereaksi tiap ada laporan VS370 baru:
   `occupied` → nyala, `vacant` → mati. Ini **event-driven**, bukan timer
   proaktif — kalau ruangan sudah vacant sebelum jendela 25 menit habis,
   mati-nya baru terjadi begitu VS370 melapor lagi SETELAH jendela itu lewat
   (mundur beberapa menit tergantung interval report sensor, bukan persis di
   menit ke-25).

`source` yang dikirim lewat TCP membedakan asal perintah: `"web_api"`
(default, dari backend) vs `"door_access"` (dari tap RFID) — inilah yang
dibaca `manual_override` untuk menentukan jendela mana (30 vs 25 menit) yang
harus di-set.

## Bug yang diperbaiki dari flow asli

Flow lima ruangan awalnya jelas di-copy dari satu template tanpa disesuaikan
per ruangan:

1. `manual_override` men-set `global.set('override_U5.02.01', ...)` — nama
   ruangan **hardcode "U5.02.01" di semua 5 file**. Diperbaiki jadi nama
   ruangan sebenarnya (`O2.02.10`, dst.) per file.
2. `get_data_WS502` membaca/menulis `global.get("01")`/`global.set("01", ...)`
   — **key yang sama di semua 5 file**, jadi data daya lampu ruangan lain akan
   saling menimpa. Diperbaiki jadi `ws502_o20210`, dst. (per classKey).
3. `manual_override` tcp-in mendengar di port **5101 di semua 5 file** — kalau
   kelimanya di-deploy ke satu Node-RED yang sama, cuma satu yang berhasil
   bind port itu. Diperbaiki jadi 5110–5114 (satu per ruangan).
4. **Bug paling signifikan**: `manual_override` menimpa `msg.payload` jadi
   objek `{className, state}` sebelum diteruskan ke switch — padahal switch
   mengecek `msg.payload === "on"/"off"` sebagai STRING. Akibatnya perintah
   lewat jalur TCP override **tidak pernah benar-benar menyalakan
   perangkat** (cuma tampil di debug, switch tidak pernah match). Diperbaiki:
   `msg.payload` tetap string polos untuk switch, detail `{className,state}`
   dipindah ke `msg.override` (tidak dipakai logic manapun, cuma info).

Tidak ada logic switch/decoder/Modbus/LoRa Output asli yang diubah — semua
perbaikan + fitur baru di atas ditambahkan tanpa mengganggu yang sudah
terbukti jalan.

## Known gaps / TODO

- **Port 801-805 (jalur RFID lama) belum dinonaktifkan** — lihat "Referensi
  Port" di atas. Berpotensi trigger ganda dengan otomasi baru.
- **AC tidak bisa independen dari lampu** — satu switch mengendalikan
  keduanya sekaligus (lihat penjelasan hardware di atas).
- **Tidak ada metering daya AC** — hanya ON/OFF via Modbus, tanpa feedback
  watt.
- **Proyektor** — belum ada di flow sama sekali untuk FIP, belum
  dikonfigurasi.
- Vacant setelah jendela 25 menit tidak langsung mati di detik itu juga —
  menunggu laporan VS370 berikutnya (lihat bagian Otomasi di atas).

## Panduan umum untuk fakultas lain yang punya UG65

Kalau fakultas Anda juga pakai gateway LoRaWAN fisik terpisah (UG65 atau
sejenisnya, bukan cuma satu Node-RED di Mini PC seperti FISIPOL/Psikologi),
ikuti pola FIP/FIKK ini, bukan pola satu-Node-RED:

1. **Pastikan dulu**: gateway-nya benar-benar Node-RED terpisah (device
   fisik, IP beda dari Mini PC) atau cuma satu Node-RED di Mini PC seperti
   FISIPOL? Cek dengan bertanya ke pengelola hardware — jangan asumsi dari
   nama URL saja (FIP awalnya juga salah asumsi karena URL `192.168.1.190`
   kebetulan sama dengan IP Mini PC, padahal flow ruangannya ternyata jalan
   di UG65 `192.168.1.150`).
2. **Kalau ADA gateway terpisah**: jangan pernah pasang `http in`/
   `http request` di Node-RED gateway itu — cek dulu modul apa saja yang
   ter-install di sana (`GET /nodes` dengan header `Accept: application/json`
   ke admin API Node-RED-nya) untuk konfirmasi node HTTP memang tidak ada.
   Bangun relay TCP dua arah seperti `FIP-CONTROL-HUB.json` di Mini PC:
   satu `tcp in` untuk kontrol (Web → gateway), satu `tcp in` untuk telemetri
   (gateway → Web, lalu Mini PC yang HTTP-kan ke backend).
3. **Dokumentasikan port yang dipakai** (seperti tabel "Referensi Port" di
   atas) sebelum lanjut ke fakultas berikutnya — supaya tidak perlu
   mengulang proses debug yang sama.
