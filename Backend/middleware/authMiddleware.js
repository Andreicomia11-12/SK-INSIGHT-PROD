const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// Middleware to protect routes (requires a valid token)
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for Authorization header and extract token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log("Token received:", token);

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded:", decoded);

      // Find user by decoded ID and exclude password
      const user = await User.findById(decoded.id).select('-password');
      console.log("User found:", user);

      if (!user) {
        console.log("User not found for id:", decoded.id);
        return res.status(401).json({ message: 'User not found' });
      }

      // Attach user to request
      req.user = user;

      // Allow all authenticated users, regardless of verification status
      console.log("protect passed for user:", user.email, user.role);

      next(); // Proceed to route
    } catch (err) {
      console.error('Token error:', err);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // No token provided
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
});

// Middleware to restrict access by role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {

    console.log("authorizeRoles check:", req.user.role, roles);
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `Access denied for role: ${req.user.role}` });
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
