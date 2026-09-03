const { loadDB, saveDB } = require("./db");

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    const db = loadDB();

    // === VALIDASI 1: BODY KOSONG ===
    if (!body || body.trim() === "") {
      return res.status(200).json({
        status: false,
        message: "Invalid parameter",
        error: "EMPTY_BODY"
      });
    }

    // Parse body
    let params = {};
    if (body.includes("=")) {
      body.split("&").forEach(p => {
        const parts = p.split("=");
        if (parts[0]) {
          try { params[parts[0]] = decodeURIComponent(parts[1] || ""); }
          catch (e) { params[parts[0]] = parts[1] || ""; }
        }
      });
    } else if (body.includes(":")) {
      const parts = body.split(":");
      if (parts.length >= 2) params.user_key = parts[1];
    }

    const userKey = params.user_key || params.key || "";
    const serial = params.serial || params.device || "";

    // === VALIDASI 2: KEY KOSONG ===
    if (!userKey || userKey.trim() === "") {
      return res.status(200).json({
        status: false,
        message: "Invalid parameter",
        error: "MISSING_USER_KEY"
      });
    }

    // === VALIDASI 3: KEY TIDAK TERDAFTAR ===
    if (!db.keys[userKey]) {
      return res.status(200).json({
        status: false,
        message: "MEMBER NOT REGISTERED",
        error: "KEY_NOT_FOUND"
      });
    }

    const keyData = db.keys[userKey];

    // === VALIDASI 4: KEY NONAKTIF ===
    if (!keyData.active) {
      return res.status(200).json({
        status: false,
        message: "License disabled",
        error: "LICENSE_DISABLED"
      });
    }

    // === VALIDASI 5: LICENSE EXPIRED ===
    const now = new Date();
    let expDate;
    try {
      const parts = (keyData.expired || "").split("-");
      expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59);
      if (isNaN(expDate.getTime())) expDate = new Date("2099-12-31T23:59:59");
    } catch (e) {
      expDate = new Date("2099-12-31T23:59:59");
    }

    if (now > expDate) {
      return res.status(200).json({
        status: false,
        message: "License expired",
        error: "LICENSE_EXPIRED",
        expired: keyData.expired
      });
    }

    // === VALIDASI 6: DEVICE LIMIT ===
    const maxDevice = keyData.max_device || 999;
    if (!keyData.devices) keyData.devices = [];

    if (serial) {
      const deviceExists = keyData.devices.includes(serial);

      if (!deviceExists) {
        // Device baru - cek limit
        if (keyData.devices.length >= maxDevice) {
          return res.status(200).json({
            status: false,
            message: "Device limit exceeded",
            error: "MAX_DEVICE_REACHED",
            connected: keyData.devices.length,
            max_device: maxDevice
          });
        }
        // Tambah device baru
        keyData.devices.push(serial);
        saveDB(db);
      }
    }

    // === LICENSE VALID - RETURN RESPONSE ===
    const hex = "0123456789abcdef";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += hex[Math.floor(Math.random() * 16)];
    }
    const rng = Math.floor(Math.random() * 2000000000) + 1000000000;

    function pad(n) { return String(n).padStart(2, "0"); }
    function fmtNow(d) {
      const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return pad(d.getDate()) + "-" + m[d.getMonth()] + "-" + d.getFullYear() + " " +
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }
    function fmtExp(d) {
      return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " +
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    // Sisa hari
    const sisaHari = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      status: true,
      message: "License valid",
      data: {
        Datte: fmtNow(now),
        token: token,
        rng: rng,
        key: userKey,
        tittle: keyData.title || "Credits:@kepental",
        versi: "1.1",
        instance: "Instance",
        expired: fmtExp(expDate),
        sisa_hari: sisaHari,
        connected_device: keyData.devices.length,
        max_device: maxDevice
      },
      features: {
        esp_line: true,
        esp_box: true,
        esp_name: true,
        esp_health: true,
        esp_distance: true,
        ATTIC_V35: true,
        ATTIC_V36: true,
        ATTIC_V37: true
      }
    });
  });
};
