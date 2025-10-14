const mongoose = require("mongoose");

const lgbtqProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    formCycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormCycle",
      required: true,
    },
    // Demographic fields
    lastname: String,
    firstname: String,
    middlename: String,
    sexAssignedAtBirth: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    lgbtqClassification: {
      type: String,
      enum: [
        "Lesbian",
        "Gay",
        "Bisexual",
        "Queer",
        "Intersex",
        "Asexual",
        "Transgender",
      ],
      required: true,
    },
    idImage: String, // <-- Add this line
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LGBTQProfile", lgbtqProfileSchema);
