const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userControllers');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/idUploadMiddleware');
const path = require('path');
const fs = require('fs');

router.post(
  "/smart/register",
  upload.single('idImage'),                 
  userCtrl.smartRegister
);

router.post('/', userCtrl.createUser); // Fallback/manual creation (optional)
router.post('/verify/send', userCtrl.sendVerificationOtp);
router.post('/verify/confirm', userCtrl.verifyEmailOtp);

// 📌 Authenticated User Route
router.get('/me', protect, userCtrl.getCurrentUser);

// 📌 Admin-only Routes
router.get('/', protect, authorizeRoles('admin'), userCtrl.getUsers);
router.get('/:id', protect, authorizeRoles('admin'), userCtrl.getUserById);
router.put('/:id', protect, authorizeRoles('admin'), userCtrl.updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), userCtrl.deleteUser);

router.get('/profile-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/profile_images', filename);

  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ error: 'Image not found' });
    res.sendFile(imagePath);
  });
});

module.exports = router;
