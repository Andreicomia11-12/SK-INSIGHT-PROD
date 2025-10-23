const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const otpTransporter = require("../utils/mailer");

const getResetPasswordEmail = require("../utils/templates/resetPasswordEmail");

// POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/signup
exports.registerUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    // Create and save new user
    const user = new User({ username, email, password, role: role || "user" });
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.status(201).json({
      message: "Signup successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Generate OTP (6 digits)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Save OTP and expiry to user
  user.otpCode = otpCode;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
  await user.save();

  // Email content
  const html = `
    <h2>SK Insight Password Reset OTP</h2>
    <p>Your OTP code is: <b>${otpCode}</b></p>
    <p>This code will expire in 10 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  try {
    await otpTransporter.sendMail({
      to: user.email,
      subject: "SK Insight Password Reset OTP",
      html,
    });
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP email send error:", err);
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.status(500).json({ error: "OTP email could not be sent" });
  }
};

exports.resetPassword = async (req, res) => {
  const resetToken = req.params.token;
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user)
    return res.status(400).json({ error: "Token is invalid or has expired" });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({ message: "Password has been reset" });
};

// POST /api/auth/admin-login
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, role: "admin" });
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    message: "Admin login successful",
    user: {
      _id: user._id,
      username: user.username,
      role: user.role,
    },
    token,
  });
};

exports.verifyOtpAndResetPassword = async (req, res) => {
  const { email, otpCode, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Check OTP and expiry
  if (
    !user.otpCode ||
    !user.otpExpires ||
    user.otpCode !== otpCode ||
    user.otpExpires < Date.now()
  ) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  // Update password and clear OTP
  user.password = newPassword;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: "Password has been reset successfully" });
};

exports.verifyOtp = async (req, res) => {
  const { email, otpCode } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (
    !user.otpCode ||
    !user.otpExpires ||
    user.otpCode !== otpCode ||
    user.otpExpires < Date.now()
  ) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  res.json({ message: "OTP verified" });
};
