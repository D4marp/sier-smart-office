# Integrasi Node-RED FIKK (U5.02.01 s/d U5.03.05)

Dokumen ini menjelaskan arsitektur integrasi LoRaWAN untuk tenant **FIKK**, yang
berbeda dari pola Psikologi (`Q1.01.02-COLLECTOR.json`, IR + gateway WS501/WS502
di satu Node-RED) maupun FISIPOL (`I3.02.0X-COLLECTOR.json`, RM4 Pro/IR + TCP
langsung dari backend — lihat [backend/nodered/README.md](../backend/nodered/README.md)).

## Kenapa berbeda

FIKK memakai gateway LoRaWAN fisik **Milesight UG65**, terpasang terpisah dari
Mini PC yang menjalankan backend + frontend. UG65 punya Node-RED sendiri dengan
node custom (`LoRa Input`, `LoRa Output`, `Device Filter`) yang hanya tersedia di
firmware UG65 — bukan node-red biasa yang bisa diinstal di Mini PC. Karena itu
ada **dua** flow Node-RED terpisah untuk FIKK, bukan satu seperti Psikologi/FISIPOL:

```
Web Dashboard
    │  ON/OFF: POST /api/v1/devices/:id/control
    ▼
Backend (DeviceController.js)
    │  classKey FIKK (u50201, dst.) SENGAJA TIDAK didaftarkan di TARGETS,
    │  supaya otomatis jatuh ke fallback HTTP Node-RED
    ▼
Node-RED Mini PC (http in /api/<classKey>)
    │  tcp request (mode "immed" — fire-and-forget, tidak menunggu balasan)
    ▼
Node-RED UG65 (tcp in override port 5101-5105)
    │  manual_override -> gate_all_vs_unit -> Switch_ON/OFF (semua unit)
    │                                      -> router per unit (WS502_A/B, WS523_A/B/C)
    ▼
LoRaWAN downlink (fPort 85, hex payload -> base64) ke device EUI tujuan
    ▼
WS502 (lampu) / WS523 (AC) fisik di ruangan
```

Arah sebaliknya (telemetri — konsumsi daya, okupansi) mengalir dari UG65 ke Mini
PC lewat MQTT + HTTP POST langsung ke `/api/v1/consumption` dan endpoint
okupansi, lalu Mini PC merelay/menyimpan sesuai kebutuhan dashboard.

## Kenapa classKey FIKK tidak ada di `TARGETS`

Di `backend/controllers/DeviceController.js`, map `TARGETS` dipakai fakultas yang
backend-nya membuka koneksi TCP **langsung** ke Node-RED (Psikologi, FISIPOL).
FIKK sengaja **tidak** didaftarkan di sana — classKey-nya (`u50201`, `u50202`,
dst.) tidak muncul di `TARGETS.ac`/`.lamp`/`.projector`, sehingga
`resolveTcpTarget()` selalu mengembalikan `null` untuk device FIKK dan otomatis
jatuh ke fallback HTTP (`getNodeRedClassEndpointUrl`) yang memanggil
`http://localhost:1880/api/<classKey>` di Mini PC. Node-RED Mini PC-lah yang
melakukan konversi ke TCP override (port 5101-5105) ke UG65 — bukan backend.

Ini juga alasan FISIPOL (`TARGETS.ac1/ac2/lamp1/lamp2`, dikendalikan langsung
lewat TCP dari backend) dan FIKK (fallback Node-RED) bisa hidup berdampingan di
satu `DeviceController.js` tanpa saling menabrak: keduanya cuma beda apakah
classKey-nya terdaftar di `TARGETS` atau tidak.

## Kontrol unit individual

Setiap ruangan FIKK punya 2 unit AC + 2 unit lampu (U5.03.05 punya 3 unit AC),
masing-masing baris `device` sendiri di database dengan akhiran nama
`-A`/`-B`/`-C`:

```
1  AC Unit U5.02.01-A | AC   | U5.02.01 | 24E124148F524572
25 AC Unit U5.02.01-B | AC   | U5.02.01 | 24E124148F522876
2  Lighting U5.02.01-A| LAMP | U5.02.01 | 24E124771F381195
27 Lighting U5.02.01-B| LAMP | U5.02.01 | 24E1247710574481
3  AC Unit U5.02.02-A | AC   | U5.02.02 | 24E124148F523263
28 AC Unit U5.02.02-B | AC   | U5.02.02 | 24E124148F523253
4  Lighting U5.02.02-A| LAMP | U5.02.02 | 24E124771F380363
29 Lighting U5.02.02-B| LAMP | U5.02.02 | 24E124771057631E
5  AC Unit U5.02.03-A | AC   | U5.02.03 | 24E124148E413008
30 AC Unit U5.02.03-B | AC   | U5.02.03 | 24E124148F522484
6  Lighting U5.02.03-A| LAMP | U5.02.03 | 24E124771057ACF5
31 Lighting U5.02.03-B| LAMP | U5.02.03 | 24E124771057E778
7  AC Unit U5.02.04-A | AC   | U5.02.04 | 24E124148F523125
32 AC Unit U5.02.04-B | AC   | U5.02.04 | 24E124148F520635
8  Lighting U5.02.04-A| LAMP | U5.02.04 | 24E1247710579AA0
33 Lighting U5.02.04-B| LAMP | U5.02.04 | 24E1247710579076
9  AC Unit U5.03.05-A | AC   | U5.03.05 | 24E124148F522933
10 AC Unit U5.03.05-B | AC   | U5.03.05 | 24E124148F524680
11 AC Unit U5.03.05-C | AC   | U5.03.05 | 24E124148F520546
12 Lighting U5.03.05-A| LAMP | U5.03.05 | 24E124771057E992
34 Lighting U5.03.05-B| LAMP | U5.03.05 | 24E124771057E2B4
```

Mekanisme unitnya **beda** dari FISIPOL (yang pakai akhiran numerik `-001`/`-002`
pada `device_eui`, dipetakan lewat `TARGETS.ac1`/`.ac2`/`.lamp1`/`.lamp2` dan
endpoint backend khusus per-unit). FIKK memakai akhiran huruf pada
`device_name` (`-A`/`-B`/`-C`), yang dibaca di `controlViaNodeRed`:

```js
const unitMatch = String(device.device_name || '').match(/-([ABC])$/)
const unit = unitMatch ? `${targetType === 'ac' ? 'WS523' : 'WS502'}_${unitMatch[1]}` : undefined
const payload = { state: normalizedAction, ...(unit ? { unit } : {}) }
```

`unit` (mis. `"WS523_A"`) dikirim ke Node-RED Mini PC, diteruskan apa adanya ke
UG65 lewat TCP, lalu di UG65 node `gate_all_vs_unit` (disisipkan di antara
`manual_override` dan `Switch_ON/OFF`) memutuskan: kalau `msg.payload.unit` ada,
route ke unit spesifik itu saja; kalau tidak ada, route ke `Switch_ON/OFF` yang
menyalakan/mematikan **semua** unit tipe itu di ruangan tsb sekaligus.

Di frontend (`src/app/fakultas/[code]/page.tsx`), kartu "Kontrol ON/OFF Ruangan"
mendeteksi pola unit lewat `isFisipolUnitStyle()` (cek akhiran `device_eui`
numerik `-00N`). Untuk ruangan FIKK (EUI asli LoRaWAN, tanpa akhiran itu), kartu
ruangan cukup menampilkan tombol "nyalakan/matikan semua unit tipe ini"
(`handleRoomTypeControl`, tanpa `unit` di payload → efeknya sama seperti
`Switch_ON/OFF`) — kontrol **per unit individual** untuk FIKK dilakukan lewat
tombol per baris di tabel "Daftar Status Perangkat" (satu tombol ON/OFF per
`device.id`, lewat `handleDeviceControl` → endpoint per-device yang menyertakan
`unit` dari akhiran `device_name`).

## Known gaps / TODO

- **Proyektor**: baru U5.02.01 yang kodenya terkonfirmasi (`FIKK_PROJECTOR_IR.u50201`
  di `DeviceController.js`, IR blaster SN3001P). Ruangan lain (U5.02.02 s/d
  U5.03.05) belum di-learn kode IR-nya — endpoint kontrolnya akan mengembalikan
  404 (bukan menembak kode yang salah) sampai kode IR-nya di-learn dan
  ditambahkan ke `FIKK_PROJECTOR_IR`. Dideprioritaskan sesuai instruksi: fokus
  dulu ke AC/lampu (WS523/WS502).
- **5 flow UG65** (satu per ruangan, disimpan di luar repo git karena berjalan
  di mesin UG65 terpisah) perlu di-deploy manual ke masing-masing UG65 lewat
  admin Node-RED-nya sendiri — tidak ada mekanisme auto-deploy dari repo ini.
- **Flow Mini PC** juga tidak tersimpan sebagai file di repo (dikelola langsung
  lewat `http://localhost:1880` di Mini PC) — hanya arsitekturnya yang
  didokumentasikan di sini.
