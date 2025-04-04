const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../middleware/auth');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    user = new User({
      email,
      password,
      firstName,
      lastName,
      phoneNumber
    });

    await user.save();

    // Send welcome email
    await sendEmail({
      to: email,
      template: 'welcome',
      context: { firstName }
    });

    // Generate JWT token
    const token = user.generateAuthToken();

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(400).json({ error: 'Account is not active' });
    }

    // Generate JWT token
    const token = user.generateAuthToken();

    // Update login history
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    await user.save();

    // Send login alert if enabled
    if (user.settings?.notifications?.loginAlerts) {
      await sendSMS({
        to: user.phoneNumber,
        template: 'loginAlert',
        context: { user: user.firstName }
      });
    }

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = req.user.generateAuthToken();
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// LinkedIn OAuth routes
router.get('/linkedin',
  passport.authenticate('linkedin', { scope: ['r_emailaddress', 'r_liteprofile'] })
);

router.get('/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/login' }),
  (req, res) => {
    const token = req.user.generateAuthToken();
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    await sendEmail({
      to: email,
      template: 'passwordReset',
      context: {
        firstName: user.firstName,
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      }
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Error processing password reset request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      'passwordReset.token': token,
      'passwordReset.expires': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.passwordReset = undefined;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      template: 'passwordChanged',
      context: { firstName: user.firstName }
    });

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    const user = await User.findOne({
      'emailVerification.token': token,
      'emailVerification.expires': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerification = undefined;
    await user.save();

    res.json({ message: 'Email successfully verified' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    // Update last logout time
    await User.findByIdAndUpdate(req.user.id, {
      $set: { lastLogout: new Date() }
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error logging out' });
  }
});

module.exports = router; 