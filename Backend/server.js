const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const lgbtqRoutes = require("./routes/lgbtqProfileRoutes");
const educationalRoutes = require("./routes/educationalAssistanceRoutes");
const AnnouncementRoutes = require("./routes/announcementRoutes");
const path = require("path");
const Announcement = require("./models/Announcement");

require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../Frontend")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kkprofiling", require("./routes/kkProfileRoutes"));
app.use("/api/formstatus", require("./routes/formStatusRoutes"));
app.use("/api/lgbtqprofiling", lgbtqRoutes);
app.use("/api/educational-assistance", educationalRoutes);
app.use("/api/announcements", AnnouncementRoutes);

app.use(express.static("public"));
app.use("/api/formcycle", require("./routes/formCycleRoutes"));

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
