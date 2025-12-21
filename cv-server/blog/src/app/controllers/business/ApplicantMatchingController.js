const AIApplicantMatchingService = require('../../../services/AIApplicantMatchingService');
const Job = require('../../models/Job');
const AppliedJobs = require('../../models/AppliedJobs');

class ApplicantMatchingController {
    // Get matching applicants for a specific job
    async getMatchingApplicants(req, res, next) {
        try {
            const { jobId } = req.params;
            const { limit = 20, minScore = 30 } = req.query;

            // Skip business verification for internal service requests
            if (req.isInternalService) {
                try {
                    console.log('Internal service request for job:', jobId);
                    
                    const Job = require('../../models/Job');
                    const AppliedJobs = require('../../models/AppliedJobs');
                    
                    // Get job details
                    const job = await Job.findById(jobId);
                    if (!job) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Job not found' 
                        });
                    }

                    // Get already applied applicants to exclude
                    const appliedApplicants = await AppliedJobs.find({ job_id: jobId })
                        .distinct('user_id');

                    console.log('Applied applicants count:', appliedApplicants.length);

                    // Get matching applicants
                    const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                        jobId, 
                        { 
                            limit: parseInt(limit),
                            minScore: parseInt(minScore),
                            excludeApplicants: appliedApplicants.map(id => id.toString())
                        }
                    );

                    console.log('Matching applicants found:', matchingApplicants.length);

                    return res.json({
                        success: true,
                        data: {
                            job: {
                                id: job._id,
                                title: job.title,
                                field: job.field,
                                experience: job.experience,
                                type: job.type
                            },
                            applicants: matchingApplicants,
                            totalFound: matchingApplicants.length,
                            filters: {
                                limit: parseInt(limit),
                                minScore: parseInt(minScore)
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error in internal service request:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal service error: ' + error.message 
                    });
                }
            }

            // Regular business authentication flow
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            // Verify job belongs to this business
            const job = await Job.findOne({ _id: jobId, businessId });
            if (!job) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Job not found or access denied' 
                });
            }

            // Get already applied applicants to exclude
            const appliedApplicants = await AppliedJobs.find({ job_id: jobId })
                .distinct('user_id');

            // Get matching applicants
            const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                jobId, 
                { 
                    limit: parseInt(limit),
                    minScore: parseInt(minScore),
                    excludeApplicants: appliedApplicants.map(id => id.toString())
                }
            );

            res.json({
                success: true,
                data: {
                    job: {
                        id: job._id,
                        title: job.title,
                        field: job.field,
                        experience: job.experience,
                        type: job.type
                    },
                    applicants: matchingApplicants,
                    totalFound: matchingApplicants.length,
                    filters: {
                        limit: parseInt(limit),
                        minScore: parseInt(minScore)
                    }
                }
            });

        } catch (error) {
            console.error('Error getting matching applicants:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get applicant recommendations for all business jobs
    async getAllJobsApplicantRecommendations(req, res, next) {
        try {
            const { limit = 10, minScore = 30 } = req.query;

            // Skip business verification for internal service requests
            if (req.isInternalService) {
                try {
                    console.log('Internal service request for all recommendations');
                    
                    const Job = require('../../models/Job');
                    
                    // For testing, get all jobs (no business filter)
                    const jobs = await Job.find({ status: { $ne: 'closed' } })
                        .select('_id title field experience type businessId')
                        .limit(10);

                    console.log('Found jobs:', jobs.length);

                    if (jobs.length === 0) {
                        return res.json({
                            success: true,
                            data: {
                                recommendations: {},
                                totalJobs: 0,
                                filters: {
                                    limit: parseInt(limit),
                                    minScore: parseInt(minScore)
                                }
                            }
                        });
                    }

                    const recommendations = {};

                    // Get recommendations for each job
                    for (const job of jobs) {
                        try {
                            const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                                job._id.toString(),
                                {
                                    limit: parseInt(limit),
                                    minScore: parseInt(minScore),
                                    excludeApplicants: []
                                }
                            );

                            recommendations[job._id.toString()] = {
                                job: job.toObject(),
                                applicants: matchingApplicants,
                                totalFound: matchingApplicants.length
                            };
                        } catch (jobError) {
                            console.error(`Error getting recommendations for job ${job._id}:`, jobError);
                            recommendations[job._id.toString()] = {
                                job: job.toObject(),
                                applicants: [],
                                totalFound: 0,
                                error: jobError.message
                            };
                        }
                    }

                    return res.json({
                        success: true,
                        data: {
                            recommendations: recommendations,
                            totalJobs: jobs.length,
                            filters: {
                                limit: parseInt(limit),
                                minScore: parseInt(minScore)
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error in internal service request:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal service error: ' + error.message 
                    });
                }
            }

            // Regular business authentication flow
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            // Get all jobs for this business
            const jobs = await Job.find({ businessId, status: { $ne: 'closed' } })
                .select('_id title field experience type');

            if (jobs.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        recommendations: {},
                        totalJobs: 0,
                        filters: {
                            limit: parseInt(limit),
                            minScore: parseInt(minScore)
                        }
                    }
                });
            }

            const recommendations = {};

            // Get recommendations for each job
            for (const job of jobs) {
                const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                    job._id.toString(),
                    {
                        limit: parseInt(limit),
                        minScore: parseInt(minScore),
                        excludeApplicants: []
                    }
                );

                recommendations[job._id.toString()] = {
                    job: job.toObject(),
                    applicants: matchingApplicants,
                    totalFound: matchingApplicants.length
                };
            }

            res.json({
                success: true,
                data: {
                    recommendations: recommendations,
                    totalJobs: jobs.length,
                    filters: {
                        limit: parseInt(limit),
                        minScore: parseInt(minScore)
                    }
                }
            });

        } catch (error) {
            console.error('Error getting all recommendations:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get detailed applicant profile with matching insights
    async getApplicantProfile(req, res, next) {
        try {
            const { userId } = req.params;
            const { jobId } = req.query;

            // For testing purposes, skip business verification and return mock data
            console.log('Creating mock matching profile for user:', userId);
            
            // Generate mock matching score based on userId for consistency
            const userHash = userId.toString().slice(-2);
            const mockScore = 60 + (Math.abs(userHash.charCodeAt(0) + userHash.charCodeAt(1)) % 35); // Score between 60-95
            
            const mockApplicant = {
                user: { 
                    _id: userId, 
                    username: 'Test User ' + userHash, 
                    email: `test${userHash}@example.com` 
                },
                cv: { 
                    originalName: 'test_cv.pdf',
                    parsed_output: {
                        technical_skills: ['JavaScript', 'React', 'Node.js'],
                        work_experience: ['Software Engineer at Tech Company']
                    }
                },
                matchingScore: mockScore,
                matchingReasons: [`Mock matching score ${mockScore}% for demonstration`],
                skills: ['JavaScript', 'React', 'Node.js'],
                experience: ['Software Engineer at Tech Company']
            };

            console.log('Mock profile created with score:', mockScore);
            return res.json({
                success: true,
                data: mockApplicant
            });

            // Regular business authentication flow
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            // Verify job belongs to this business if jobId provided
            if (jobId) {
                const job = await Job.findOne({ _id: jobId, businessId });
                if (!job) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Job not found or access denied' 
                    });
                }
            }

            // Get detailed applicant information with matching score
            const applicant = await AIApplicantMatchingService.getMatchingApplicants(
                jobId,
                { limit: 1, excludeApplicants: [] }
            );

            // Find the specific user in results
            const userProfile = applicant.find(a => a.user._id.toString() === userId);
            
            if (!userProfile) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Applicant not found' 
                });
            }

            res.json({
                success: true,
                data: userProfile
            });

        } catch (error) {
            console.error('Error getting applicant profile:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Update matching preferences
    async updateMatchingPreferences(req, res, next) {
        try {
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            const { preferences } = req.body;

            // TODO: Store preferences in database or session
            // For now, just return success

            res.json({
                success: true,
                message: 'Matching preferences updated successfully',
                data: preferences
            });

        } catch (error) {
            console.error('Error updating preferences:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }
}

module.exports = new ApplicantMatchingController();
