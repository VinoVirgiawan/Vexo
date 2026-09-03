const { loadDB } = require("./db");

module.exports = (req, res) => {
  // ALWAYS return JSON - never HTML, never plain text
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Parse any input format the binary might send
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    // Try to extract user_key from any format
    let userKey = "";

    // Format 1: URL-encoded (user_key=xxx&other=yyy)
    if (body.includes("=")) {
      body.split("&").forEach(p => {
        const [k, v] = p.split("=");
        if (k === "user_key" || k === "key") userKey = decodeURIComponent(v || "");
      });
    }
    // Format 2: Colon-separated (u:xxx:r:yyy)
    if (!userKey && body.includes(":")) {
      const parts = body.split(":");
      if (parts.length >= 2) userKey = parts[1];
    }
    // Format 3: Query params
    if (!userKey) {
      try {
        const url = new URL(req.url, "http://localhost");
        userKey = url.searchParams.get("user_key") || url.searchParams.get("key") || "";
      } catch (e) {}
    }

    // If no key provided, still return valid JSON (don't return plain text)
    const db = loadDB();

    // Check if key exists and is valid
    let keyData = null;
    let keyValid = false;

    if (userKey && db.keys[userKey]) {
      keyData = db.keys[userKey];
      const now = new Date();
      const expDate = new Date(keyData.expired + "T23:59:59");
      keyValid = keyData.active && now <= expDate;
    }

    // Generate auth response
    const hex = "0123456789abcdef";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += hex[Math.floor(Math.random() * 16)];
    }
    const rng = Math.floor(Math.random() * 2000000000) + 1000000000;
    const now = new Date();
    const exp = new Date("2099-12-31T23:59:59");

    function pad(n) { return String(n).padStart(2, "0"); }
    function fmtDate(d) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return pad(d.getDate()) + "-" + months[d.getMonth()] + "-" + d.getFullYear() + " " +
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }
    function fmtExp(d) {
      return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " +
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    // Return proper JSON response
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

    return res.status(200).json(response);
  });
};
