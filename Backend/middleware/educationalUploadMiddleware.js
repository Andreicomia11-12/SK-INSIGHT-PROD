const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "educational_assistance";
    
    // Handle different field names for COE
    if (file.fieldname === "frontImage") {
      folder = "educational_assistance/id/front";
    } else if (file.fieldname === "backImage") {
      folder = "educational_assistance/id/back";
    } else if (file.fieldname === "coeImage" || file.fieldname === "coe") {
      folder = "educational_assistance/coe";
    } else if (file.fieldname === "voter" || file.fieldname === "voterImage") {
      folder = "educational_assistance/parent_voter_cert";
    }

    console.log(`Uploading file: ${file.fieldname} to folder: ${folder}`);

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      public_id: `${Date.now()}-${file.originalname
        .replace(/\s+/g, "_")
        .replace(/\.[^/.]+$/, "")}`,
    };
  },
});

const uploadEducational = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    console.log(`Processing file: ${file.fieldname}, originalname: ${file.originalname}`);
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

module.exports = uploadEducational;
