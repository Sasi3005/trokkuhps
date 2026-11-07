const express = require("express");
const router = express.Router();
const reservationsController = require("../controllers/reservationController");
const {
  customerAuth,
  requireTrustedOrigin,
} = require("../middleware/customerAuth");

router.get("/", reservationsController.getAllReservations);
router.post(
  "/",
  requireTrustedOrigin,
  customerAuth,
  reservationsController.createReservation
);
router.put("/:id/checkin", reservationsController.checkInReservation);
router.delete("/:id", reservationsController.cancelReservation);

module.exports = router;