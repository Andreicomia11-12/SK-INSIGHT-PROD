// middleware/voterCertUploadMiddleware.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const votersStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // You can add more logic if you have multiple voter cert types
    let folder = "educational_assistance/parent_voter_cert";
    // Example: if you want to separate by parent name, you could use req.body.parentName
    // if (req.body.parentName) folder += `/${req.body.parentName}`;
    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_").replace(/\.[^/.]+$/, "")}`,
    };
  },
});

const uploadVoterCert = multer({ storage: votersStorage });

module.exports = uploadVoterCert;
