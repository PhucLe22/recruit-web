const express = require('express');
const router = express.Router();
const userJobController = require('../app/controllers/users/UserJobController');
const applyController = require('../app/controllers/job/ApplyController');
const UserController = require('../app/controllers/users/UserController');
const userController = new UserController();
const { requireUserAuth } = require('../middlewares/isLogin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/avatars/';
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
  }
});

router.get('/profile', requireUserAuth, userController.showProfile.bind(userController));
router.post('/profile', requireUserAuth, userController.updateProfile.bind(userController));
router.get('/saved-jobs', requireUserAuth, userJobController.savedJobs);
router.get('/applied-jobs', requireUserAuth, userJobController.appliedJobs);
router.get('/applied-jobs/api', requireUserAuth, applyController.getUserApplications);
router.delete('/saved-jobs/:jobId', requireUserAuth, userJobController.unsaveJob);
router.post('/upload-avatar', requireUserAuth, upload.single('avatar'), userController.uploadAvatar.bind(userController));
router.get('/cv', requireUserAuth, userController.viewCV.bind(userController));

module.exports = router;
