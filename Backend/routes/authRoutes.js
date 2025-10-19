const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
  adminLogin,
  verifyOtpAndResetPassword,
  verifyOtp,
} = require("../controllers/authControllers");
const {
  forgotPassword,
  resetPassword,
} = require("../controllers/authControllers");

router.post("/login", loginUser);
router.post("/signup", registerUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/admin/login", adminLogin);
router.post("/verify-otp-reset", verifyOtpAndResetPassword);
router.post("/verify-otp", verifyOtp);

module.exports = router;
