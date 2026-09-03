const { loadDB, saveDB, genRandomKey, fmtDate, fmtDateTime } = require("./db");

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    let action = "";
    try {
      const urlObj = new URL(req.url, "http://localhost");
      action = urlObj.searchParams.get("action") || "";
    } catch (e) {
      const match = req.url.match(/action=([^&]+)/);
      if (match) action = match[1];
    }

    let params = {};
    if (body) {
      try { params = JSON.parse(body); }
      catch (e) {
        body.split("&").forEach(p => {
          const parts = p.split("=");
          if (parts[0]) {
            try { params[parts[0]] = decodeURIComponent(parts[1] || ""); }
            catch (e2) { params[parts[0]] = parts[1] || ""; }
          }
        });
      }
    }

    const db = loadDB();

    // LOGIN
    if (action === "login") {
      const user = db.users[params.username];
      if (user && user.password === params.password) {
        return res.status(200).json({
          status: true, message: "Login success",
          username: params.username, role: user.role, saldo: user.saldo || 0
        });
      }
      return res.status(200).json({ status: false, message: "Wrong credentials" });
    }

    // GET PROFILE
    if (action === "get_profile") {
      const user = db.users[params.username];
      if (!user) return res.status(200).json({ status: false });
      return res.status(200).json({
        status: true, username: params.username, role: user.role, saldo: user.saldo || 0
      });
    }

    // GET PRICES
    if (action === "get_prices") {
      return res.status(200).json({ status: true, prices: db.prices });
    }

    // TOPUP
    if (action === "topup") {
      const user = db.users[params.username];
      if (!user) return res.status(200).json({ status: false, message: "User not found" });
      const amount = parseInt(params.amount) || 0;
      if (amount <= 0) return res.status(200).json({ status: false, message: "Invalid amount" });
      user.saldo = (user.saldo || 0) + amount;
      saveDB(db);
      return res.status(200).json({ status: true, saldo_baru: user.saldo, message: "Topup berhasil!" });
    }

    // LIST KEYS
    if (action === "list_keys") {
      const now = new Date();
      const keys = Object.entries(db.keys).map(([key, val]) => {
        const expDate = new Date(val.expired + "T23:59:59");
        const active = val.active && now <= expDate;
        return {
          key, title: val.title, device: val.device || "default",
          days: val.days, price: val.price || 0,
          created: val.created, expired: val.expired,
          max_device: val.max_device || 1,
          connected_device: (val.devices || []).length,
          devices: val.devices || [],
          active, owner: val.owner
        };
      });
      return res.status(200).json({ status: true, data: keys });
    }

    // GENERATE KEY
    if (action === "generate_key") {
      const user = db.users[params.username];
      if (!user) return res.status(200).json({ status: false, message: "User not found" });

      const title = params.title || "Credits:@kepental";
      const days = parseInt(params.days) || 1;
      const customKey = (params.custom_key || "").trim();
      const maxDevice = parseInt(params.max_device) || 1;

      const price = db.prices[days] || (days * 6500);
      if ((user.saldo || 0) < price) {
        return res.status(200).json({
          status: false,
          message: "Saldo tidak cukup! Harga: Rp " + price.toLocaleString("id-ID") + ", Saldo: Rp " + (user.saldo || 0).toLocaleString("id-ID")
        });
      }

      let newKey;
      if (customKey) {
        if (db.keys[customKey]) {
          return res.status(200).json({ status: false, message: "Key sudah ada!" });
        }
        newKey = customKey;
      } else {
        // Format: ML-{days}DAY-RANDOM4
        newKey = genRandomKey(days);
        while (db.keys[newKey]) newKey = genRandomKey(days);
      }

      const now = new Date();
      const exp = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      db.keys[newKey] = {
        title, active: true, device: "default",
        custom_key: customKey,
        created: fmtDateTime(now), expired: fmtDate(exp),
        days, price, owner: params.username,
        max_device: maxDevice, devices: []
      };

      user.saldo = (user.saldo || 0) - price;
      saveDB(db);

      return res.status(200).json({
        status: true, key: newKey, data: db.keys[newKey], saldo_baru: user.saldo,
        struk: { key: newKey, title, paket: days + " Hari", harga: price,
          tanggal: fmtDateTime(now), expired: fmtDate(exp), max_device: maxDevice },
        message: "Key generated!"
      });
    }

    // UPDATE KEY
    if (action === "update_key") {
      const key = params.key || "";
      if (!db.keys[key]) {
        return res.status(200).json({ status: false, message: "Key not found" });
      }
      if (params.max_device !== undefined) db.keys[key].max_device = parseInt(params.max_device) || 1;
      if (params.title !== undefined) db.keys[key].title = params.title;
      if (params.reset_devices === "true") db.keys[key].devices = [];
      saveDB(db);
      return res.status(200).json({ status: true, key, data: db.keys[key], message: "Key updated!" });
    }

    // DELETE KEY
    if (action === "delete_key") {
      const key = params.key || "";
      if (!db.keys[key]) {
        return res.status(200).json({ status: false, message: "Key not found" });
      }
      const keyData = db.keys[key];
      const refund = Math.floor((keyData.price || 0) * 0.5);
      if (keyData.owner && db.users[keyData.owner]) {
        db.users[keyData.owner].saldo = (db.users[keyData.owner].saldo || 0) + refund;
      }
      delete db.keys[key];
      saveDB(db);
      return res.status(200).json({ status: true, message: "Key deleted! Refund: Rp " + refund.toLocaleString("id-ID") });
    }

    // TOGGLE KEY
    if (action === "toggle_key") {
      const key = params.key || "";
      if (!db.keys[key]) {
        return res.status(200).json({ status: false, message: "Key not found" });
      }
      db.keys[key].active = !db.keys[key].active;
      saveDB(db);
      return res.status(200).json({
        status: true, key, active: db.keys[key].active,
        message: db.keys[key].active ? "Key activated" : "Key deactivated"
      });
    }

    // STATS
    if (action === "stats") {
      const keys = Object.values(db.keys);
      const now = new Date();
      const total = keys.length;
      const active = keys.filter(k => {
        const exp = new Date(k.expired + "T23:59:59");
        return k.active && now <= exp;
      }).length;
      return res.status(200).json({ status: true, total, active, inactive: total - active });
    }

    return res.status(200).json({ status: false, message: "Unknown action" });
  });
};
