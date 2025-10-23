const User = require("../models/User");
const { extractFromIDImage } = require("../utils/extractBirthday");
const { normalizeDate } = require("../utils/dateUtils");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const asyncHandler = require("express-async-handler");
const fs = require("fs");

function calculateAge(birthday) {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ ALL
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// controllers/userController.js
exports.getUsers = async (req, res) => {
  try {
    // only fetch users where role is "user"
    const users = await User.find({ role: "user" }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


// READ ONE
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateUser = async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const currentUserId = req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    // Allow only admin or the user themselves
    if (!isAdmin && userIdToUpdate !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await User.findById(userIdToUpdate);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent normal users from updating protected fields
    if (!isAdmin) {
      delete req.body.role;
      delete req.body.isVerified;
    }

    // If admin is promoting someone to admin, auto-verify
    if (req.body.role === "admin" && user.role !== "admin") {
      req.body.isVerified = true;
    }

    // Update fields safely
    Object.assign(user, req.body);
    await user.save();

    const updatedUser = await User.findById(userIdToUpdate).select("-password");

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user (for authenticated routes)
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendVerificationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.isVerified)
    return res.status(400).json({ message: "User already verified" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  user.otpCode = otp;
  user.otpExpires = otpExpires;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER, // ✅ match your .env
      pass: process.env.GMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SK Insight" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: "Your OTP Code",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SK Insight OTP</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #f4f7fc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      text-align: center;
    }
    .logo {
      max-width: 120px;
      margin-bottom: 20px;
    }
    h2 {
      color: #0A2C59;
      margin-bottom: 10px;
    }
    .otp {
      font-size: 28px;
      font-weight: bold;
      letter-spacing: 6px;
      color: #0A2C59;
      margin: 20px 0;
    }
    p {
      color: #333;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .footer {
      font-size: 12px;
      color: #888;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img class="logo" src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" />
    <h2>Your OTP Code</h2>
    <p>Use the following code to verify your email. It is valid for 10 minutes.</p>
    <div class="otp">${otp}</div>
    <p>If you didn’t request this, please ignore this email.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
    </div>
  </div>
</body>
</html>
`,
  });

  res.json({ message: "OTP sent to your email." });
});

exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.isVerified) {
    return res.status(400).json({ message: "User already verified" });
  }

  if (user.otpLockedUntil && user.otpLockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.otpLockedUntil - Date.now()) / 60000);
    return res.status(429).json({
      message: `Too many failed attempts. Try again in ${minutesLeft} minutes.`,
    });
  }

  if (user.otpCode === otp && user.otpExpires && user.otpExpires > Date.now()) {
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockedUntil = undefined;
    await user.save();
    return res.json({ message: "Email successfully verified." });
  } else {
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    if (user.otpAttempts >= 5) {
      user.otpLockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      user.otpAttempts = 0;
    }

    await user.save();
    return res.status(400).json({
      message: "Invalid or expired OTP.",
      attemptsLeft: Math.max(0, 5 - user.otpAttempts),
    });
  }
});


// POST /api/users/smart-register
exports.smartRegister = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "No ID image uploaded." });
    }

    const { username, email, password, birthday } = req.body;
    const idImagePath = req.file.path;

    // OCR extraction
    const { birthday: ocrBirthday, address: ocrAddress } =
      await extractFromIDImage(idImagePath);

    // Log extracted birthday and address
    console.log("Extracted birthday (controller):", ocrBirthday);
    console.log("Extracted address (controller):", ocrAddress);

    // Address validation (accept "CALACA" or "CALACA CITY", any case)
    const addressValid =
      ocrAddress &&
      /puting bato west/i.test(ocrAddress) &&
      /(calaca|calaca city)/i.test(ocrAddress) &&
      /batangas/i.test(ocrAddress);

    if (!addressValid) {
      return res.status(400).json({
        message: "Address must be Puting Bato West, Calaca City, Batangas.",
      });
    }

    // Tiered access level logic
    let accessLevel = "partial";
    if (ocrBirthday && ocrBirthday === normalizeDate(birthday)) {
      accessLevel = "full";
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    // Clean up the extracted address before saving
    let cleanedAddress = ocrAddress
      ? ocrAddress.replace(/\s*\([^)]+\)\s*$/, "").trim()
      : ocrAddress;

    // Create and save new user with accessLevel
    const user = new User({
      username,
      email,
      password,
      birthday: ocrBirthday,
      verifiedAddress: cleanedAddress,
      accessLevel,
      idImage: path.basename(idImagePath),
    });
    await user.save();

    // Calculate and set user age
    user.age = calculateAge(ocrBirthday);
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Smart registration successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        verifiedAddress: user.verifiedAddress,
        accessLevel: user.accessLevel,
      },
      token,
    });
  } catch (err) {
    console.error("Smart registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
};
