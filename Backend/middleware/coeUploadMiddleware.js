// middleware/coeUploadMiddleware.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const coeStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // You can add more logic if you have multiple COE types
    let folder = "educational_assistance/coe";
    // Example: if you want to separate by school, you could use req.body.schoolName
    // if (req.body.schoolName) folder += `/${req.body.schoolName}`;
    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_").replace(/\.[^/.]+$/, "")}`,
    };
  },
});

const uploadCOE = multer({ storage: coeStorage });

module.exports = uploadCOE;
