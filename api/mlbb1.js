const { loadDB, saveDB } = require("./db");

module.exports = (req, res) => {
  // Always return JSON, never HTML
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Generate random token
  const hex = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += hex[Math.floor(Math.random() * 16)];
  }
  const rng = Math.floor(Math.random() * 2000000000) + 1000000000;

  // Format dates
  const now = new Date();
  const exp = new Date("2099-12-31T23:59:59");

  function pad(n) { return String(n).padStart(2, "0"); }
  function fmtDate(d) {
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return pad(d.getDate()) + "-" + m[d.getMonth()] + "-" + d.getFullYear() + " " +
           pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function fmtExp(d) {
    return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " +
           pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  // Default response (selalu kirim ini dulu)
  const response = {
    status: true,
    data: {
      Datte: fmtDate(now),
      token: token,
      rng: rng,
      key: "Credits:@kepental",
      tittle: "Credits:@kepental",
      versi: "1.1",
      instance: "Instance",
      expired: fmtExp(exp)
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
  };

  // Validasi DB di dalam try/catch - kalau error, tetap kirim response
  try {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        // Coba load DB
        const db = loadDB();

        // Parse body
        let params = {};
        if (body && body.includes("=")) {
          body.split("&").forEach(p => {
            const parts = p.split("=");
            if (parts[0]) {
              try { params[parts[0]] = decodeURIComponent(parts[1] || ""); }
              catch (e) { params[parts[0]] = parts[1] || ""; }
            }
          });
        }

        const userKey = params.user_key || params.key || "";
        const serial = params.serial || params.device || "";

        // Cek key di DB
        if (userKey && db.keys && db.keys[userKey]) {
          const keyData = db.keys[userKey];

          // Cek expired
          if (keyData.expired) {
            const parts = (keyData.expired || "").split("-");
            const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59);
            if (!isNaN(expDate.getTime()) && now > expDate) {
              return res.status(200).json({ status: false, message: "License expired" });
            }
            // Update expired di response
            response.data.expired = fmtExp(expDate);
          }

          // Cek device
          if (serial && keyData.devices && keyData.max_device) {
            if (!keyData.devices.includes(serial)) {
              if (keyData.devices.length >= keyData.max_device) {
                return res.status(200).json({ status: false, message: "Device limit exceeded" });
              }
              keyData.devices.push(serial);
              saveDB(db);
            }
          }
        } else if (userKey) {
          // Key tidak ditemukan
          return res.status(200).json({ status: false, message: "MEMBER NOT REGISTERED" });
        }
      } catch (e) {
        // DB error - tetap kirim response original
        console.log("[MLBB1] DB Error:", e.message);
      }

      // Kirim response
      return res.status(200).json(response);
    });
  } catch (e) {
    // Fatal error - tetap kirim response original
    console.log("[MLBB1] Fatal Error:", e.message);
    return res.status(200).json(response);
  }
};
