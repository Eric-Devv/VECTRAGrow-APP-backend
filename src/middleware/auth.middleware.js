const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/user.model');

// JWT Strategy configuration
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Authentication middleware
const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized access'
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// MFA verification middleware
const verifyMFA = async (req, res, next) => {
  if (!req.user.mfaEnabled) {
    return next();
  }

  const { mfaToken } = req.body;
  if (!mfaToken) {
    return res.status(401).json({
      status: 'error',
      message: 'MFA token is required'
    });
  }

  try {
    const verified = await verifyMFAToken(req.user.mfaSecret, mfaToken);
    if (!verified) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid MFA token'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting middleware
const rateLimiter = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => {
  return rateLimiter({
    windowMs,
    max,
    message: {
      status: 'error',
      message: 'Too many requests, please try again later'
    }
  });
};

// Trust score middleware
const checkTrustScore = (minimumScore) => {
  return (req, res, next) => {
    if (req.user.trustScore < minimumScore) {
      return res.status(403).json({
        status: 'error',
        message: `Your trust score (${req.user.trustScore}) is below the required minimum (${minimumScore})`
      });
    }
    next();
  };
};

// Verification status middleware
const requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Your account needs to be verified to perform this action'
    });
  }
  next();
};

// Helper function to verify MFA token
const verifyMFAToken = async (secret, token) => {
  const speakeasy = require('speakeasy');
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token
  });
};

module.exports = {
  authenticate,
  authorize,
  verifyMFA,
  createRateLimiter,
  checkTrustScore,
  requireVerification
}; 