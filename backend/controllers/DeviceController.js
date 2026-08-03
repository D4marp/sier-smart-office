const Device = require('../models/Device');
const Consumption = require('../models/Consumption');
const net = require('net');

// Target hosts and ports for dynamic control of ac, lamp, and projector
const LAMP_GATEWAY_HOST = process.env.LAMP_GATEWAY_HOST || process.env.GATEWAY_HOST || "10.12.1.150";
const MINI_PC_NODE_RED_HOST = process.env.MINI_PC_NODE_RED_HOST || "127.0.0.1";

// FIKK lampu & AC: TIDAK dikirim TCP langsung dari backend. Sesuai arsitektur
// FIKK yang sebenarnya (Web API -> Node-RED Mini PC -> TCP -> UG65, dan
// sebaliknya), classKey FIKK sengaja TIDAK didaftarkan di TARGETS di bawah,
// supaya otomatis jatuh ke fallback HTTP Node-RED (getNodeRedClassEndpointUrl)
// yang sudah ada di controlViaNodeRed/controlClassViaNodeRed/
// controlClassDeviceTypeViaNodeRed. Node-RED (bukan backend) yang melakukan
// konversi ke TCP override port (5101-5105) ke UG65 — lihat flow Mini PC
// (http in /api/<classKey> -> tcp request ke UG65).

// FIKK proyektor: dikendalikan via IR blaster SN3001P, protokol teks
// ASCII (bukan JSON override) mengirim indeks kode IR yang sudah di-learn.
// Baru U5.02.01 yang kodenya terkonfirmasi dari flow gateway; ruangan
// lain sengaja tidak dimasukkan (belum ada kode IR-nya) supaya endpoint
// mengembalikan 404 alih-alih menembak kode yang salah.
const FIKK_PROJECTOR_IR = {
  u50201: { host: '192.168.0.161', port: 5301, onHex: '2a2030204952203030310d', offHex: '2a2030204952203030320d' }
};

const TARGETS = {
  // "lamp" = kedua unit lampu ruangan sekaligus. "lamp1"/"lamp2" = unit
  // individual (dipakai ruangan dengan >1 unit, mis. FISIPOL — 2 relay
  // WS501/WS502 per ruangan). Fakultas dengan 1 unit lampu (mis. Psikologi)
  // cukup pakai "lamp".
  lamp: {
    label: "WS501/WS502 Lamp",
    host: LAMP_GATEWAY_HOST,
    ports: {
      q10102: 5102,
      q10103: 5103,
      q10104: 5104,
      q10109: 5109,
      q10111: 5111,
      // FISIPOL — Umum Fakultas (kedua lampu sekaligus)
      i30201: 6001,
      i30202: 6002,
      i30203: 6003,
      i30204: 6004,
      i30205: 6005,
      // FIP — Umum Fakultas: SATU switch gabungan AC+Lampu per ruangan.
      // Semua 5 ruangan mengarah ke SATU port terpusat (5100) di flow
      // FIP-ACCESS-CONTROL.json (bukan port per-ruangan lagi -- port
      // terpisah per tab sempat gagal deploy berulang). Flow itu meneruskan
      // ke ruangan yang benar berdasarkan field "classKey" di payload TCP
      // (sudah otomatis disertakan oleh sendTcpCommand di bawah) lewat
      // link out/link in internal Node-RED ke O2.02.1X-COLLECTOR.json.
      o20210: { host: MINI_PC_NODE_RED_HOST, port: 5100 },
      o20211: { host: MINI_PC_NODE_RED_HOST, port: 5100 },
      o20212: { host: MINI_PC_NODE_RED_HOST, port: 5100 },
      o20213: { host: MINI_PC_NODE_RED_HOST, port: 5100 },
      o20214: { host: MINI_PC_NODE_RED_HOST, port: 5100 }
    }
  },
  lamp1: {
    label: "WS501/WS502 Lamp 1",
    host: LAMP_GATEWAY_HOST,
    ports: {
      i30201: 6101,
      i30202: 6102,
      i30203: 6103,
      i30204: 6104,
      i30205: 6105
    }
  },
  lamp2: {
    label: "WS501/WS502 Lamp 2",
    host: LAMP_GATEWAY_HOST,
    ports: {
      i30201: 6201,
      i30202: 6202,
      i30203: 6203,
      i30204: 6204,
      i30205: 6205
    }
  },
  projector: {
    label: "Projector",
    host: MINI_PC_NODE_RED_HOST,
    ports: {
      q10102: 5102,
      q10103: 5103,
      q10104: 5104,
      q10109: 5109,
      q10111: 5111,
      // FISIPOL — Umum Fakultas (proyektor via ATEN SN3001P, lihat backend/nodered/I3.02.0X-COLLECTOR.json)
      i30201: 5101,
      i30202: 5102,
      i30203: 5103,
      i30204: 5104,
      i30205: 5105
    }
  },
  // "ac" = kedua unit AC ruangan sekaligus. "ac1"/"ac2" = unit individual
  // (masing-masing RM4 Pro fisik terpisah — dipakai FISIPOL, 2 AC per ruangan).
  ac: {
    label: "AC",
    host: MINI_PC_NODE_RED_HOST,
    ports: {
      q10102: 5202,
      q10103: 5203,
      q10104: 5204,
      q10109: 5209,
      q10111: 5211,
      // FISIPOL — Umum Fakultas (kedua AC sekaligus, lihat backend/nodered/I3.02.0X-COLLECTOR.json)
      i30201: 5201,
      i30202: 5202,
      i30203: 5203,
      i30204: 5204,
      i30205: 5205,
      // FIP — Umum Fakultas: sama seperti TARGETS.lamp di atas, satu port
      // terpusat 5100 di FIP-ACCESS-CONTROL.json untuk kelima ruangan.
      o20210: 5100,
      o20211: 5100,
      o20212: 5100,
      o20213: 5100,
      o20214: 5100
    }
  },
  ac1: {
    label: "AC 1",
    host: MINI_PC_NODE_RED_HOST,
    ports: {
      i30201: 5301,
      i30202: 5302,
      i30203: 5303,
      i30204: 5304,
      i30205: 5305
    }
  },
  ac2: {
    label: "AC 2",
    host: MINI_PC_NODE_RED_HOST,
    ports: {
      i30201: 5401,
      i30202: 5402,
      i30203: 5403,
      i30204: 5404,
      i30205: 5405
    }
  }
};

// Port entries are either a bare number (use target.host) or an
// { host, port } override (FIKK rooms point at the FIKK gateway, not
// wherever target.host defaults to for other tenants).
function resolveTcpTarget(target, classKey) {
  const entry = target.ports[classKey];
  if (entry === undefined) return null;
  if (typeof entry === 'object') {
    return { host: entry.host || target.host, port: entry.port };
  }
  return { host: target.host, port: entry };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendTcpOnce(host, port, payload) {
  const tcpTimeout = Number(process.env.TCP_TIMEOUT_MS || 3000);
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let finished = false;

    function cleanup() {
      client.removeAllListeners("timeout");
      client.removeAllListeners("error");
      client.removeAllListeners("close");
    }

    function finishOk() {
      if (!finished) {
        finished = true;
        cleanup();
        resolve();
      }
    }

    function finishError(err) {
      if (!finished) {
        finished = true;
        cleanup();
        try { client.destroy(); } catch (_) {}
        reject(err);
      }
    }

    client.setTimeout(tcpTimeout);

    client.connect(port, host, () => {
      // JSON override (lampu/AC gateway) memakai delimiter newline (\n).
      // Buffer/string (mis. IR blaster SN3001P) dikirim apa adanya.
      const data = Buffer.isBuffer(payload) || typeof payload === 'string'
        ? payload
        : JSON.stringify(payload) + "\n";
      client.write(data, "utf8", (err) => {
        if (err) return finishError(err);
        client.end();
        finishOk();
      });
    });

    client.on("timeout", () => {
      finishError(new Error(`TCP timeout ke ${host}:${port}`));
    });

    client.on("error", (err) => {
      finishError(err);
    });
  });
}

async function sendTcpCommand(host, port, payload) {
  let lastError;
  const attempts = Math.max(1, Number(process.env.TCP_RETRY_ATTEMPTS || 1));
  const delay = Number(process.env.TCP_RETRY_DELAY_MS || 500);

  for (let i = 1; i <= attempts; i++) {
    try {
      await sendTcpOnce(host, port, payload);
      return { attempt: i };
    } catch (err) {
      lastError = err;
      if (i < attempts) await sleep(delay);
    }
  }

  throw lastError;
}

function normalizeClassKey(classCode) {
  return String(classCode || '').toLowerCase().replace(/\./g, '');
}

// Sub-channel target types (mis. "ac1", "lampu2") dipertahankan apa adanya —
// dipakai untuk ruangan yang punya lebih dari satu unit AC/lampu (mis. FISIPOL).
// Target dasar tanpa suffix ("ac", "lamp") berarti "kedua unit sekaligus".
const UNIT_TARGET_TYPES = new Set(['ac1', 'ac2', 'lamp1', 'lamp2']);

function normalizeTargetType(deviceType) {
  const raw = String(deviceType || '').toLowerCase().trim();
  if (UNIT_TARGET_TYPES.has(raw)) return raw;
  if (raw.includes('ac')) return 'ac';
  if (raw.includes('projector') || raw.includes('proyektor')) return 'projector';
  if (raw.includes('lamp') || raw.includes('light') || raw.includes('cahaya')) return 'lamp';
  return raw;
}

// Target dasar dari sub-channel: "ac1"/"ac2" -> "ac", "lamp1"/"lamp2" -> "lamp".
function baseTargetType(targetType) {
  return String(targetType || '').replace(/[12]$/, '');
}

// Indeks unit fisik perangkat (1 atau 2) dari akhiran device_eui, mis.
// "AC-I30201-001" -> 1, "AC-I30201-002" -> 2. Default 1 bila tidak ada akhiran
// bernomor (ruangan dengan satu unit saja, mis. Psikologi/fakultas lain).
function deviceUnitIndex(device) {
  const match = String(device.device_eui || '').match(/-0*(\d+)$/);
  if (!match) return 1;
  const n = parseInt(match[1], 10);
  return n === 2 ? 2 : 1;
}

// Menentukan target type efektif untuk SATU device spesifik (dipakai oleh
// kontrol per-device/`controlViaNodeRed`): bila ruangan ini punya TARGETS
// per-unit terdaftar (mis. TARGETS.ac1/TARGETS.ac2 untuk FISIPOL), arahkan ke
// unit yang sesuai; bila tidak, pakai target dasar (perilaku lama, 1 unit).
function resolveDeviceTargetType(device) {
  const base = normalizeTargetType(device.device_type || device.type);
  const unitType = `${base}${deviceUnitIndex(device)}`;
  return TARGETS[unitType] ? unitType : base;
}

function deviceMatchesTargetType(device, targetType) {
  const deviceBase = normalizeTargetType(device.device_type || device.type);
  if (UNIT_TARGET_TYPES.has(targetType)) {
    return deviceBase === baseTargetType(targetType) && deviceUnitIndex(device) === Number(targetType.slice(-1));
  }
  // Target dasar ("ac"/"lamp"/"projector") = cocok untuk SEMUA unit tipe itu.
  return deviceBase === targetType;
}

class DeviceController {
  // Maps classCode e.g. "Q1.01.02" → "http://10.12.1.150:1880/api/q10102"
  static getNodeRedClassEndpointUrl(classCode) {
    const baseUrl = (process.env.NODERED_BASE_URL || 'http://10.12.1.150:1880').replace(/\/$/, '');
    const endpoint = String(classCode).toLowerCase().replace(/\./g, '');
    return `${baseUrl}/api/${endpoint}`;
  }

  static async getAll(req, res) {
    try {
      const devices = await Device.getAll();

      // Attach latest consumption data for each device
      const devicesWithConsumption = await Promise.all(
        devices.map(async (device) => {
          const today = new Date().toISOString().split('T')[0];
          const consumptionData = await Consumption.getDaily(device.id, today);
          return {
            ...device,
            consumption: consumptionData
          };
        })
      );

      res.json({
        success: true,
        data: devicesWithConsumption
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getByClass(req, res) {
    try {
      const { classId } = req.params;
      const devices = await Device.getByClass(classId);

      // Attach latest consumption data for each device
      const devicesWithConsumption = await Promise.all(
        devices.map(async (device) => {
          const today = new Date().toISOString().split('T')[0];
          const consumptionData = await Consumption.getDaily(device.id, today);
          return {
            ...device,
            consumption: consumptionData
          };
        })
      );

      res.json({
        success: true,
        data: devicesWithConsumption
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getByClassCode(req, res) {
    try {
      const { classCode } = req.params;
      const devices = await Device.getByClassCode(classCode);

      const devicesWithConsumption = await Promise.all(
        devices.map(async (device) => {
          const today = new Date().toISOString().split('T')[0];
          const consumptionData = await Consumption.getDaily(device.id, today);
          return {
            ...device,
            consumption: consumptionData
          };
        })
      );

      res.json({
        success: true,
        data: devicesWithConsumption
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const device = await Device.getById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Get consumption data
      const today = new Date().toISOString().split('T')[0];
      const consumptionData = await Consumption.getDaily(device.id, today);

      res.json({
        success: true,
        data: {
          ...device,
          consumption: consumptionData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async create(req, res) {
    try {
      const {
        class_id,
        name,
        device_name,        // New IoT field
        type,
        device_type,        // New IoT field
        brand,
        model,
        power_rating,
        efficiency_rating,
        installation_date,
        warranty_expiry,
        notes,
        device_eui,         // New IoT field
        application_type,   // New IoT field
        location            // New IoT field
      } = req.body;

      // Validate required fields (support both old and new names)
      const finalName = device_name || name;
      const finalType = device_type || type;

      if (!class_id || !finalName || !finalType || !power_rating) {
        return res.status(400).json({
          success: false,
          message: 'class_id, name (or device_name), type (or device_type), and power_rating are required'
        });
      }

      const result = await Device.create({
        class_id,
        name: finalName,
        device_name: finalName,
        type: finalType,
        device_type: finalType,
        brand,
        model,
        power_rating,
        efficiency_rating,
        installation_date,
        warranty_expiry,
        notes,
        device_eui,
        application_type,
        location
      });

      res.status(201).json({
        success: true,
        message: 'Device created successfully',
        data: {
          id: result.insertId,
          class_id,
          device_name: finalName,
          device_type: finalType,
          device_eui: device_eui || null,
          application_type: application_type || null,
          location: location || null,
          brand,
          model,
          power_rating,
          efficiency_rating
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.update(id, data);

      res.json({
        success: true,
        message: 'Device updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'idle', 'offline', 'maintenance'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, idle, offline, or maintenance'
        });
      }

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.updateStatus(id, status);

      res.json({
        success: true,
        message: 'Device status updated successfully',
        data: { id, status }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async controlViaNodeRed(req, res) {
    try {
      const { id } = req.params;
      const { action, state } = req.body;
      const finalAction = action || state;

      if (!finalAction || !['on', 'off'].includes(String(finalAction).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be on or off'
        });
      }

      const device = await Device.getById(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      const normalizedAction = String(finalAction).toLowerCase();
      const classCode = device.location || device.class_name || null;
      const classKey = classCode ? String(classCode).toLowerCase().replace(/\./g, '') : '';

      // Device individual (mis. AC 1 vs AC 2 di ruangan dengan 2 unit) diarahkan
      // ke target per-unit-nya sendiri bila ruangan itu punya TARGETS terdaftar;
      // ruangan dengan 1 unit saja (mis. Psikologi) tetap pakai target dasar.
      const targetType = resolveDeviceTargetType(device);

      // Check if classroom is mapped in TARGETS for direct TCP control
      const target = TARGETS[targetType];
      const resolvedTarget = target && classKey ? resolveTcpTarget(target, classKey) : null;
      if (resolvedTarget) {
        const { host, port: tcpPort } = resolvedTarget;
        const tcpPayload = {
          state: normalizedAction,
          device: targetType,
          classKey: classKey,
          source: "web_api"
        };

        try {
          const tcpResult = await sendTcpCommand(host, tcpPort, tcpPayload);
          const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
          await Device.updateStatus(id, nextStatus);

          return res.json({
            success: true,
            message: `${target.label} ${device.location || classCode} command ${normalizedAction.toUpperCase()} sent successfully via TCP`,
            data: {
              id: Number(id),
              action: normalizedAction,
              status: nextStatus,
              tcp: {
                device: targetType,
                className: device.location || classCode,
                host,
                port: tcpPort,
                tcpAttempt: tcpResult.attempt
              }
            }
          });
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: `Gagal mengirim command TCP ke ${device.location || classCode} untuk ${target.label}`,
            error: err.message
          });
        }
      }

      // Fallback to original HTTP Node-RED endpoint
      const nodeRedUrl = classCode
        ? DeviceController.getNodeRedClassEndpointUrl(classCode)
        : null;

      if (!nodeRedUrl) {
        return res.status(400).json({
          success: false,
          message: 'Device has no class code — cannot determine Node-RED endpoint',
        });
      }

      // FIKK: device_name diakhiri "-A"/"-B"/"-C" menandakan unit fisik
      // spesifik (dua WS502/WS523 per ruangan, atau tiga di U5.03.05).
      // Kalau ada, sertakan supaya Node-RED bisa kontrol unit itu saja,
      // bukan menyalakan/mematikan semua unit di ruangan itu.
      const unitMatch = String(device.device_name || '').match(/-([ABC])$/);
      const unit = unitMatch ? `${targetType === 'ac' ? 'WS523' : 'WS502'}_${unitMatch[1]}` : undefined;
      const payload = { state: normalizedAction, ...(unit ? { unit } : {}) };

      const controller = new AbortController();
      // Lebih lama dari timeout guard 8s di Node-RED, supaya balasan 504-nya
      // yang bersih sempat diterima dulu, bukan malah dipotong abort duluan.
      const timeout = setTimeout(() => controller.abort(), 12000);

      let nodeRedResponse;
      try {
        nodeRedResponse = await fetch(nodeRedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      let nodeRedData = null;
      try {
        nodeRedData = await nodeRedResponse.json();
      } catch {
        nodeRedData = null;
      }

      if (!nodeRedResponse.ok) {
        return res.status(502).json({
          success: false,
          message: 'Node-RED control request failed',
          upstreamStatus: nodeRedResponse.status,
          upstreamData: nodeRedData,
        });
      }

      const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
      await Device.updateStatus(id, nextStatus);

      return res.json({
        success: true,
        message: `Device ${normalizedAction.toUpperCase()} command sent successfully`,
        data: {
          id: Number(id),
          action: normalizedAction,
          status: nextStatus,
          nodeRed: nodeRedData,
        }
      });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'Node-RED control request timed out'
        : error.message;

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }

  static async controlClassViaNodeRed(req, res) {
    try {
      const { classCode } = req.params;
      const { action, state } = req.body;
      const finalAction = action || state;

      if (!classCode) {
        return res.status(400).json({
          success: false,
          message: 'classCode is required'
        });
      }

      if (!finalAction || !['on', 'off'].includes(String(finalAction).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be on or off'
        });
      }

      const devices = await Device.getByClassCode(classCode);
      if (!devices || devices.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No devices found for class ${classCode}`
        });
      }

      const normalizedAction = String(finalAction).toLowerCase();
      const classKey = String(classCode).toLowerCase().replace(/\./g, '');

      // Check if classroom is mapped in TARGETS for direct TCP control of all devices (lamp, projector, ac).
      // Sub-channel targets (ac1/ac2/lamp1/lamp2) dilewati di sini — "ac"/"lamp"
      // dasar sudah berarti "kedua unit sekaligus", jadi ikut fan-out per-unit
      // hanya akan mengirim command duplikat/tumpang tindih ke hardware yang sama.
      const tcpPromises = [];
      for (const [targetKey, target] of Object.entries(TARGETS)) {
        if (UNIT_TARGET_TYPES.has(targetKey)) continue;
        const resolved = resolveTcpTarget(target, classKey);
        if (resolved) {
          const tcpPayload = {
            state: normalizedAction,
            device: targetKey,
            classKey: classKey,
            source: "web_api"
          };
          tcpPromises.push(
            sendTcpCommand(resolved.host, resolved.port, tcpPayload)
              .then(res => ({ success: true, device: targetKey, attempt: res.attempt }))
              .catch(err => ({ success: false, device: targetKey, error: err.message }))
          );
        }
      }

      if (tcpPromises.length > 0) {
        try {
          const results = await Promise.all(tcpPromises);
          const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
          await Promise.all(devices.map((device) => {
            if (device.device_type !== 'SENSOR') {
              return Device.updateStatus(device.id, nextStatus);
            }
            return Promise.resolve();
          }));

          const failures = results.filter(r => !r.success);
          if (failures.length === tcpPromises.length) {
            return res.status(500).json({
              success: false,
              message: `Gagal mengirim command TCP ke semua perangkat di kelas ${classCode}`,
              errors: failures
            });
          }

          return res.json({
            success: true,
            message: `Class ${classCode} ${normalizedAction.toUpperCase()} command sent to devices via TCP`,
            data: {
              classCode,
              action: normalizedAction,
              status: nextStatus,
              affectedDevices: devices.length,
              results
            }
          });
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: `Gagal mengontrol perangkat kelas ${classCode}`,
            error: err.message
          });
        }
      }

      // Fallback to original HTTP Node-RED endpoint
      const nodeRedUrl = DeviceController.getNodeRedClassEndpointUrl(classCode);

      const payload = { state: normalizedAction };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      let nodeRedResponse;
      try {
        nodeRedResponse = await fetch(nodeRedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      let nodeRedData = null;
      try {
        nodeRedData = await nodeRedResponse.json();
      } catch {
        nodeRedData = null;
      }

      if (!nodeRedResponse.ok) {
        return res.status(502).json({
          success: false,
          message: 'Node-RED class control request failed',
          upstreamStatus: nodeRedResponse.status,
          upstreamData: nodeRedData,
        });
      }

      const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
      await Promise.all(devices.map((device) => {
        if (device.device_type !== 'SENSOR') {
          return Device.updateStatus(device.id, nextStatus);
        }
        return Promise.resolve();
      }));

      return res.json({
        success: true,
        message: `Class ${classCode} ${normalizedAction.toUpperCase()} command sent successfully`,
        data: {
          classCode,
          action: normalizedAction,
          status: nextStatus,
          affectedDevices: devices.length,
          nodeRed: nodeRedData,
        }
      });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'Node-RED class control request timed out'
        : error.message;

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }

  static async controlClassDeviceTypeViaNodeRed(req, res) {
    try {
      const { classCode, deviceType } = req.params;
      const { action, state } = req.body;
      const finalAction = action || state;

      if (!classCode) {
        return res.status(400).json({
          success: false,
          message: 'classCode is required'
        });
      }

      if (!finalAction || !['on', 'off'].includes(String(finalAction).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be on or off'
        });
      }

      const targetType = normalizeTargetType(deviceType);
      const classKey = normalizeClassKey(classCode);
      const normalizedAction = String(finalAction).toLowerCase();

      // FIKK projector: IR blaster SN3001P, protokol raw text, bukan TARGETS/JSON biasa
      if (targetType === 'projector' && FIKK_PROJECTOR_IR[classKey]) {
        const irTarget = FIKK_PROJECTOR_IR[classKey];
        const irHex = normalizedAction === 'on' ? irTarget.onHex : irTarget.offHex;
        const irPayload = Buffer.from(irHex, 'hex');

        const tcpResult = await sendTcpCommand(irTarget.host, irTarget.port, irPayload);
        const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
        const devices = await Device.getByClassCode(classCode);
        const matchedDevices = devices.filter(device => deviceMatchesTargetType(device, targetType));
        await Promise.all(matchedDevices.map(device => Device.updateStatus(device.id, nextStatus)));

        return res.json({
          success: true,
          message: `Projector ${classCode} command ${normalizedAction.toUpperCase()} sent successfully via IR`,
          data: {
            classCode, classKey, deviceType: targetType, action: normalizedAction, status: nextStatus,
            affectedDevices: matchedDevices.length,
            tcp: { host: irTarget.host, port: irTarget.port, tcpAttempt: tcpResult.attempt }
          }
        });
      }

      const target = TARGETS[targetType];
      if (!target) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deviceType. Must be lamp, ac, projector, ac1, ac2, lamp1, or lamp2'
        });
      }

      const resolvedTarget = resolveTcpTarget(target, classKey);
      if (!resolvedTarget) {
        // Fallback ke Node-RED (mis. FIKK: Web API -> Node-RED Mini PC -> TCP -> UG65)
        const nodeRedUrl = DeviceController.getNodeRedClassEndpointUrl(classCode);
        const payload = { state: normalizedAction };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let nodeRedResponse;
        try {
          nodeRedResponse = await fetch(nodeRedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        } catch (err) {
          return res.status(502).json({
            success: false,
            message: `Gagal menghubungi Node-RED untuk ${target.label} ${classCode}`,
            error: err.message
          });
        } finally {
          clearTimeout(timeout);
        }

        let nodeRedData = null;
        try { nodeRedData = await nodeRedResponse.json(); } catch { nodeRedData = null; }

        if (!nodeRedResponse.ok) {
          return res.status(502).json({
            success: false,
            message: `Node-RED ${target.label} control request failed`,
            upstreamStatus: nodeRedResponse.status,
            upstreamData: nodeRedData,
          });
        }

        const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
        const devices = await Device.getByClassCode(classCode);
        const matchedDevices = devices.filter(device => deviceMatchesTargetType(device, targetType));
        await Promise.all(matchedDevices.map(device => Device.updateStatus(device.id, nextStatus)));

        return res.json({
          success: true,
          message: `${target.label} ${classCode} command ${normalizedAction.toUpperCase()} sent via Node-RED`,
          data: {
            classCode, classKey, deviceType: targetType, action: normalizedAction, status: nextStatus,
            affectedDevices: matchedDevices.length,
            nodeRed: nodeRedData,
          }
        });
      }
      const { host, port: tcpPort } = resolvedTarget;

      const tcpPayload = {
        state: normalizedAction,
        device: targetType,
        classKey,
        source: "web_api"
      };

      const tcpResult = await sendTcpCommand(host, tcpPort, tcpPayload);
      const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
      const devices = await Device.getByClassCode(classCode);
      const matchedDevices = devices.filter(device => deviceMatchesTargetType(device, targetType));

      await Promise.all(matchedDevices.map(device => Device.updateStatus(device.id, nextStatus)));

      return res.json({
        success: true,
        message: `${target.label} ${classCode} command ${normalizedAction.toUpperCase()} sent successfully via TCP`,
        data: {
          classCode,
          classKey,
          deviceType: targetType,
          action: normalizedAction,
          status: nextStatus,
          affectedDevices: matchedDevices.length,
          tcp: {
            host,
            port: tcpPort,
            tcpAttempt: tcpResult.attempt
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async updateReading(req, res) {
    try {
      const { id } = req.params;
      const { power, temperature } = req.body;

      if (power === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Power reading is required'
        });
      }

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.updateReading(id, power, temperature);

      res.json({
        success: true,
        message: 'Device reading updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.delete(id);

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getByType(req, res) {
    try {
      const { type } = req.params;
      const devices = await Device.getByType(type);

      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = DeviceController;
