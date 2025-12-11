const jwt = require('jsonwebtoken');

/**
 * Extracts and verifies JWT token from request
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyJwtToken = (token) => {
  if (!token) return null;
  
  try {
    return jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
  } catch (error) {
    console.warn('JWT verification failed:', error.message);
    return null;
  }
};

const extractToken = (req) => {
  // Check Authorization header
  const authHeader = req.headers.authorization || null;
  if (authHeader?.startsWith('Bearer ')) {
    //return res.json("Found token in header:", authHeader.substring(7));
    return authHeader.substring(7);
  }
  
  // Check cookies
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  } 
  return null;
};

const isLogin = (req, res, next) => {
  try {
    // Check session first (faster than JWT verification)
    if (req.session?.user) {
      setRequestUser(req, req.session.user, 'user');
      // return res.json("Found user in session:", req.session.user);
      // return next();
    }
    if (req.session?.business) {
      setRequestUser(req, req.session.business, 'business');
      // return res.json("Found business in session:", req.session.business);
      // return next();
    }
    const token = extractToken(req) || null;
    if (!token) {
      // return next();
      return res.json('No token found', token);
    }
    else {
      const decoded = verifyJwtToken(token);
      if (decoded) {
        setRequestUser(req, decoded, decoded.isBusiness ? 'business' : 'user');
        return next();
      }
      else {
        return res.json('Token is invalid', token);
      }
    }
    // No valid session or token found
    setGuestUser(req);
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    setGuestUser(req);
    // return res.json("Authentication error:", error);
    return next();
  }
};

const setRequestUser = (req, userData, userType) => {
  req.user = userData;
  req.isLogin = true;
  req.userType = userType;
  
  // Handle business user
  if (userType === 'business') {
    req.headerData = {
      isAuthenticated: true,
      userType: 'business',
      displayName: userData.name || userData.companyName || userData.businessName || 'Business',
      avatar: userData.logoPath || '/images/default-business-logo.png',
      email: userData.email || '',
      // Include any additional business data needed in the header
      ...(userData.businessData ? { businessData: userData.businessData } : {})
    };
  } 
  // Handle regular user
  else {
    req.headerData = {
      isAuthenticated: true,
      userType: 'user',
      displayName: userData.name || userData.username || 'User',
      avatar: userData.avatar || '/images/default-avatar.png',
      email: userData.email || '',
      // Include any additional user data needed in the header
      ...(userData.profile ? { profile: userData.profile } : {})
    };
  }
};

const setGuestUser = (req) => {
  req.user = null;
  req.isLogin = false;
  req.userType = null;
  req.headerData = {
    isAuthenticated: false,
    userType: null,
    displayName: 'Guest',
    avatar: '/images/default-avatar.png',
    email: ''
  };
};

const requireAuth = (req, res, next) => {
  if (!req.isLogin || !req.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    } else {
      // Redirect to login page based on user type preference
      const loginPath = req.userType === 'business' ? '/business/login-page' : '/auth/loginRIX';
      return res.redirect(loginPath);
    }
  }
  
  next();
};

const requireBusinessAuth = (req, res, next) => {
  if (!req.isLogin || !req.user || req.userType !== 'business') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Business authentication required'
      });
    } else {
      return res.redirect('/business/login');
    }
  }
  
  next();
};

const requireUserAuth = (req, res, next) => {
  if (!req.isLogin || !req.user || req.userType !== 'user') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    } else {
      return res.redirect('/auth/login');
    }
  }
  
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.isLogin || !req.user) {
    return res.redirect('/auth/login');
  }
  
  // Check if user has admin role
  if (req.user.role !== 'admin' && !req.user.isAdmin) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    } else {
      return res.redirect('/auth/login');
    }
  }
  
  next();
};

const makeUserDataAvailable = (req, res, next) => {
  // Ensure headerData is set
  if (!req.headerData) {
    setGuestUser(req);
  }
  
  // Add data to res.locals for templates
  res.locals.user = req.user;
  res.locals.isLogin = req.isLogin;
  res.locals.userType = req.userType;
  res.locals.headerData = req.headerData;
  
  // Add data to response object for controllers
  res.user = req.user;
  res.isLogin = req.isLogin;
  res.userType = req.userType;
  
  next();
};

const userDataMiddleware = makeUserDataAvailable;

const getCurrentUser = (req) => {
  return req.user || null;
};

const isResourceOwner = (req, resourceUserId) => {
  if (!req.user || !req.isLogin) return false;
  
  return req.user._id.toString() === resourceUserId.toString();
};

const canEditResource = (req, resourceUserId, resourceBusinessId = null) => {
  if (!req.user || !req.isLogin) return false;
  
  if (req.userType === 'user' && req.user._id.toString() === resourceUserId.toString()) {
    return true;
  }
  
  if (req.userType === 'business' && resourceBusinessId && 
      req.user._id.toString() === resourceBusinessId.toString()) {
    return true;
  }
  
  if (req.user.role === 'admin' || req.user.isAdmin) {
    return true;
  }
  
  return false;
};

module.exports = {
  isLogin,
  requireAuth,
  requireBusinessAuth,
  requireUserAuth,
  requireAdmin,
  
  // Data handling
  makeUserDataAvailable,
  userDataMiddleware,
  
  // Helpers
  getCurrentUser,
  isResourceOwner,
  canEditResource,
  
  // Internal (for testing/advanced usage)
  _setRequestUser: setRequestUser,
  _setGuestUser: setGuestUser
};
