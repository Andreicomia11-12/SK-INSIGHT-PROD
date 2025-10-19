const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
  adminLogin,
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

module.exports = router;
