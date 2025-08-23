const mongoose = require("mongoose");

const siblingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  age: { type: Number, required: true },
});

const expenseSchema = new mongoose.Schema({
  item: { type: String, required: true },
  expectedCost: { type: Number, required: true },
});

const educationalAssistanceSchema = new mongoose.Schema({
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
  surname: { type: String, required: true },
  firstname: { type: String, required: true },
  middlename: { type: String, required: true },
  birthday: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  age: { type: Number, required: true },
  sex: { type: String, required: true },
  civilStatus: { type: String, required: true },
  religion: { type: String, required: true },
  school: { type: String, required: true },
  schoolAddress: { type: String, required: true },
  course: { type: String, required: true },
  yearLevel: { type: String, required: true },
  typeOfBenefit: {
    type: String,
    default: "Educational Assistance",
  },
  fatherName: { type: String, required: true },
  fatherPhone: { type: String },
  motherName: { type: String, required: true },
  motherPhone: { type: String },
  siblings: [siblingSchema],
  expenses: [expenseSchema],
  signature: { type: String }, // base64 or file path

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: { type: String },
  resubmissionCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model(
  "EducationalAssistance",
  educationalAssistanceSchema
);
