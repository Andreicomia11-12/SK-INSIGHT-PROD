const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },

  isVerified: { type: Boolean, default: false },

  birthday: { type: Date, required: true },
  accessLevel: { type: String, enum: ["full", "limited"], default: "limited" },
  age: { type: Number },
  idImage: { type: String },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  otpCode: String,
  otpExpires: Date,
  otpAttempts: { type: Number, default: 0 },
  otpLockedUntil: Date,

  verifiedAddress: {
    type: String,
    trim: true,
  },
  gender: { type: String },
  civilStatus: { type: String },
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
