const User = require("../models/User");
const { normalizeDate } = require("../utils/dateUtils");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const mailer = require("../utils/mailer");
const FormCycle = require("../models/FormCycle");
const KKProfile = require("../models/KKProfile");
const LGBTQProfile = require("../models/LGBTQProfile");
const EducationalAssistance = require("../models/EducationalAssistance");

  function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    // Adjust if birthday hasn't occurred yet this year
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
    ) {
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

    // Helper: find latest FormCycle by formName (ignore isActive so closed cycles count)
    const findLatestCycle = async (formName) => {
      return await FormCycle.findOne({ formName })
        .sort({ year: -1, cycleNumber: -1, createdAt: -1 })
        .lean();
    };

    // Helper: get user's latest profile (any cycle) for a model
    const findLatestUserProfile = async (Model, userId) => {
      if (!Model) return null;
      return await Model.findOne({ user: userId }).sort({ createdAt: -1 }).select("_id formCycle createdAt").lean();
    };

    // Helper: find profile for a specific cycle
    const findUserProfileForCycle = async (Model, userId, cycleId) => {
      if (!Model || !cycleId) return null;
      const doc = await Model.findOne({ user: userId, formCycle: cycleId }).select("_id").lean();
      return doc ? String(doc._id) : null;
    };

    const kkFormName = "KK Profiling";
    const lgbtqFormName = "LGBTQ Profiling";
    const educFormName = "Educational Assistance";

    // fetch latest cycles
    let [kkCycle, lgbtqCycle, educCycle] = await Promise.all([
      findLatestCycle(kkFormName),
      findLatestCycle(lgbtqFormName),
      findLatestCycle(educFormName)
    ]);

    // fetch user's latest profile entries (any cycle)
    const [kkLatestProfile, lgbtqLatestProfile, educLatestProfile] = await Promise.all([
      findLatestUserProfile(KKProfile, user._id),
      findLatestUserProfile(LGBTQProfile, user._id),
      findLatestUserProfile(EducationalAssistance, user._id)
    ]);

    // attempt to find profile that belongs to the latest cycle explicitly
    const [kkProfileForLatestCycle, lgbtqProfileForLatestCycle, educProfileForLatestCycle] = await Promise.all([
      findUserProfileForCycle(KKProfile, user._id, kkCycle?._id),
      findUserProfileForCycle(LGBTQProfile, user._id, lgbtqCycle?._id),
      findUserProfileForCycle(EducationalAssistance, user._id, educCycle?._id)
    ]);

    // If there is no server-side latest cycle but the user has a profile, try to derive the cycle info from the profile.formCycle
    // (useful when cycles exist but maybe not detected due to naming mismatch)
    const deriveCycleFromProfile = async (profile) => {
      if (!profile || !profile.formCycle) return null;
      try {
        const c = await FormCycle.findById(profile.formCycle).lean();
        return c || null;
      } catch (e) { return null; }
    };

    // If latest cycle is missing but user has a profile, derive it from the profile
    if (!kkCycle && kkLatestProfile) kkCycle = await deriveCycleFromProfile(kkLatestProfile) || kkCycle;
    if (!lgbtqCycle && lgbtqLatestProfile) lgbtqCycle = await deriveCycleFromProfile(lgbtqLatestProfile) || lgbtqCycle;
    if (!educCycle && educLatestProfile) educCycle = await deriveCycleFromProfile(educLatestProfile) || educCycle;

    // Prepare return values:
    const kkAnsweredLatestId = kkProfileForLatestCycle || (kkLatestProfile ? String(kkLatestProfile._id) : null);
    const lgbtqAnsweredLatestId = lgbtqProfileForLatestCycle || (lgbtqLatestProfile ? String(lgbtqLatestProfile._id) : null);
    const educAnsweredLatestId = educProfileForLatestCycle || (educLatestProfile ? String(educLatestProfile._id) : null);

    // Also return any-profile-fallback ids (most recent)
    const kkAny = await KKProfile.findOne({ user: user._id }).select("_id").lean().catch(()=>null);
    const lgbtqAny = await LGBTQProfile.findOne({ user: user._id }).select("_id").lean().catch(()=>null);
    const educAny = await EducationalAssistance.findOne({ user: user._id }).select("_id").lean().catch(()=>null);

    return res.json({
      user,
      profiles: {
        kkLatestCycle: kkCycle ? { cycleId: kkCycle._id, year: kkCycle.year, cycleNumber: kkCycle.cycleNumber, isActive: kkCycle.isActive } : null,
        kkAnsweredLatestId: kkAnsweredLatestId, // id if user answered the latest-known cycle (or most recent profile)
        kkAnyProfileId: kkAny ? kkAny._id : null,

        lgbtqLatestCycle: lgbtqCycle ? { cycleId: lgbtqCycle._id, year: lgbtqCycle.year, cycleNumber: lgbtqCycle.cycleNumber, isActive: lgbtqCycle.isActive } : null,
        lgbtqAnsweredLatestId: lgbtqAnsweredLatestId,
        lgbtqAnyProfileId: lgbtqAny ? lgbtqAny._id : null,

        educationalLatestCycle: educCycle ? { cycleId: educCycle._id, year: educCycle.year, cycleNumber: educCycle.cycleNumber, isActive: educCycle.isActive } : null,
        educationalAnsweredLatestId: educAnsweredLatestId,
        educationalAnyProfileId: educAny ? educAny._id : null
      }
    });
  } catch (err) {
    console.error("getUserById error:", err); // log full error and stack
    return res.status(500).json({ error: err.message || "Server error" });
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

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };



exports.sendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const MAX_SENDS = 2;
  const WINDOW_MS = 2 * 60 * 1000;
  const now = Date.now();

  // --- Improved logging for OTP send count ---
  if (!user.emailVerificationOtpLastSent || now - user.emailVerificationOtpLastSent >= WINDOW_MS) {
    user.emailVerificationOtpSendCount = 1;
    console.log(`[VERIFICATION OTP LOG] Count reset to 1 (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
  } else {
    user.emailVerificationOtpSendCount = (user.emailVerificationOtpSendCount || 0) + 1;
    console.log(`[VERIFICATION OTP LOG] Count incremented to ${user.emailVerificationOtpSendCount} (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
  }

  // Restrict if count exceeds MAX_SENDS
  if (user.emailVerificationOtpSendCount > MAX_SENDS) {
    user.emailVerificationOtpLastSent = now; // update last sent for lockout
    await user.save();
    console.log(`[VERIFICATION OTP LOG] Restriction triggered at count ${user.emailVerificationOtpSendCount} (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
    return res.status(429).json({
      message: `Too many OTP requests. Please wait 2 minutes.`,
      secondsLeft: Math.ceil(WINDOW_MS / 1000),
    });
  }

  // Save last sent timestamp
  user.emailVerificationOtpLastSent = now;

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otpCode = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save();

  // Send email
  await mailer.sendMail({
    from: `"SK Insight" <${process.env.HOSTINGER_SMTP_USER}>`,
    to: user.email,
    subject: "Your OTP Code",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SK Insight OTP</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #f4f7fc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 10px; padding: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); text-align: center; overflow: hidden; }
          .header { background: #0A2C59; color: #fff; padding: 32px 0 16px 0; border-top-left-radius: 10px; border-top-right-radius: 10px; }
          .logo { max-width: 120px; margin-bottom: 12px; }
          h2 { color: #fff; margin-bottom: 10px; font-size: 2rem; font-weight: 700; }
          .content { padding: 32px 40px 24px 40px; }
          .otp { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0A2C59; margin: 24px 0; background: #eaf3fb; border-radius: 8px; display: inline-block; padding: 12px 32px; box-shadow: 0 2px 8px rgba(7,176,242,0.07); }
          p { color: #333; font-size: 16px; margin-bottom: 10px; }
          .footer { background: #0A2C59; color: #fff; font-size: 13px; padding: 18px 0; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img class="logo" src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" />
            <h2>Your OTP Code</h2>
          </div>
          <div class="content">
            <p>Use the following code to verify your email. It is valid for 10 minutes.</p>
            <div class="otp">${otp}</div>
            <p>If you didn’t request this, please ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
  });

  console.log(`[VERIFICATION OTP LOG] OTP sent, count is now ${user.emailVerificationOtpSendCount} (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
  res.json({ message: "OTP sent to your email." });
};



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
        user.otpLockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
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
    console.log('=== smartRegister called ===');
    console.log('Request body:', req.body);
    console.log('File uploaded:', req.file ? req.file.filename : 'No file');
    
    const {
      lastName,
      firstName,
      middleName,
      suffix,
      username,
      email,
      password,
      birthday
    } = req.body;

    // Basic required fields validation
    if (!lastName || !firstName || !username || !email || !password || !birthday) {
      console.log('Missing required fields:', { lastName, firstName, username, email, password, birthday });
      return res.status(400).json({ 
        message: "Missing required fields.",
        code: "missing_fields",
        received: { lastName, firstName, username, email, password, birthday }
      });
    }

    // Check if ID image was uploaded
    if (!req.file) {
      console.log('No ID image uploaded');
      return res.status(400).json({
        message: "ID image is required",
        code: "missing_id_image"
      });
    }

    console.log('All fields present. Validating birthday...');

    // Validate/normalize birthday (expects YYYY-MM-DD or compatible)
    const normalizedBirthday = normalizeDate(birthday);
    console.log('Original birthday:', birthday);
    console.log('Normalized birthday:', normalizedBirthday);
    
    if (!normalizedBirthday) {
      console.log('Birthday normalization failed');
      return res.status(400).json({
        message: "Please enter a valid birthday in YYYY-MM-DD format.",
        code: "birthday_invalid",
        received: birthday
      });
    }

    // Compute age
    const computedAge = calculateAge(normalizedBirthday);
    console.log('Computed age:', computedAge);

    // Only allow age 11-30 inclusive
    if (computedAge < 11 || computedAge > 30) {
      return res.status(400).json({
        message: "Only users aged 11 to 30 are allowed to sign up.",
        code: "age_not_allowed"
      });
    }

    // Determine access level
    const accessLevel = "full";
    console.log('Access level:', accessLevel);

    // Uniqueness checks
    console.log('Checking email uniqueness...');
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log('Email already exists:', email);
      return res.status(400).json({ 
        message: "Email already in use", 
        code: "email_exists" 
      });
    }

    console.log('Checking username uniqueness...');
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log('Username already exists:', username);
      return res.status(400).json({ 
        message: "Username already in use", 
        code: "username_exists" 
      });
    }

    // Store the uploaded file path
    const idImagePath = req.file.path ? req.file.path.replace(/\\/g, '/') : req.file.filename;

    // Create user (single save; password hashing via schema pre-save)
    console.log('Creating new user...');
    const user = new User({
      lastName,
      firstName,
      middleName,
      suffix,
      username,
      email,
      password,
      birthday: normalizedBirthday,
      age: computedAge,
      accessLevel,
      idImage: idImagePath,
      accStatus: "pending",  // Default to pending, admin must approve
      approvalRequestedAt: new Date()  // Set timestamp for 24-hour check
    });

    console.log('User object before save:', user);
    await user.save();
    console.log('User saved successfully with ID:', user._id);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    console.log('Registration successful for user:', user.email);
    res.status(201).json({
      message: "Registration successful. Your ID is pending verification.",
      user: {
        _id: user._id,
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        suffix: user.suffix,
        username: user.username,
        email: user.email,
        accessLevel: user.accessLevel,
        age: user.age,
        accStatus: user.accStatus,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    console.error("=== Smart registration error ===");
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Full error:', err);
    
    res.status(500).json({ 
      message: "Server error during registration.",
      code: "server_error",
      error: err.message
    });
  }
};

  // POST /api/users/change-password
  exports.changePassword = async (req, res) => {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

      user.password = newPassword;
      await user.save();
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  };

  // POST /api/users/change-email/send-otp
exports.sendChangeEmailOtp = async (req, res) => {
  console.log("sendChangeEmailOtp called", {
    url: req.originalUrl,
    method: req.method,
    headers: {
      authorization: req.headers.authorization
    },
    body: req.body
  });

  try {
    // ensure auth middleware populated req.user
    if (!req.user || !req.user._id) {
      console.error("sendChangeEmailOtp: missing req.user");
      return res.status(401).json({ message: "Unauthorized: missing user" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.error("sendChangeEmailOtp: user not found", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.email) {
      console.error("sendChangeEmailOtp: user has no email", user._id);
      return res.status(400).json({ message: "No email on user account" });
    }

    // Check lockout
    if (user.emailChangeOtpLockedUntil && user.emailChangeOtpLockedUntil > Date.now()) {
      const unlockAt = user.emailChangeOtpLockedUntil;
      const secondsLeft = Math.ceil((unlockAt - Date.now()) / 1000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${Math.ceil(secondsLeft / 60)} minutes.`,
        unlockAt,
        secondsLeft
      });
    }

    const MAX_SENDS = 2;
    const LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();

    // --- Improved logic: reset count if last send was >= 2 minutes ago ---
    if (!user.emailChangeOtpLastSent || now - user.emailChangeOtpLastSent >= LOCKOUT_MS) {
      user.emailChangeOtpSendCount = 1;
      console.log(`[OTP LOG] Count reset to 1 (last sent: ${user.emailChangeOtpLastSent}, now: ${now})`);
    } else {
      user.emailChangeOtpSendCount = (user.emailChangeOtpSendCount || 0) + 1;
      console.log(`[OTP LOG] Count incremented to ${user.emailChangeOtpSendCount} (last sent: ${user.emailChangeOtpLastSent}, now: ${now})`);
    }

    // --- Restrict if count exceeds MAX_SENDS ---
    if (user.emailChangeOtpSendCount > MAX_SENDS) {
      user.emailChangeOtpLastSent = now; // update last sent for lockout
      await user.save();
      console.log(`[OTP LOG] Restriction triggered at count ${user.emailChangeOtpSendCount} (last sent: ${user.emailChangeOtpLastSent}, now: ${now})`);
      return res.status(429).json({
        message: `Too many OTP requests. Please wait 2 minutes.`,
        secondsLeft: Math.ceil(LOCKOUT_MS / 1000),
      });
    }

    // --- Save last sent timestamp ---
    user.emailChangeOtpLastSent = now;

    // --- Generate OTP and send email ---
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpires = Date.now() + 10 * 60 * 1000;
    user.emailChangeOtpAttempts = 0;
    user.emailChangeOtpLockedUntil = undefined;
    await user.save();

    // verify transporter connection (will throw if can't connect)
    try {
      await mailer.verify();
      console.log("SMTP verify ok");
    } catch (verifyErr) {
      console.error("SMTP verify failed:", verifyErr && verifyErr.message);
      // keep going to attempt sendMail so we capture the real error if any
    }

    // send email
    const mailOptions = {
      from: `"SK Insight" <${process.env.HOSTINGER_SMTP_USER || user.email}>`,
      to: user.email,
      subject: "SK Insight Email Change OTP",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>SK Insight - Email Change OTP</title>
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
              <h2>Email Change OTP</h2>
            </div>
            <div class="content">
              <p>Use the following code to verify your email change request. It is valid for 10 minutes.</p>
              <div class="otp">${otp}</div>
              <p>If you didn’t request this, please ignore this email.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await mailer.sendMail(mailOptions);

    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    // Improved error logging
    console.error("Change Email OTP Error:", err);

    res.status(500).json({ message: "Could not send OTP. Please try again.", error: err.message });
  }
};

  // POST /api/users/change-email/verify-otp
  exports.verifyChangeEmailOtp = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "Missing otp" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Debug log
    console.log("Verifying OTP:", {
      sent: otp,
      stored: user.emailChangeOtp,
      expires: user.emailChangeOtpExpires,
      now: Date.now()
    });

    // Check lockout
    if (user.emailChangeOtpLockedUntil && user.emailChangeOtpLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.emailChangeOtpLockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    if (
      !user.emailChangeOtp ||
      !user.emailChangeOtpExpires ||
      user.emailChangeOtp !== otp ||
      user.emailChangeOtpExpires < Date.now()
    ) {
      user.emailChangeOtpAttempts = (user.emailChangeOtpAttempts || 0) + 1;
      if (user.emailChangeOtpAttempts >= 5) {
        user.emailChangeOtpAttempts = 0;
        user.emailChangeOtpLockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lock
      }
      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // mark verified so frontend can proceed to change email without retyping otp
    user.emailChangeOtpVerified = true;
    user.emailChangeOtpAttempts = 0;
    await user.save();

    return res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("verifyChangeEmailOtp error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

  // POST /api/users/change-email
  exports.changeEmail = async (req, res) => {
    try {
      const userId = req.user._id;
      const { newEmail, otp } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Allow change if otp provided and matches OR if previously verified with /verify-otp
      const otpValid =
        (otp && user.emailChangeOtp && user.emailChangeOtpExpires && user.emailChangeOtp === otp && user.emailChangeOtpExpires > Date.now()) ||
        user.emailChangeOtpVerified === true;

      if (!otpValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Check if new email is already taken
      const existing = await User.findOne({ email: newEmail });
      if (existing) return res.status(400).json({ message: "Email already in use" });

      user.email = newEmail;
      user.isVerified = false; // require re-verification after email change

      // clear email-change OTP fields
      user.emailChangeOtp = undefined;
      user.emailChangeOtpExpires = undefined;
      user.emailChangeOtpAttempts = undefined;
      user.emailChangeOtpVerified = undefined;
      user.otpLockedUntil = undefined;

      await user.save();

      res.json({ message: "Email changed successfully" });
    } catch (err) {
      console.error("changeEmail error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };

  // POST /api/users/change-email-unverified
  exports.changeEmailUnverified = async (req, res) => {
    try {
      const userId = req.user._id;
      const { newEmail } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.isVerified) {
        return res.status(400).json({ message: "Verified users must use OTP to change email." });
      }

      // Check if new email is already taken
      const existing = await User.findOne({ email: newEmail });
      if (existing) return res.status(400).json({ message: "Email already in use" });

      user.email = newEmail;
      await user.save();

      res.json({ message: "Email changed successfully." });
    } catch (err) {
      console.error("changeEmailUnverified error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };

// Create admin account (minimal input: username + password, optional email)
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    // Prevent duplicate username/email
    const existsUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existsUser) {
      return res.status(400).json({ message: "Username or email already in use" });
    }

    // Default email if not provided (keeps email required satisfied)
    const safeEmail = email || `${username}@admin.local`;

    // Set birthday to 25 years ago so age is valid and accessLevel can be 'full'
    const b = new Date();
    b.setFullYear(b.getFullYear() - 25);

    const computedAge = (new Date()).getFullYear() - b.getFullYear();

    const user = new User({
      lastName: "Administrator",
      firstName: username,
      middleName: "",
      suffix: "",
      username,
      email: safeEmail,
      password,
      role: "admin",
      isVerified: true,
      birthday: b,
      accessLevel: "full",
      age: computedAge
    });

    await user.save();

    const out = user.toObject();
    delete out.password;
    res.status(201).json({ message: "Admin created", user: out });
  } catch (err) {
    console.error("createAdmin error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Mark agreement accepted for current user
exports.acceptAgreement = async (req, res) => {
  console.debug('acceptAgreement called, req.user:', req.user && { id: req.user._id, role: req.user.role });
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.agreementAccepted = true;
    user.agreementAcceptedAt = new Date();
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ message: 'Agreement recorded', user: safeUser });
  } catch (err) {
    console.error('acceptAgreement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// POST /api/users/me/update-info
// Update current user's own account info (username, firstName, middleName, lastName, suffix)
exports.updateMyInfo = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, firstName, middleName, lastName, suffix } = req.body;

    // Find the current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Helper: convert to Title Case
    function titleCase(str) {
      if (!str || typeof str !== 'string') return '';
      return str
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Validate required fields: firstName, lastName cannot be empty
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: "First name is required and cannot be empty" });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ error: "Last name is required and cannot be empty" });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      user.username = username;
    }

    // Update name fields (apply title case)
    // firstName and lastName are required (already validated above)
    user.firstName = titleCase(firstName);
    user.lastName = titleCase(lastName);
    
    // middleName is optional - update only if provided
    if (middleName && middleName.trim()) {
      user.middleName = titleCase(middleName);
    } else {
      user.middleName = ''; // Allow clearing middle name
    }
    
    // suffix is optional and can be cleared
    if (suffix && suffix.trim()) {
      user.suffix = titleCase(suffix);
    } else {
      user.suffix = ''; // Allow clearing suffix
    }

    // Save the updated user
    await user.save();

    // Return updated user data (without password)
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({
      message: "Account info updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("updateMyInfo error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/users/:userId/approve-id
// Admin endpoint to approve a user's ID verification
exports.approveUserID = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { accStatus: "approved" },
    { new: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    message: "User ID approved successfully",
    user
  });
});

// POST /api/users/:userId/reject-id
// Admin endpoint to reject a user's ID verification
exports.rejectUserID = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  // Validate that reason is provided
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Mark as rejected and store rejection reason
  user.accStatus = "rejected";
  user.rejectionReason = reason.trim();
  await user.save();

  const updatedUser = user.toObject();
  delete updatedUser.password;

  res.json({
    message: "User ID rejected",
    user: updatedUser
  });
});
