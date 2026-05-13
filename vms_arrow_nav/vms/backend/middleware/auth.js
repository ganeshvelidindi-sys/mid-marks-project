const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id)
        .select('-password')
        .populate('department')
        .populate('hodDepartments');
      if (!req.user)       return res.status(401).json({ message: 'User not found' });
      if (!req.user.isActive) return res.status(401).json({ message: 'Account is deactivated' });
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// authorize('admin') or authorize('admin','faculty')
// Also supports virtual 'hod' role — faculty with isHod flag
const authorize = (...roles) => {
  return (req, res, next) => {
    const effectiveRole = req.headers['x-login-role'] || req.user.role;
    // Allow faculty acting as HOD
    if (roles.includes('hod') && req.user.role === 'faculty' && req.user.isHod) return next();
    if (!roles.includes(effectiveRole) && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user.role}' is not authorized for this route` });
    }
    next();
  };
};

module.exports = { protect, authorize };
