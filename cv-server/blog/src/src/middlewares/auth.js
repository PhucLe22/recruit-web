// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    
    // If it's an API request, return 401
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Vui lòng đăng nhập để tiếp tục' 
        });
    }
    
    // For web requests, redirect to login
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
    return res.redirect('/auth/login-page');
};

// Authorization middleware
const isAuthorized = (req, res, next) => {
    // If user is trying to access their own resource or is admin
    if (req.params.userId === req.user?._id?.toString() || req.user?.role === 'admin') {
        return next();
    }
    
    // If it's an API request, return 403
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ 
            success: false, 
            message: 'Bạn không có quyền truy cập tài nguyên này' 
        });
    }
    
    // For web requests, redirect with error
    req.flash('error', 'Bạn không có quyền truy cập tài nguyên này');
    return res.redirect('back');
};

module.exports = {
    isAuthenticated,
    isAuthorized
};
