const { multipleMongooseToObject } = require('../../util/mongoose');
const Job = require('../models/Job');
const JobField = require('../../app/models/JobField');
const { formatDate } = require('../../middlewares/formatDate');
const RecommendationEngine = require('../../services/RecommendationEngine');
const UserBehaviorService = require('../../services/UserBehaviorService');

class HomeControllerEnhanced {
    async index(req, res, next) {
        try {
            const now = new Date();
            let nowCount = 0;
            let twoDaysCount = 0;
            
            // Only load valid jobs with limit for initial page load
            const validJobsQuery = { expiryTime: { $gte: now } };
            const jobs = await Job.find(validJobsQuery)
                .select('title companyName city type salary slug logoPath businessId createdAt expiryTime updatedAt field jobField')
                .populate('businessId', 'companyName logo')
                .lean()
                .sort({ createdAt: -1 })
                .limit(50); // Limit to 50 most recent jobs for initial load
            
            const jobFields = await JobField.find({});

            // Tính số lượng job thực tế cho từng ngành nghề
            const jobFieldCounters = {};

            // Khởi tạo counters cho tất cả job fields
            jobFields.forEach((field) => {
                jobFieldCounters[field._id.toString()] = 0;
            });

            // Helper function để format relative time cho createdAt
            const formatRelativeTime = (date) => {
                if (!date) return '';
                const past = new Date(date);
                const diffMs = now - past;

                const diffSeconds = Math.floor(diffMs / 1000);
                const diffMinutes = Math.floor(diffSeconds / 60);
                const diffHours = Math.floor(diffMinutes / 60);
                const diffDays = Math.floor(diffHours / 24);
                const diffWeeks = Math.floor(diffDays / 7);

                if (diffHours < 1) return 'now';
                if (diffHours < 24) return `${diffHours}h`;
                if (diffDays < 7) return `${diffDays}d`;
                if (diffWeeks < 2) return `${diffWeeks}w`;

                // Quá 1 tuần → hiển thị ngày đăng
                const day = String(past.getDate()).padStart(2, '0');
                const month = String(past.getMonth() + 1).padStart(2, '0');
                const year = past.getFullYear();
                return `${day}/${month}/${year}`;
            };

            // Process jobs (already filtered and limited from database)
            const validJobs = [];
            for (let job of jobs) {
                const createdAt = new Date(job.createdAt);

                // Tính số ngày chênh lệch cho thống kê
                const diffTime = now - createdAt;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0) nowCount++;
                if (diffDays === 2) twoDaysCount++;

                // Format job for frontend
                const formattedJob = {
                    ...job,
                    companyName: job.businessId?.companyName || job.companyName || 'Công ty',
                    companyLogo: job.logoPath || job.businessId?.logo || null,
                    createdAt: formatRelativeTime(job.createdAt),
                    expiryTime: formatDate(job.expiryTime),
                    updatedAt: job.updatedAt ? formatDate(job.updatedAt) : null,
                };

                validJobs.push(formattedJob);

                // Tăng counter cho ngành nghề tương ứng
                const jobField = job.field || job.jobField;
                if (jobField) {
                    const jobFieldLower = jobField.toLowerCase();
                    const matchedField = jobFields.find((field) => {
                        const fieldNameLower = field.name.toLowerCase();
                        return (
                            fieldNameLower === jobFieldLower ||
                            jobFieldLower.includes(fieldNameLower) ||
                            fieldNameLower.includes(jobFieldLower)
                        );
                    });
                    if (matchedField) {
                        jobFieldCounters[matchedField._id.toString()]++;
                    }
                }
            }

            // Get jobs for each field from already loaded jobs
            const jobFieldsWithJobs = [];
            
            for (const field of jobFields) {
                // Filter jobs from already loaded data
                const fieldJobs = validJobs.filter(job => {
                    const jobField = job.field || job.jobField;
                    if (!jobField) return false;
                    const jobFieldLower = jobField.toLowerCase();
                    const fieldNameLower = field.name.toLowerCase();
                    return (
                        fieldNameLower === jobFieldLower ||
                        jobFieldLower.includes(fieldNameLower) ||
                        fieldNameLower.includes(jobFieldLower)
                    );
                }).slice(0, 6); // Limit to 6 jobs per field

                jobFieldsWithJobs.push({
                    ...field.toObject(),
                    jobCount: jobFieldCounters[field._id.toString()] || 0,
                    jobs: fieldJobs
                });
            }

            // Sắp xếp các ngành nghề theo số lượng công việc giảm dần
            const updatedJobFields = jobFieldsWithJobs.sort((a, b) => b.jobCount - a.jobCount);

            // Enhanced user behavior-based job recommendations
            let recommendedJobs = [];
            let personalized = false;
            let userProfile = null;

            if (req.account) {
                try {
                    // Get user profile from behavior analysis
                    userProfile = await UserBehaviorService.analyzeUserBehavior(
                        req.account.id,
                    );

                    // Get personalized recommendations
                    const recommendations =
                        await RecommendationEngine.getRecommendations(
                            req.account.id,
                            {
                                limit: 12,
                                exclude: validJobs.map((job) =>
                                    job._id.toString(),
                                ),
                            },
                        );

                    if (recommendations && recommendations.length > 0) {
                        recommendedJobs = recommendations;
                        personalized = true;
                    }
                } catch (error) {
                    console.error('Error getting user recommendations:', error);
                    // Fallback to behavior-based job matching
                    recommendedJobs = await this.getBehaviorBasedJobs(
                        userProfile,
                        validJobs,
                    );
                }
            }

            // Fallback to popular jobs if no personalized recommendations
            if (recommendedJobs.length === 0) {
                recommendedJobs = await RecommendationEngine.getPopularJobs(12);
                personalized = false;
            }

            // Format recommended jobs for display
            const formattedRecommendations = recommendedJobs.map((job) => ({
                ...job,
                companyName:
                    job.businessId?.companyName || job.companyName || 'Công ty',
                companyLogo: job.logoPath || job.businessId?.logo || null,
                createdAt: job.createdAt
                    ? HomeControllerEnhanced.formatRelativeTime(job.createdAt)
                    : 'now',
                matchScore:
                    job.recommendationScore ||
                    Math.floor(Math.random() * 30) + 70, // 70-100 for fallback
                matchReason:
                    job.recommendationReasons?.[0] ||
                    'Phù hợp với hồ sơ của bạn',
                isPersonalized: personalized,
            }));
            // return res.json(formattedRecommendations)

            // Sort all jobs by match score for logged-in users
            let displayJobs = validJobs;
            if (req.account && recommendedJobs.length > 0) {
                // Combine and sort by match score
                displayJobs = [
                    ...formattedRecommendations.map((job) => ({
                        ...job,
                        isRecommended: true,
                    })),
                    ...validJobs.map((job) => ({
                        ...job,
                        matchScore: 50,
                        matchReason: 'Việc làm mới',
                        isRecommended: false,
                    })),
                ].sort(
                    (a, b) =>
                        (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) ||
                        b.matchScore - a.matchScore,
                );
            }
            

            res.status(200).render('home', {
                validJobs: displayJobs.slice(0, 12), // Show top 12 jobs with recommendations first
                jobFields: updatedJobFields.slice(0, 10), // Show top 10 job fields
                nowCount,
                twoDaysCount,
                recommendations: formattedRecommendations.slice(0, 6), // Top 6 recommendations
                personalized,
                userProfile,
                user: req.account || null,
                isLogin: !!req.account,
                totalJobs: validJobs.length,
                recommendedCount: formattedRecommendations.length,
            });
        } catch (error) {
            next(error);
        }
    }

    // Helper method to get behavior-based jobs as fallback
    async getBehaviorBasedJobs(userProfile, validJobs) {
        if (!userProfile || !userProfile.interests) {
            return validJobs.slice(0, 12).map((job) => ({
                ...job,
                recommendationScore: 60,
                recommendationReasons: ['Jobs gần đây'],
                recommendationType: 'fallback',
            }));
        }

        // Sort valid jobs based on user interests
        return validJobs
            .map((job) => {
                let score = 60; // base score
                const jobText =
                    `${job.title} ${job.description || ''}`.toLowerCase();

                // Boost score based on interests
                Object.entries(userProfile.interests).forEach(
                    ([interest, weight]) => {
                        if (jobText.includes(interest.toLowerCase())) {
                            score += weight * 5;
                        }
                    },
                );

                return {
                    ...job,
                    recommendationScore: Math.min(score, 100),
                    recommendationReasons: ['Phù hợp với tìm kiếm của bạn'],
                    recommendationType: 'behavior',
                };
            })
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, 12);
    }

    cvAssistant(req, res) {
        // Pass user data to the view if logged in
        res.status(200).render('cv-assistant', {
            user: req.account || null,
            isLogin: !!req.account,
        });
    }

    static formatRelativeTime(date) {
        if (!date) return '';
        const past = new Date(date);
        const diffMs = new Date() - past;

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffHours < 1) return 'vừa xong';
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        if (diffWeeks < 4) return `${diffWeeks} tuần trước`;

        const day = String(past.getDate()).padStart(2, '0');
        const month = String(past.getMonth() + 1).padStart(2, '0');
        const year = past.getFullYear();
        return `${day}/${month}/${year}`;
    }

    static formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
}

module.exports = new HomeControllerEnhanced();
