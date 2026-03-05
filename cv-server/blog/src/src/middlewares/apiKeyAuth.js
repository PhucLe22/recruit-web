// Simple API key middleware for internal service communication
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'ai-service-internal-key';

const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    // Skip authentication for non-API routes or if no API key is provided
    if (!apiKey) {
        return next();
    }
    
    // Check if the API key matches
    if (apiKey === INTERNAL_API_KEY) {
        // Set a flag to indicate this is an authenticated internal request
        req.isInternalService = true;
        return next();
    }
    
    // Invalid API key
    return res.status(401).json({
        success: false,
        message: 'Invalid API key'
    });
};

module.exports = apiKeyAuth;
