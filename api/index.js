require("dotenv").config();
const mongoose = require("mongoose");
const app = require("../backend/app");

const MONGODB_URI = process.env.MONGODB_URI || "";

let connPromise = null;

function getConnection() {
  if (!connPromise) {
    connPromise = mongoose.connect(MONGODB_URI);
  }
  return connPromise;
}

module.exports = async (req, res) => {
  if (!MONGODB_URI) {
    res.status(500).json({ error: "MONGODB_URI is not set" });
    return;
  }
  try {
    await getConnection();
  } catch (err) {
    console.error("MongoDB connection error:", err);
    res.status(500).json({ error: "Database connection failed" });
    return;
  }
  // Restore path from rewrite: /api?path=customers/123&foo=bar -> /api/customers/123?foo=bar
  const path = (req.query && req.query.path) || "";
  const qs =
    (req.url && req.url.includes("?") ? req.url.split("?")[1] : "") || "";
  const params = new URLSearchParams(qs);
  params.delete("path");
  const queryString = params.toString();
  req.url = path
    ? "/api/" + path + (queryString ? "?" + queryString : "")
    : req.url;
  app(req, res);
};
