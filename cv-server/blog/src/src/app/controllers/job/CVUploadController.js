const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const CV = require('../../models/CV');
const mongoose = require('mongoose');
const r2Storage = require('../../../services/r2Storage');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

class CVUploadController {
    async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).render('users/uploadCv', {
                    success: false,
                    message: 'Không có file được upload',
                });
            }

            const username = req.account?.username;
            if (!username) {
                return res.status(401).render('users/uploadCv', {
                    success: false,
                    message: 'Thiếu thông tin đăng nhập (username).',
                });
            }

            const ext = path.extname(req.file.originalname).toLowerCase();
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const r2Key = `ai-uploads/cv-${uniqueSuffix}${ext}`;

            // Upload to R2
            const fileUrl = await r2Storage.uploadFile(req.file.buffer, r2Key, req.file.mimetype);

            // Send buffer to Python AI service
            const formData = new FormData();
            formData.append('username', username);
            formData.append('user_id', req.account._id);
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });

            let response;
            try {
                const aiServiceUrl = `${AI_SERVICE_URL}/api/v1/resume/upload`;
                response = await axios.post(aiServiceUrl, formData, {
                    headers: formData.getHeaders(),
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    timeout: 60000,
                });
            } catch (error) {
                if (error.response) {
                    const errorMessage = error.response.data?.detail ||
                        error.response.data?.message ||
                        'Lỗi khi xử lý CV. Vui lòng thử lại sau.';
                    throw new Error(`Lỗi từ hệ thống AI: ${errorMessage}`);
                } else if (error.request) {
                    throw new Error('Không nhận được phản hồi từ hệ thống AI. Vui lòng kiểm tra kết nối và thử lại.');
                } else {
                    throw new Error(`Lỗi khi gửi yêu cầu: ${error.message}`);
                }
            }

            // Get processed data from Python API
            let fetchData;
            try {
                const resumeUrl = `${AI_SERVICE_URL}/api/v1/resume/${username}`;
                fetchData = await axios.get(resumeUrl, { timeout: 30000 });
            } catch (error) {
                fetchData = { data: {} };
            }

            req.session.resumeData = fetchData.data || {};

            // Save CV to database
            const userId = mongoose.Types.ObjectId(req.account._id);
            const cvData = {
                user_id: userId,
                username: username,
                saved: true,
                message: 'CV uploaded successfully',
                uploaded_at: new Date(),
                file_path: fileUrl,
                ...(fetchData.data.parsed_output && { parsed_output: fetchData.data.parsed_output }),
                ...(fetchData.data.message && { message: fetchData.data.message }),
                ...(fetchData.data.processed_text && { processed_text: fetchData.data.processed_text }),
                ...(response.data.filename && { filename: response.data.filename }),
            };

            try {
                let cv = await CV.findOne({ user_id: userId });

                if (cv) {
                    Object.assign(cv, cvData);
                    await cv.save();
                } else {
                    const existingCV = await CV.findOne({ username });
                    if (existingCV) {
                        return res.status(400).render('users/uploadCv', {
                            success: false,
                            message: 'This username is already associated with another CV. Please use a different username.',
                        });
                    }
                    cv = await CV.create(cvData);
                }
            } catch (error) {
                if (error.code === 11000) {
                    return res.status(400).render('users/uploadCv', {
                        success: false,
                        message: 'This username is already taken. Please try a different username.',
                    });
                }
                throw error;
            }

            return res.render('users/uploadCv', {
                success: true,
                message: response.data?.message || 'Upload thành công',
                user: username,
                resumeData: fetchData.data || {},
            });
        } catch (error) {
            console.error('❌ Lỗi khi xử lý upload:', error.message);

            return res.status(500).render('users/uploadCv', {
                success: false,
                message: 'Lỗi khi gọi Python service',
                error: error.response?.data || error.message,
            });
        }
    }

    async getJobSuggestions(req, res) {
        try {
            const username = req.account?.username;
            if (!username) {
                return res.status(400).render('users/uploadCv', {
                    success: false,
                    message: 'Thiếu username để gợi ý việc làm',
                });
            }

            const jobSuggestionUrl = `${AI_SERVICE_URL}/api/v1/jobs/suggestion/${username}`;

            const response = await axios.get(jobSuggestionUrl, {
                timeout: 20000,
            });

            req.session.resumeData = response.data || {};

            return res.render('users/uploadCv', {
                success: true,
                user: username,
                jobSuggestions: response.data || [],
            });
        } catch (error) {
            console.error('❌ Lỗi gọi job suggestion:', error.message);
            return res.status(500).render('users/uploadCv', {
                success: false,
                message: 'Gọi Python service thất bại',
                error: error.response?.data || error.message,
            });
        }
    }
}

module.exports = new CVUploadController();
