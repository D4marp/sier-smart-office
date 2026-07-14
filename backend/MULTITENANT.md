# 🏛️ Arsitektur Multi-Tenant — Rektorat & Fakultas

Sistem memakai model **satu database per fakultas** dengan **registry terpusat di level rektorat**.

```
                    ┌──────────────────────────────┐
                    │  smart_energy_registry       │  ← level REKTORAT
                    │  • tenants (daftar fakultas  │
                    │    + kredensial DB masing²)  │
                    │  • users (login terpusat)    │
                    │  • registry_audit_logs       │
                    └──────────────┬───────────────┘
                                   │ resolve tenant per-request
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
  │ smart_energy_      │ │ smart_energy_fbs   │ │ smart_energy_<baru>│
  │ dashboard          │ │ (Fak. Bahasa &     │ │ (provisioning via  │
  │ (Fak. Psikologi)   │ │  Seni)             │ │  POST /tenants)    │
  │ classes, devices,  │ │ classes, devices,  │ │ ...                │
  │ consumption, ...   │ │ consumption, ...   │ │                    │
  └────────────────────┘ └────────────────────┘ └────────────────────┘
```

## Cara kerja resolusi tenant

Setiap request ke route data (`/classes`, `/devices`, `/consumption`, `/alerts`, `/settings`)
melewati middleware `resolveTenant` yang memilih database fakultas berdasarkan (urutan prioritas):

1. Header **`X-Tenant: <kode>`** (dikirim otomatis oleh frontend)
2. Query `?tenant=<kode>`
3. Klaim `tenant` di JWT user yang login
4. `DEFAULT_TENANT` dari `.env` (kompatibilitas Node-RED lama tanpa header)

Pool koneksi tenant disimpan dalam AsyncLocalStorage context, sehingga **semua model
(`Class.js`, `Device.js`, dst.) tetap memakai `db.query(...)` tanpa perubahan** —
`config/database.js` adalah proxy yang mendelegasikan ke pool tenant aktif.

**Isolasi:** user non-superadmin yang terikat pada satu fakultas ditolak (403) bila
mencoba mengakses tenant lain. Akun `superadmin` (rektorat, `tenant_id NULL`) bebas
berpindah fakultas.

## Role & akses

| Role | Level | Akses |
|---|---|---|
| `superadmin` | Rektorat | Semua fakultas, kelola tenant & semua user, rollup lintas-fakultas |
| `admin` | Fakultas | Data + user fakultasnya sendiri |
| `manager`/`viewer` | Fakultas | Data fakultasnya sendiri |

## Endpoint baru (level rektorat)

```
GET  /api/v1/tenants            daftar fakultas (untuk switcher; perlu login)
GET  /api/v1/tenants/overview   rollup lintas-fakultas: konsumsi hari ini, device,
                                alert aktif per fakultas (superadmin)
POST /api/v1/tenants            provisioning fakultas baru: buat database + schema
                                + daftarkan di registry (superadmin)
PUT  /api/v1/tenants/:code      ubah nama/status tenant (superadmin)
```

Contoh provisioning Fakultas Teknik:

```bash
curl -X POST http://localhost:5001/api/v1/tenants \
  -H "Authorization: Bearer <token-superadmin>" \
  -H "Content-Type: application/json" \
  -d '{"code": "ft", "name": "Fakultas Teknik"}'
# → membuat database smart_energy_ft + seluruh schema + terdaftar di registry
```

## Setup awal

```bash
cd backend
node scripts/setup_multitenant.js
```

Script ini idempotent dan melakukan:
1. Membuat `smart_energy_registry` + schema
2. Mendaftarkan tenant `psikologi` → database lama `smart_energy_dashboard` (data tidak disentuh)
3. Provisioning tenant `fbs` → database baru `smart_energy_fbs`
4. Memindahkan users lama ke registry (`admin@unesa.ac.id` → superadmin rektorat)
5. Membuat akun rektorat: `rektorat@unesa.ac.id` / `rektorat123` (**segera ganti!**)

## Provisioning seluruh fakultas UNESA

```bash
node scripts/seed_unesa_faculties.js
```

Mendaftarkan 12 fakultas UNESA lengkap dengan lokasi kampus (tersimpan di
`tenants.metadata` dan diekspos sebagai field `campus` di API):

| Kampus | Fakultas (kode tenant) |
|---|---|
| Kampus Lidah Wetan | FIP (`fip`), FBS (`fbs`), FIKK (`fikk`), Psikologi (`psikologi`), FK (`fk`) |
| Kampus Ketintang | FT (`ft`), FEB (`feb`), FMIPA (`fmipa`), FISIPOL (`fisipol`), FV (`fv`), FH (`fh`) |
| Kampus 3 Moestopo | FKP (`fkp`) |

Script idempotent: tenant existing hanya diperbarui nama & metadata-nya,
database dan datanya tidak disentuh.

## Migrasi schema ke semua fakultas

Konsekuensi database-per-fakultas: setiap perubahan schema harus diterapkan ke N database.

```bash
node scripts/migrate_all_tenants.js path/ke/migrasi.sql
```

## Integrasi Node-RED / IoT per fakultas

Collector Node-RED tiap fakultas cukup menambahkan header pada request HTTP ke backend:

```
X-Tenant: psikologi   (atau fbs, ft, ...)
```

Request lama tanpa header tetap berfungsi dan masuk ke `DEFAULT_TENANT` (psikologi).

## Frontend

- `apiClient.ts` otomatis mengirim `X-Tenant` dari `localStorage.active_tenant`
- User fakultas: tenant terkunci otomatis saat login
- Superadmin: dropdown switcher fakultas muncul di pojok kanan atas (komponen `TenantSwitcher`)
- `tenantsAPI.overview()` tersedia untuk membangun dashboard rektorat lintas-fakultas

## Environment variables baru

```env
REGISTRY_DB_NAME=smart_energy_registry   # database registry rektorat
DEFAULT_TENANT=psikologi                 # fallback bila request tanpa X-Tenant
# REGISTRY_DB_HOST/PORT/USER/PASSWORD    # bila registry di server terpisah
```
