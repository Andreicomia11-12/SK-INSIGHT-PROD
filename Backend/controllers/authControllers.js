const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const mailer = require("../utils/mailer");

const getResetPasswordEmail = require("../utils/templates/resetPasswordEmail");

// Helper: convert a name to Title Case (first letter uppercase, rest lowercase)
function titleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // Check if user is approved (ID verification)
    if (user.accStatus === "rejected") {
      // Account was rejected
      return res.status(403).json({ 
        error: "Your ID has been rejected.",
        reason: user.rejectionReason || "No reason provided",
        code: "account_rejected",
        rejectionReason: user.rejectionReason || null
      });
    } else if (user.accStatus !== "approved") {
      // Account is still pending
      return res.status(403).json({ 
        error: "Your account is pending for verification. Please wait for up to 24 hours for approval.",
        code: "account_not_approved",
        rejectionReason: user.rejectionReason || null
      });
    }

    // --- Age and accessLevel update logic ---
    if (user.birthday) {
      const today = new Date();
      const birthDate = new Date(user.birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      if (
        today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      if (user.age !== age) {
        user.age = age;
      }
      if (age > 30 && user.accessLevel !== "limited") {
        user.accessLevel = "limited";
      }
      await user.save();
    }
    // ----------------------------------------

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
        age: user.age,
        accessLevel: user.accessLevel,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/signup
exports.registerUser = async (req, res) => {
  const { username, email, password, role, firstName, middleName, lastName, suffix, birthday } = req.body;

  try {
    // Validate password strength on server too: min 8 chars, uppercase, number, special char
    const pw = password || '';
    const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPw.test(pw)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    // Normalize name fields (Title Case) before saving
    const fn = titleCase(firstName || '');
    const mn = titleCase(middleName || '');
    const ln = titleCase(lastName || '');
    const sx = titleCase(suffix || '');

    // Create and save new user (include normalized name fields and birthday if provided)
    const userData = {
      username,
      email,
      password,
      role: role || "user",
      firstName: fn,
      middleName: mn,
      lastName: ln,
      suffix: sx,
    };
    if (birthday) {
      // attempt to parse birthday if provided
      const bd = new Date(birthday);
      if (!isNaN(bd.getTime())) userData.birthday = bd;
    }

    const user = new User(userData);
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

  // Hostinger HTML template (copied from verify email in userControllers.js)
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>SK Insight Password Reset OTP</title>
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
          padding: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          text-align: center;
          overflow: hidden;
        }
        .header {
          background: #0A2C59;
          color: #fff;
          padding: 32px 0 16px 0;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        }
        .logo {
          max-width: 120px;
          margin-bottom: 12px;
        }
        h2 {
          color: #fff;
          margin-bottom: 10px;
          font-size: 2rem;
          font-weight: 700;
        }
        .content {
          padding: 32px 40px 24px 40px;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #0A2C59;
          margin: 24px 0;
          background: #eaf3fb;
          border-radius: 8px;
          display: inline-block;
          padding: 12px 32px;
          box-shadow: 0 2px 8px rgba(7,176,242,0.07);
        }
        p {
          color: #333;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .footer {
          background: #0A2C59;
          color: #fff;
          font-size: 13px;
          padding: 18px 0;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
          margin-top: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img class="logo" src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" />
          <h2>Password Reset OTP</h2>
        </div>
        <div class="content">
          <p>Use the following code to reset your password. It is valid for 10 minutes.</p>
          <div class="otp">${otpCode}</div>
          <p>If you didn’t request this, please ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await mailer.sendMail({
      from: `"SK Insight" <${process.env.HOSTINGER_SMTP_USER}>`,
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
