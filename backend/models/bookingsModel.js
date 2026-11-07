"use strict";
const db = require("../DB/db");

function toDateTime(date, time) {
  if (!date || !time) return null;
  const t = /^\d{2}:\d{2}(:\d{2})?$/.test(time) ? time : String(time).slice(0, 5);
  return `${date} ${t.length === 5 ? t + ":00" : t}`;
}

const Bookings = {
  getAll() {
    return db.query(
      `SELECT booking_id, table_number, zone, name, phone,
              DATE_FORMAT(start_at,'%Y-%m-%d') AS date,
              DATE_FORMAT(start_at,'%H:%i') AS time,
              status, created_at,
              (slip_blob IS NOT NULL) AS has_slip
       FROM bookings
       ORDER BY booking_id DESC`
    ).then(([rows]) => rows);
  },

  getById(id) {
    return db.query(
      `SELECT booking_id, table_number, zone, name, phone,
              DATE_FORMAT(start_at,'%Y-%m-%d') AS date,
              DATE_FORMAT(start_at,'%H:%i') AS time,
              status, created_at
       FROM bookings WHERE booking_id = ?`,
      [id]
    ).then(([rows]) => rows[0] || null);
  },
  create({ user_id, table_number, zone = "โซนในร้าน", name, phone, start_at, slip = null }) {
    return db.query(
      `INSERT INTO bookings
       (user_id, table_number, zone, name, phone, start_at,
        slip_mime, slip_filename, slip_size, slip_blob, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        user_id,
        String(table_number),
        zone,
        name,
        phone,
        start_at,
        slip ? slip.mime : null,
        slip ? slip.filename : null,
        slip ? slip.size : null,
        slip ? slip.buffer : null,
      ]
    ).then(([rs]) => ({ id: rs.insertId }));
  },

  updateById(id, { table_number, zone = "โซนในร้าน", name, phone, date, time, slip }) {
    const start_at = toDateTime(date, time);

    const sets = ["table_number = ?", "zone = ?", "name = ?", "phone = ?", "start_at = ?"];
    const params = [String(table_number), zone, name, phone, start_at];

    if (slip !== undefined) {
      sets.push("slip_mime = ?", "slip_filename = ?", "slip_size = ?", "slip_blob = ?");
      params.push(
        slip ? slip.mime : null,
        slip ? slip.filename : null,
        slip ? slip.size : null,
        slip ? slip.buffer : null
      );
    }

    const sql = `UPDATE bookings SET ${sets.join(", ")} WHERE booking_id = ?`;
    params.push(id);
    return db.query(sql, params).then(() => ({ id }));
  },

  updateStatus(id, status) {
    return db.query(
      `UPDATE bookings SET status = ? WHERE booking_id = ?`,
      [status, id]
    ).then(([r]) => r.affectedRows || 0);
  },

  deleteById(id) {
    return db.query(`DELETE FROM bookings WHERE booking_id = ?`, [id]).then(() => ({ id }));
  },

  getSlipByBookingId(id) {
    return db.query(
      `SELECT slip_blob, slip_mime, slip_filename
       FROM bookings WHERE booking_id = ?`,
      [id]
    ).then(([rows]) => rows[0] || null);
  },
};

module.exports = Bookings;
