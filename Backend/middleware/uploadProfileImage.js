const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'profileImage') {
      cb(null, path.join(__dirname, '../uploads/profile_images'));
    } else if (file.fieldname === 'signatureImage') {
      cb(null, path.join(__dirname, '../uploads/signatures'));
    } else if (file.fieldname === 'idImage') {
      cb(null, path.join(__dirname, '../uploads/id_images'));
    } else {
      cb(null, path.join(__dirname, '../uploads/other'));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

module.exports = upload;
