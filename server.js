require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sireesha_apartment",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, database: "connected" });
}));

app.get("/api/flats", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, flat_number, block_name FROM flats ORDER BY block_name, flat_number"
  );
  res.json(rows);
}));

app.get("/api/stats", asyncRoute(async (_req, res) => {
  const [[r]] = await pool.query(`
    SELECT COUNT(*) total,
      COALESCE(SUM(status='checked_in'),0) inside_now,
      COALESCE(SUM(DATE(check_in)=CURDATE()),0) visits_today,
      COALESCE(SUM(status='checked_out' AND DATE(check_out)=CURDATE()),0) checked_out_today
    FROM visitors
  `);
  res.json({
    total: Number(r.total || 0),
    insideNow: Number(r.inside_now || 0),
    visitsToday: Number(r.visits_today || 0),
    checkedOutToday: Number(r.checked_out_today || 0)
  });
}));

app.get("/api/visitors", asyncRoute(async (req, res) => {
  const search = String(req.query.search || "").trim().slice(0, 100);
  const status = String(req.query.status || "").trim();
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push("(v.visitor_name LIKE ? OR v.phone LIKE ? OR f.flat_number LIKE ? OR v.purpose LIKE ?)");
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (["checked_in", "checked_out"].includes(status)) {
    conditions.push("v.status = ?");
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(`
    SELECT v.id, v.visitor_name, v.phone, v.purpose, v.vehicle_number, v.notes,
      v.status, v.check_in, v.check_out, f.flat_number, f.block_name
    FROM visitors v INNER JOIN flats f ON f.id = v.flat_id
    ${where}
    ORDER BY v.check_in DESC
    LIMIT 500
  `, params);
  res.json(rows);
}));

app.post("/api/visitors", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const name = String(body.visitor_name || "").trim();
  const phone = String(body.phone || "").trim();
  const purpose = String(body.purpose || "").trim();
  const flatId = Number(body.flat_id);
  const vehicle = String(body.vehicle_number || "").trim();
  const notes = String(body.notes || "").trim();

  if (!name || !phone || !purpose || !Number.isInteger(flatId)) {
    return res.status(400).json({ error: "Visitor name, phone, flat number and purpose are required." });
  }
  if (name.length > 120 || purpose.length > 180 || vehicle.length > 30 || notes.length > 500) {
    return res.status(400).json({ error: "One or more fields are too long." });
  }
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    return res.status(400).json({ error: "Enter a valid phone number." });
  }
  const [flats] = await pool.query("SELECT id FROM flats WHERE id = ?", [flatId]);
  if (!flats.length) return res.status(400).json({ error: "Please select a valid flat." });

  const [result] = await pool.query(`
    INSERT INTO visitors
      (visitor_name, phone, flat_id, purpose, vehicle_number, notes, status, check_in)
    VALUES (?, ?, ?, ?, ?, ?, 'checked_in', NOW())
  `, [name, phone, flatId, purpose, vehicle || null, notes || null]);
  res.status(201).json({ id: result.insertId, message: "Visitor registered and checked in." });
}));

app.patch("/api/visitors/:id/checkout", asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid visitor ID." });
  const [result] = await pool.query(
    "UPDATE visitors SET status='checked_out', check_out=NOW() WHERE id=? AND status='checked_in'",
    [id]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ error: "Visitor is already checked out or the record does not exist." });
  }
  res.json({ message: "Visitor checked out successfully." });
}));

app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((err, _req, res, _next) => {
  console.error("Application error:", err.message);
  if (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_DB_ERROR" || err.code === "ECONNREFUSED") {
    return res.status(503).json({ error: "Database is not ready. Check MySQL is running and database.sql has been imported." });
  }
  res.status(500).json({ error: "Unexpected server error. Check the terminal for details." });
});

app.listen(PORT, () => {
  console.log(`Sireesha Apartment Management System: http://localhost:${PORT}`);
});
