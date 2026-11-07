"use strict";
const express = require("express");
const controller = require("../controllers/customerAuthController");
const { customerAuth, requireTrustedOrigin } = require("../middleware/customerAuth");
const router = express.Router();

router.post("/register", requireTrustedOrigin, controller.register);
router.post("/register/resend-otp", requireTrustedOrigin, controller.resendRegistrationOtp);
router.post("/register/verify-otp", requireTrustedOrigin, controller.verifyRegistrationOtp);
router.post("/login", requireTrustedOrigin, controller.login);
router.get("/me", customerAuth, controller.me);
router.post("/logout", requireTrustedOrigin, controller.logout);

module.exports = router;
