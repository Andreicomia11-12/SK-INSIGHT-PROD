const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinaryConfig');

const signatureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kk_signature_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => Date.now() + '-' + file.originalname.replace(/\s+/g, '_'),
  },
});

const uploadSignatureImage = multer({ storage: signatureStorage });

module.exports = uploadSignatureImage;
