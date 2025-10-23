// middleware/idUploadMiddleware.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const idStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // store front/back to separate subfolders
    const field = file.fieldname;
    let folder = "educational_assistance/id";
    if (field === "frontImage") folder = "educational_assistance/id/front";
    if (field === "backImage") folder = "educational_assistance/id/back";
    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      public_id: `${Date.now()}-${file.originalname
        .replace(/\s+/g, "_")
        .replace(/\.[^/.]+$/, "")}`,
    };
  },
});

const uploadIdEduc = multer({ storage: idStorage });

module.exports = uploadIdEduc;
