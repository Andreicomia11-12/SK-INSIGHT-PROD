const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  lastName: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  suffix: { type: String, trim: true },

  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },

  isVerified: { type: Boolean, default: false },
  accStatus: { type: String, enum: ["pending", "rejected", "approved"], default: "pending" },
  rejectionReason: { type: String, trim: true },
  verificationTimeoutEmailSent: { type: Boolean, default: false },
  approvalRequestedAt: { type: Date, default: null },

  birthday: { type: Date, required: true },
  accessLevel: { type: String, enum: ["full", "limited"], default: "limited" },
  age: { type: Number },
  idImage: { type: String },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  otpCode: String,
  otpExpires: Date,
  otpAttempts: { type: Number, default: 0 },
  otpLockedUntil: Date, // for general OTP (verification, password reset)


  emailChangeOtp: String,
  emailChangeOtpExpires: Date,
  emailChangeOtpAttempts: { type: Number, default: 0 },
  emailChangeOtpLockedUntil: Date,
  emailChangeOtpVerified: Boolean,
  emailChangeOtpSendCount: { type: Number, default: 0 },
  emailChangeOtpSendWindowStart: { type: Number },
  emailChangeOtpLastSent: { type: Number }, // or Date

  emailVerificationOtpSendCount: { type: Number, default: 0 },
  emailVerificationOtpSendWindowStart: { type: Number },
  emailVerificationOtpLastSent: { type: Number }, // or Date
  verifiedAddress: {
    type: String,
    trim: true,
  },
  gender: { type: String },
  civilStatus: { type: String },
  agreementAccepted: { type: Boolean, default: false },
  agreementAcceptedAt: { type: Date, default: null },
},
{
  timestamps: true // adds createdAt and updatedAt
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
