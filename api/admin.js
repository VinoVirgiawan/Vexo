const { loadDB, saveDB, genRandomKey, formatDate, formatDateTime } = require("./db");

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    const url = new URL(req.url, "http://localhost");
    const action = url.searchParams.get("action") || "";

    let params = {};
    try {
      params = JSON.parse(body);
    } catch (e) {
      body.split("&").forEach(p => {
        const [k, v] = p.split("=");
        if (k) params[k] = decodeURIComponent(v || "");
      });
    }

    const db = loadDB();

    // === LOGIN ===
    if (action === "login") {
      const user = db.users[params.username];
      if (user && user.password === params.password) {
        return res.status(200).json({
          status: true,
          message: "Login success",
          username: params.username,
          role: user.role
        });
      }
      return res.status(200).json({ status: false, message: "Wrong credentials" });
    }

    // === GET PRICES ===
    if (action === "get_prices") {
      return res.status(200).json({ status: true, prices: db.prices });
    }

    // === LIST KEYS ===
    if (action === "list_keys") {
      const now = new Date();
      const keys = Object.entries(db.keys).map(([key, val]) => {
        const expDate = new Date(val.expired + "T23:59:59");
        const active = val.active && now <= expDate;
        return {
          key,
          title: val.title,
          custom_key: val.custom_key || "",
          device: val.device,
          days: val.days,
          price: val.price,
          created: val.created,
          expired: val.expired,
          active,
          owner: val.owner
        };
      });
      return res.status(200).json({ status: true, data: keys });
    }

    // === GENERATE KEY ===
    if (action === "generate_key") {
      const title = params.title || "Credits:@kepental";
      const days = parseInt(params.days) || 1;
      const price = db.prices[days] || (days * 6500);
      const customKey = params.custom_key || "";

      let newKey;
      if (customKey) {
        newKey = customKey;
      } else {
        newKey = genRandomKey();
      }

      const now = new Date();
      const exp = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      db.keys[newKey] = {
        title,
        active: true,
        device: "default",
        custom_key: customKey,
        created: formatDateTime(now),
        expired: formatDate(exp),
        days,
        price,
        owner: "pinok"
      };

      saveDB(db);

      return res.status(200).json({
        status: true,
        key: newKey,
        data: db.keys[newKey],
        message: "Key generated!"
      });
    }

    // === DELETE KEY ===
    if (action === "delete_key") {
      const key = params.key || "";
      if (db.keys[key]) {
        delete db.keys[key];
        saveDB(db);
        return res.status(200).json({ status: true, message: "Key deleted!" });
      }
      return res.status(200).json({ status: false, message: "Key not found" });
    }

    // === TOGGLE KEY ===
    if (action === "toggle_key") {
      const key = params.key || "";
      if (db.keys[key]) {
        db.keys[key].active = !db.keys[key].active;
        saveDB(db);
        return res.status(200).json({
          status: true,
          key: key,
          active: db.keys[key].active,
          message: db.keys[key].active ? "Key activated" : "Key deactivated"
        });
      }
      return res.status(200).json({ status: false, message: "Key not found" });
    }

    // === STATS ===
    if (action === "stats") {
      const keys = Object.values(db.keys);
      const now = new Date();
      const total = keys.length;
      const active = keys.filter(k => {
        const exp = new Date(k.expired + "T23:59:59");
        return k.active && now <= exp;
      }).length;
      const inactive = total - active;

      return res.status(200).json({
        status: true,
        total,
        active,
        inactive
      });
    }

    return res.status(200).json({ status: false, message: "Unknown action: " + action });
  });
};
