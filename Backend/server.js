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
const http = require("http");
const socketio = require("socket.io");
const multer = require("multer");

// New imports for docx generation
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: "*" },
});

// Middleware
app.use(cors());
app.use(express.json()); // for JSON bodies
app.use(express.urlencoded({ extended: true })); // for form-data and urlencoded

app.use(express.static(path.join(__dirname, "../Frontend")));

// Serve everything inside uploads/
app.use('/', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kkprofiling", require("./routes/kkProfileRoutes"));
app.use("/api/formstatus", require("./routes/formStatusRoutes"));
app.use("/api/lgbtqprofiling", lgbtqRoutes);
app.use("/api/educational-assistance", educationalRoutes);
app.use("/api/announcements", AnnouncementRoutes);
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use(express.static("public"));
app.use("/api/formcycle", require("./routes/formCycleRoutes"));
app.use("/api/kkprofile", require("./routes/kkProfileRoutes"));


const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, "0.0.0.0", () => {
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

// Make io available in controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);
  // You can add authentication here if needed
});

// Serve uploaded images
app.use("/uploads/lgbtq_id_images", express.static(path.join(__dirname, "uploads/lgbtq_id_images")));

// Serve profile_images at /profile_images
app.use('/profile_images', express.static(path.join(__dirname, 'uploads/profile_images')));

// Serve signatures at /signatures
app.use('/signatures', express.static(path.join(__dirname, 'uploads/signatures')));

// ---------------------------
// Example Generate DOCX Route (for testing only)
// ---------------------------
function getImageBuffer(filePath) {
  return fs.readFileSync(filePath);
}

app.post("/api/generate-docx", (req, res) => {
  try {
    const data = req.body;

    const content = fs.readFileSync(
      path.resolve(__dirname, "kk_profiling_template.docx"),
      "binary"
    );

    const zip = new PizZip(content);

    const imageOpts = {
      centered: false,
      getImage: function (tagValue) {
        return getImageBuffer(tagValue);
      },
      getSize: function () {
        return [150, 80];
      },
    };

    const doc = new Docxtemplater(zip, {
      modules: [new ImageModule(imageOpts)],
    });

    const templateData = {
      fullName: data.fullName,
      age: data.age,
      address: data.address,

      singleCheckbox: data.civilStatus === "Single" ? "☑" : "☐",
      marriedCheckbox: data.civilStatus === "Married" ? "☑" : "☐",
      widowedCheckbox: data.civilStatus === "Widowed" ? "☑" : "☐",
      separatedCheckbox: data.civilStatus === "Separated" ? "☑" : "☐",

      employedCheckbox: data.workStatus === "Employed" ? "☑" : "☐",
      unemployedCheckbox: data.workStatus === "Unemployed" ? "☑" : "☐",
      studentCheckbox: data.workStatus === "Student" ? "☑" : "☐",

      idImage: path.resolve(__dirname, "uploads", data.idImageFile),
      signatureImage: path.resolve(__dirname, "uploads", data.signatureFile),
    };

    doc.render(templateData);

    const buffer = doc.getZip().generate({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=kk_profiling_output.docx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buffer);
  } catch (err) {
    console.error("Error generating document:", err);
    res.status(500).send("Failed to generate document");
  }
});

// ---------------------------
// Error handlers
// ---------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image files are allowed!') {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ success: false, error: 'Server error' });
});

const autoDeleteKKProfiles = require("./utils/autoDeleteKKProfiles");
setInterval(autoDeleteKKProfiles, 24 * 60 * 60 * 1000); // Run every 24 hours
const autoDeleteLGBTQProfiles = require("./utils/autoDeleteLGBTQProfiles");
setInterval(autoDeleteLGBTQProfiles, 24 * 60 * 60 * 1000); // Run every 24 hours

app.use('/uploads/id', express.static(path.join(__dirname, 'uploads/id')));
app.use('/uploads/signatures', express.static(path.join(__dirname, 'uploads/signatures')));

console.log('Server started');
