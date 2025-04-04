const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user has required role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Check if user is verified
const requireVerification = async (req, res, next) => {
  try {
    if (!req.user.emailVerified) {
      return res.status(403).json({ error: 'Email verification required' });
    }
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    res.status(500).json({ error: 'Error checking verification status' });
  }
};

// Check if user has completed KYC
const requireKYC = async (req, res, next) => {
  try {
    if (!req.user.kycVerified) {
      return res.status(403).json({ error: 'KYC verification required' });
    }
    next();
  } catch (error) {
    console.error('KYC check error:', error);
    res.status(500).json({ error: 'Error checking KYC status' });
  }
};

// Check if user has 2FA enabled
const require2FA = async (req, res, next) => {
  try {
    if (!req.user.twoFactorEnabled) {
      return res.status(403).json({ error: 'Two-factor authentication required' });
    }
    next();
  } catch (error) {
    console.error('2FA check error:', error);
    res.status(500).json({ error: 'Error checking 2FA status' });
  }
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later' }
  });
};

module.exports = {
  verifyToken,
  checkRole,
  requireVerification,
  requireKYC,
  require2FA,
  createRateLimiter
}; 