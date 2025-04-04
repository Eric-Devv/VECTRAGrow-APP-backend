const jwt = require('jsonwebtoken');
const passport = require('passport');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Register new user
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      userType,
      phoneNumber
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      userType,
      phoneNumber
    });

    await user.save();

    // Generate verification token
    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      text: `Please verify your email by clicking this link: ${process.env.FRONTEND_URL}/verify-email/${verificationToken}`
    });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          mfaEnabled: user.mfaEnabled
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Setup MFA
exports.setupMFA = async (req, res) => {
  try {
    const user = req.user;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `VECTRAGrow:${user.email}`
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Save secret
    user.mfaSecret = secret.base32;
    await user.save();

    res.json({
      status: 'success',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Enable MFA
exports.enableMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid MFA token'
      });
    }

    // Enable MFA
    user.mfaEnabled = true;
    await user.save();

    res.json({
      status: 'success',
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Disable MFA
exports.disableMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid MFA token'
      });
    }

    // Disable MFA
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();

    res.json({
      status: 'success',
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with this email'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email
    await sendEmail({
      to: user.email,
      subject: 'Reset your password',
      text: `Please reset your password by clicking this link: ${process.env.FRONTEND_URL}/reset-password/${resetToken}`
    });

    res.json({
      status: 'success',
      message: 'Password reset email sent'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Social login (Google)
exports.googleLogin = passport.authenticate('google', {
  scope: ['profile', 'email']
});

exports.googleCallback = passport.authenticate('google', {
  failureRedirect: '/login',
  session: false
}, async (req, res) => {
  try {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=${error.message}`);
  }
});

// Social login (LinkedIn)
exports.linkedinLogin = passport.authenticate('linkedin', {
  scope: ['r_emailprofile']
});

exports.linkedinCallback = passport.authenticate('linkedin', {
  failureRedirect: '/login',
  session: false
}, async (req, res) => {
  try {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=${error.message}`);
  }
}); 