const express = require('express');
const router = express.Router();
const profileController = require('../app/controllers/auth/ProfileController');
const { isAuthenticated } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middlewares/auth');
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)'));
  }
});

// Show profile (public route, no authentication required to view)
router.get('/:userId?', verifyToken, (req, res, next) => {
    // If no userId is provided and user is logged in, redirect to their profile
    if (!req.params.userId && req.user) {
        return res.redirect(`/profile/${req.user._id}`);
    }
    next();
}, profileController.showProfile);

// Show edit profile form (requires authentication)
router.get('/:userId/edit', isAuthenticated, (req, res, next) => {
    // Only allow users to edit their own profile
    if (req.params.userId !== req.user._id.toString()) {
        req.flash('error', 'Bạn không có quyền chỉnh sửa hồ sơ này');
        return res.redirect('back');
    }
    next();
}, profileController.showEditProfile);

// Update profile (requires authentication)
router.put('/:userId', 
    isAuthenticated,
    // Only allow users to update their own profile
    (req, res, next) => {
        if (req.params.userId !== req.user._id.toString()) {
            req.flash('error', 'Bạn không có quyền cập nhật hồ sơ này');
            return res.redirect('back');
        }
        next();
    },
    upload.single('avatar'),
    profileController.updateProfile
);

module.exports = router;
