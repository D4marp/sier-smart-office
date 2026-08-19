# 🏢 Arsitektur Tenant — PT SIER Smart Office

Sistem memakai model **satu database per tenant** dengan **registry terpusat**.
PT SIER berjalan sebagai **tenant tunggal** (`sier`), mewakili satu gedung
kantor dengan 19 ruangan (Ruang Meeting Red/Green/Blue, Ruang Direksi
RDP/RRW, Ruang Kadiv 1-11, Toilet Lt 5, Tambahan Ruang Lt 4).

```
                    ┌──────────────────────────────┐
                    │  smart_energy_registry       │  ← registry
                    │  • tenants (daftar tenant     │
                    │    + kredensial DB masing²)  │
                    │  • users (login terpusat)    │
                    │  • registry_audit_logs       │
                    └──────────────┬───────────────┘
                                   │ resolve tenant per-request
                                   ▼
                        ┌────────────────────┐
                        │ smart_energy_sier   │
                        │ classes (ruangan),  │
                        │ devices, consumption│
                        │ alerts, ...         │
                        └────────────────────┘
```

## Cara kerja resolusi tenant

Setiap request ke route data (`/classes`, `/devices`, `/consumption`, `/alerts`, `/settings`)
melewati middleware `resolveTenant` yang memilih database tenant berdasarkan (urutan prioritas):

1. Header **`X-Tenant: <kode>`** (dikirim otomatis oleh frontend)
2. Query `?tenant=<kode>`
3. Klaim `tenant` di JWT user yang login
4. `DEFAULT_TENANT` dari `.env` (default: `sier`)

Pool koneksi tenant disimpan dalam AsyncLocalStorage context, sehingga **semua model
(`Class.js`, `Device.js`, dst.) tetap memakai `db.query(...)` tanpa perubahan** —
`config/database.js` adalah proxy yang mendelegasikan ke pool tenant aktif.

## Role & akses

| Role | Akses |
|---|---|
| `superadmin` | Semua data, kelola tenant & semua user |
| `admin`/`manager`/`viewer` | Data gedung SIER |

## Setup awal

```bash
cd backend
node scripts/setup_sier.js
```

Script ini idempotent dan melakukan:
1. Membuat `smart_energy_registry` + schema
2. Provisioning tenant `sier` → database `smart_energy_sier`
3. Mengisi 19 ruangan & seluruh perangkat Milesight/ATEN/Broadlink dari
   bagan Smart Meeting Room ICT (`database/seed_sier.sql`)
4. Membuat akun admin: `admin@sier.id` / `sier12345` (**segera ganti!**)

## Migrasi schema

```bash
node scripts/migrate_all_tenants.js path/ke/migrasi.sql
```

## Integrasi Node-RED / IoT

Collector Node-RED cukup menambahkan header pada request HTTP ke backend:

```
X-Tenant: sier
```

Request tanpa header tetap berfungsi dan masuk ke `DEFAULT_TENANT` (`sier`).

## Frontend

- `apiClient.ts` otomatis mengirim `X-Tenant` dari `localStorage.active_tenant`
- Tenant terkunci otomatis saat login (satu-satunya tenant: `sier`)

## Environment variables

```env
REGISTRY_DB_NAME=smart_energy_registry   # database registry
DEFAULT_TENANT=sier                      # fallback bila request tanpa X-Tenant
# REGISTRY_DB_HOST/PORT/USER/PASSWORD    # bila registry di server terpisah
```
