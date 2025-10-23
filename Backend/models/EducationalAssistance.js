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
  // birthday: { type: Date, required: true },
  placeOfBirth: { type: String, required: true },
  age: { type: Number, required: true },
  sex: { type: String, required: true },
  civilStatus: { 
    type: String, 
    required: true ,
    enum: ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
  },
  religion: { type: String, required: true },
  email: { type: String, required: true },
  contactNumber: { type: Number, required: true },
  school: { type: String, required: true },
  schoolAddress: { type: String, required: true },
  year: { 
    type: String, 
    required: true,
    enum: ["Grade 11", "Grade 12"],
  },
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
  frontImage: { type: String },
  backImage: { type: String }, // path or filename
  coeImage: { type: String }, 
  voter: { type: String },   // path or filename

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: { type: String },
  resubmissionCount: { type: Number, default: 0 },
  isRead: { type: Boolean, default: false }, // <-- Add this line

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model(
  "EducationalAssistance",
  educationalAssistanceSchema
);
