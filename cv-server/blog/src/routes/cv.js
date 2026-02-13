const express = require('express');
const router = express.Router();
const { upload } = require('../config/multer');
const { requireAuth } = require('../middlewares/isLogin');
const cvUploadController = require('../app/controllers/job/CVUploadController');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const r2Storage = require('../services/r2Storage');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

router.get('/', (req, res) => {
    res.json({ message: 'CV Upload API is running' });
});

router.get('/uploadCV', requireAuth, async (req, res) => {
    const CV = require('../app/models/CV');
    let existingCV = null;
    try {
        existingCV = await CV.findOne({ username: req.account?.username });
    } catch (e) {}
    res.render('users/uploadCv', {
        user: req.account?.username || '',
        existingCV: existingCV || null,
        resumeData: req.session.resumeData || {},
    });
});

router.post(
    '/upload',
    requireAuth,
    upload.single('file'),
    cvUploadController.upload,
);

router.get(
    '/jobs/suggestions/:username',
    requireAuth,
    cvUploadController.getJobSuggestions,
);

// CV Assistant Upload Endpoint
router.post('/assistant-upload',
    requireAuth,
    (req, res, next) => {
        upload.single('resume')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Có lỗi xảy ra khi xử lý file.'
                });
            }
            next();
        });
    },
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file CV để tải lên.'
            });
        }

        try {
            if (!req.account?.id) {
                throw new Error('Vui lòng đăng nhập để tải lên CV');
            }

            const { id: userId, username } = req.account;

            // Upload to R2
            const ext = path.extname(req.file.originalname).toLowerCase();
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const r2Key = `ai-uploads/cv-${uniqueSuffix}${ext}`;
            const fileUrl = await r2Storage.uploadFile(req.file.buffer, r2Key, req.file.mimetype);

            // Send buffer to AI service
            const formData = new FormData();
            formData.append('resume', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
            formData.append('username', username);
            formData.append('user_id', userId);

            const aiAgentUrl = `${AI_SERVICE_URL}/api/v1/resume/upload`;

            let aiData;
            try {
                const response = await axios.post(aiAgentUrl, formData, {
                    headers: formData.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 300000,
                    params: { model_name: 'gemini-2.0-flash' },
                });

                aiData = response.data;

                if (!aiData) {
                    throw new Error('Không nhận được dữ liệu từ hệ thống AI. Vui lòng thử lại.');
                }
            } catch (error) {
                let errorMessage = 'Lỗi khi xử lý CV. Vui lòng thử lại sau.';

                if (error.response) {
                    errorMessage = error.response.data?.message ||
                        error.response.data?.detail ||
                        `Lỗi từ hệ thống AI (${error.response.status})`;
                } else if (error.request) {
                    errorMessage = 'Không nhận được phản hồi từ hệ thống AI. Vui lòng kiểm tra kết nối và thử lại.';
                } else if (error.code === 'ECONNABORTED') {
                    errorMessage = 'Hệ thống xử lý quá lâu. Vui lòng thử lại với file nhỏ hơn.';
                } else if (error.code === 'ENOTFOUND') {
                    errorMessage = 'Không thể kết nối đến hệ thống AI. Vui lòng thử lại sau.';
                }

                return res.status(500).json({
                    success: false,
                    message: errorMessage,
                });
            }

            // Save to database
            const CV = require('../app/models/CV');

            const updateData = {
                user_id: userId,
                username: username,
                saved: true,
                message: aiData.message || 'CV processed successfully',
                uploaded_at: new Date(),
                file_path: fileUrl,
                ...(aiData.parsed_output && { parsed_output: aiData.parsed_output }),
                ...(aiData.processed_text && { processed_text: aiData.processed_text })
            };

            const cv = await CV.findOneAndUpdate(
                { user_id: userId },
                { $set: updateData },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );

            return res.json({
                success: true,
                message: 'CV đã được tải lên và xử lý thành công!',
                data: {
                    cvId: cv._id,
                    ...aiData
                }
            });
        } catch (error) {
            console.error('❌ CV upload error:', error.message);

            return res.status(500).json({
                success: false,
                message: error.message || 'Đã xảy ra lỗi khi xử lý CV',
            });
        }
    }
);

module.exports = router;
