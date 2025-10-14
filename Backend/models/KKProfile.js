const mongoose = require("mongoose");

const kkProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  formCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FormCycle",
    required: true,
  },
  lastname: String,
  firstname: String,
  middlename: String,
  suffix: String,
  gender: String,

  region: String,
  province: String,
  municipality: String,
  barangay: String,
  purok: String,

  email: String,
  contactNumber: String,

  civilStatus: {
    type: String,
    enum: ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
  },
  youthAgeGroup: {
    type: String,
    enum: ["Child Youth", "Core Youth", "Young Youth"],
  },
  youthClassification: {
    type: String,
    enum: ["In School Youth","Out of School Youth","Working Youth","Youth with Specific Needs"],
  },
    specificNeedType: {
    type: String,
    enum: [
      'Person w/Disability',
      'Children in Conflict w/Law',
      'Indigenous People'
    ],
    default: null
  },
  educationalBackground: {
    type: String,
    enum: [
      "Elementary Undergraduate", "Elementary Graduate",
      "High School Undergraduate", "High School Graduate",
      "Vocational Graduate", "College Undergraduate",
      "College Graduate", "Masters Level", "Masters Graduate",
      "Doctorate Level", "Doctorate Graduate"
    ],
  },
  workStatus: {
    type: String,
    enum: [
      "Employed", "Unemployed", "Self-Employed",
      "Currently looking for a Job", "Not interested in looking for a Job"
    ],
  },

  registeredSKVoter: Boolean,
  registeredNationalVoter: Boolean,
  votedLastSKElection: Boolean,

  attendedKKAssembly: Boolean,
  attendanceCount: {
    type: String,
    enum: ["1-2 times", "3-4 times", "5 and above"],
  },
  reasonDidNotAttend: {
    type: String,
    enum: ["There was no KK Assembly", "Not interested"],
  },
  profileImage: { type: String, required: true },
  idImagePath: { type: String },
  signatureImagePath: { type: String },
  birthday: { type: Date, required: true },

  submittedAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("KKProfile", kkProfileSchema);
