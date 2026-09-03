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

  // Return pure JSON response
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
};
