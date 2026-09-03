const fs = require("fs");
const path = require("path");

const DB_FILE = path.join("/tmp", "vexo_db.json");

const DEFAULT_DB = {
  users: {
    pinok: {
      password: "pinok",
      role: "admin",
      saldo: 999999
    }
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
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (!data.users) data.users = DEFAULT_DB.users;
      if (!data.keys) data.keys = {};
      if (!data.prices) data.prices = DEFAULT_DB.prices;
      return data;
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

function fmtDate(d) {
  function p(n) { return String(n).padStart(2, "0"); }
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return p(d.getDate()) + "-" + m[d.getMonth()] + "-" + d.getFullYear();
}

function fmtDateTime(d) {
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) + " " +
    p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function fmtExp(d) {
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) + " " +
    p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

module.exports = { loadDB, saveDB, genRandomKey, fmtDate, fmtDateTime, fmtExp, DEFAULT_DB };
