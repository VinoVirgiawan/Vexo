const fs = require("fs");
const path = require("path");

const DB_FILE = path.join("/tmp", "vexo_db.json");

const DEFAULT_DB = {
  users: {
    pinok: { password: "pinok", role: "admin", saldo: 0 }
  },
  keys: {},
  prices: {
    1: 6500,
    3: 15000,
    7: 35000,
    20: 80000
  }
};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {}
}

function genRandomKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "ML_random";
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function formatDate(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function formatDateTime(d) {
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getFullYear() + "-" +
    p(d.getMonth() + 1) + "-" +
    p(d.getDate()) + " " +
    p(d.getHours()) + ":" +
    p(d.getMinutes()) + ":" +
    p(d.getSeconds());
}

module.exports = { loadDB, saveDB, genRandomKey, formatDate, formatDateTime, DEFAULT_DB };
