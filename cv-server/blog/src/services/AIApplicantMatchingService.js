const mongoose = require('mongoose');
const Job = require('../app/models/Job');
const User = require('../app/models/User');
const CV = require('../app/models/CV');
const AppliedJobs = require('../app/models/AppliedJobs');
// const { createEmbedding } = require('../util/createEmbedding');

class AIApplicantMatchingService {
  // Get matching applicants for a specific job
  static async getMatchingApplicants(jobId, options = {}) {
    try {
      const { limit = 20, minScore = 30, excludeApplicants = [] } = options;
      
      // Get job details
      const job = await Job.findById(jobId).populate('businessId');
      if (!job) {
        throw new Error('Job not found');
      }

      // Get all CVs with parsed data
      const cvs = await CV.find({ 
        'parsed_output.0': { $exists: true }, // Has parsed data
        username: { $nin: excludeApplicants }
      }).populate('user_id');

      // Calculate matching scores
      const scoredApplicants = await Promise.all(
        cvs.map(async (cv) => {
          const score = await this.calculateMatchingScore(job, cv);
          return {
            user: cv.user_id,
            cv: cv,
            matchingScore: score,
            matchingReasons: this.getMatchingReasons(job, cv, score)
          };
        })
      );

      // Filter and sort by score
      return scoredApplicants
        .filter(applicant => applicant.matchingScore >= minScore)
        .sort((a, b) => b.matchingScore - a.matchingScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting matching applicants:', error);
      return [];
    }
  }

  // Calculate matching score between job and CV
  static async calculateMatchingScore(job, cv) {
    let score = 0;
    const parsed = cv.parsed_output || {};

    // 1. Skills matching (40% weight)
    const jobSkills = this.extractJobSkills(job);
    const cvSkills = this.extractCVSkills(parsed);
    const skillsMatch = this.calculateSkillsMatch(jobSkills, cvSkills);
    score += skillsMatch * 0.4;

    // 2. Experience level matching (20% weight)
    const experienceMatch = this.calculateExperienceMatch(job.experience, parsed);
    score += experienceMatch * 0.2;

    // 3. Education/degree matching (15% weight)
    const educationMatch = this.calculateEducationMatch(job.degree, parsed);
    score += educationMatch * 0.15;

    // 4. Field/industry matching (15% weight)
    const fieldMatch = this.calculateFieldMatch(job.field, parsed);
    score += fieldMatch * 0.15;

    // 5. Job title matching (10% weight)
    const titleMatch = this.calculateTitleMatch(job.title, parsed);
    score += titleMatch * 0.1;

    return Math.min(Math.round(score * 100), 100);
  }

  // Extract skills from job description
  static extractJobSkills(job) {
    const jobText = `${job.title} ${job.description || ''} ${job.technique || ''}`.toLowerCase();
    const skills = [];
    
    // Common technical skills keywords
    const techKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue',
      'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql', 'docker',
      'aws', 'azure', 'git', 'agile', 'scrum', 'rest api', 'graphql',
      'machine learning', 'ai', 'data analysis', 'excel', 'powerpoint'
    ];
    
    techKeywords.forEach(skill => {
      if (jobText.includes(skill)) {
        skills.push(skill);
      }
    });
    
    return skills;
  }

  // Extract skills from CV parsed data
  static extractCVSkills(parsed) {
    const skills = new Set();
    
    // From technical skills
    if (parsed.skills && parsed.skills.technical) {
      parsed.skills.technical.forEach(skill => skills.add(skill.toLowerCase()));
    }
    
    // From work experience
    if (parsed.work_experience) {
      parsed.work_experience.forEach(exp => {
        if (exp.description) {
          const desc = exp.description.toLowerCase();
          // Extract common skills from experience descriptions
          const techKeywords = [
            'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue',
            'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql', 'docker',
            'aws', 'azure', 'git', 'agile', 'scrum', 'rest api', 'graphql'
          ];
          techKeywords.forEach(skill => {
            if (desc.includes(skill)) {
              skills.add(skill);
            }
          });
        }
      });
    }
    
    return Array.from(skills);
  }

  // Calculate skills matching percentage
  static calculateSkillsMatch(jobSkills, cvSkills) {
    if (jobSkills.length === 0) return 0.5; // Default if no skills specified
    
    const matches = jobSkills.filter(skill => 
      cvSkills.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
    );
    
    return matches.length / jobSkills.length;
  }

  // Calculate experience level matching
  static calculateExperienceMatch(jobExperience, parsed) {
    const experienceLevels = {
      'no required': 0,
      'intern': 1,
      'fresher': 2, 
      'junior': 3,
      'mid-level': 4,
      'senior': 5,
      'lead': 6,
      'manager': 7
    };

    const jobLevel = experienceLevels[jobExperience?.toLowerCase()] || 0;
    
    // Extract years of experience from CV
    let totalExperience = 0;
    if (parsed.work_experience) {
      parsed.work_experience.forEach(exp => {
        if (exp.duration) {
          // Extract years from duration string (e.g., "2 years", "18 months")
          const years = parseFloat(exp.duration.match(/[\d.]+/)?.[0] || 0);
          totalExperience += years;
        }
      });
    }

    // Map years to experience levels
    let cvLevel = 0;
    if (totalExperience < 1) cvLevel = 1; // Intern
    else if (totalExperience < 2) cvLevel = 2; // Fresher
    else if (totalExperience < 3) cvLevel = 3; // Junior
    else if (totalExperience < 5) cvLevel = 4; // Mid-level
    else if (totalExperience < 7) cvLevel = 5; // Senior
    else if (totalExperience < 10) cvLevel = 6; // Lead
    else cvLevel = 7; // Manager

    // Calculate match score
    if (jobLevel === 0) return 1; // No experience required
    if (cvLevel >= jobLevel) return 1; // Meets or exceeds requirement
    
    // Partial match if close
    const diff = jobLevel - cvLevel;
    return Math.max(0, 1 - (diff * 0.2));
  }

  // Calculate education matching
  static calculateEducationMatch(jobDegree, parsed) {
    if (!jobDegree || jobDegree === 'no required') return 1;

    const educationLevels = {
      'high school': 1,
      'associate': 2,
      'bachelor': 3,
      'master': 4,
      'phd': 5,
      'doctorate': 5
    };

    const jobLevel = educationLevels[jobDegree.toLowerCase()] || 0;
    
    let cvLevel = 0;
    if (parsed.education) {
      parsed.education.forEach(edu => {
        if (edu.degree) {
          const degree = edu.degree.toLowerCase();
          Object.entries(educationLevels).forEach(([level, value]) => {
            if (degree.includes(level)) {
              cvLevel = Math.max(cvLevel, value);
            }
          });
        }
      });
    }

    if (cvLevel >= jobLevel) return 1;
    return Math.max(0, cvLevel / jobLevel);
  }

  // Calculate field/industry matching
  static calculateFieldMatch(jobField, parsed) {
    if (!jobField) return 0.5;

    const jobFieldLower = jobField.toLowerCase();
    let matchScore = 0;

    // Check work experience industry
    if (parsed.work_experience) {
      parsed.work_experience.forEach(exp => {
        if (exp.industry && exp.industry.toLowerCase().includes(jobFieldLower)) {
          matchScore = Math.max(matchScore, 0.8);
        }
        if (exp.description && exp.description.toLowerCase().includes(jobFieldLower)) {
          matchScore = Math.max(matchScore, 0.6);
        }
      });
    }

    // Check skills for field relevance
    if (parsed.skills && parsed.skills.technical) {
      parsed.skills.technical.forEach(skill => {
        if (skill.toLowerCase().includes(jobFieldLower)) {
          matchScore = Math.max(matchScore, 0.4);
        }
      });
    }

    return matchScore || 0.1;
  }

  // Calculate job title matching
  static calculateTitleMatch(jobTitle, parsed) {
    const jobTitleLower = jobTitle.toLowerCase();
    let matchScore = 0;

    // Check against job titles in CV
    if (parsed.job_titles) {
      parsed.job_titles.forEach(title => {
        if (title.toLowerCase().includes(jobTitleLower) || 
            jobTitleLower.includes(title.toLowerCase())) {
          matchScore = Math.max(matchScore, 1);
        }
      });
    }

    // Check against work experience titles
    if (parsed.work_experience) {
      parsed.work_experience.forEach(exp => {
        if (exp.title && exp.title.toLowerCase()) {
          const expTitle = exp.title.toLowerCase();
          if (expTitle.includes(jobTitleLower) || jobTitleLower.includes(expTitle)) {
            matchScore = Math.max(matchScore, 0.8);
          }
        }
      });
    }

    return matchScore;
  }

  // Get matching reasons for transparency
  static getMatchingReasons(job, cv, score) {
    const reasons = [];
    const parsed = cv.parsed_output || {};

    if (score >= 70) {
      reasons.push('Phù hợp cao với yêu cầu công việc');
    }

    // Skills reasons
    const jobSkills = this.extractJobSkills(job);
    const cvSkills = this.extractCVSkills(parsed);
    const matchingSkills = jobSkills.filter(skill => 
      cvSkills.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
    );
    
    if (matchingSkills.length > 0) {
      reasons.push(`Có kỹ năng phù hợp: ${matchingSkills.slice(0, 3).join(', ')}`);
    }

    // Experience reasons
    if (parsed.work_experience && parsed.work_experience.length > 0) {
      const totalYears = parsed.work_experience.reduce((sum, exp) => {
        const years = parseFloat(exp.duration?.match(/[\d.]+/)?.[0] || 0);
        return sum + years;
      }, 0);
      
      if (totalYears >= 3) {
        reasons.push(`Có ${totalYears.toFixed(1)} năm kinh nghiệm`);
      }
    }

    // Education reasons
    if (parsed.education && parsed.education.length > 0) {
      const highestDegree = parsed.education.find(edu => edu.degree);
      if (highestDegree) {
        reasons.push(`Bằng cấp: ${highestDegree.degree}`);
      }
    }

    return reasons.length > 0 ? reasons : ['Có tiềm năng phù hợp'];
  }

  // Get applicant recommendations for multiple jobs
  static async getBulkApplicantRecommendations(jobIds, options = {}) {
    try {
      const results = {};
      
      for (const jobId of jobIds) {
        const applicants = await this.getMatchingApplicants(jobId, options);
        results[jobId] = applicants;
      }
      
      return results;
    } catch (error) {
      console.error('Error getting bulk recommendations:', error);
      return {};
    }
  }
}

module.exports = AIApplicantMatchingService;
