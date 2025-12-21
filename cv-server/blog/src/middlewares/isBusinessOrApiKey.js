// Custom authentication middleware that accepts both business auth and API key
const isBusinessOrApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'ai-service-internal-key';
    
    // Check if this is an internal service request with valid API key
    if (apiKey === INTERNAL_API_KEY) {
        req.isInternalService = true;
        req.user = { id: 'internal-service' }; // Mock user for internal requests
        return next();
    }
    
    // Fall back to regular business authentication
    const isBusiness = require('./isLogin').isBusiness;
    return isBusiness(req, res, next);
};

module.exports = isBusinessOrApiKey;
