"use strict";
const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");

// ---- core ----
router.get("/", tableController.getAllTables);
router.get("/:id", tableController.getTableById);                // รองรับ A19/19
router.get("/:id/orders", tableController.getTableWithOrders);   // ใช้ table_number หรือ id ก็ได้

router.post("/", tableController.createTable);
router.put("/:id", tableController.updateTable);
router.delete("/:id", tableController.deleteTable);

// ---- QR ----
router.post("/:tableNumber/generate-qr", tableController.generateQRCodeForTable);
router.post("/:tableNumber/clear-qr", tableController.clearQRCode);
router.get("/:tableNumber/qr", tableController.serveQRCode);

// ---- approval ----
router.post("/:tableNumber/decision", tableController.approveOrRejectTable);

module.exports = router;
