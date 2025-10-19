const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/lgbtq_id_images"));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image files are allowed!"));
  } else {
    cb(null, true);
  }
};

const upload = multer({ storage, fileFilter });
module.exports = upload;