const express = require('express');
const router = express.Router();
const { verifyToken, requireVerification, requireKYC } = require('../middleware/auth');
const { checkOwnership } = require('../middleware/ownership');
const { validate, schemas } = require('../middleware/validation');
const upload = require('../middleware/upload');
const ProfileService = require('../services/profile.service');

// Get user profile
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const profile = await ProfileService.getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/', 
  verifyToken, 
  validate(schemas.updateProfile),
  async (req, res, next) => {
    try {
      const profile = await ProfileService.updateProfile(req.user.id, req.body);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// Update profile photo
router.post('/photo',
  verifyToken,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      const profile = await ProfileService.updateProfilePhoto(req.user.id, req.file);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// Update cover photo
router.post('/cover',
  verifyToken,
  upload.single('cover'),
  async (req, res, next) => {
    try {
      const profile = await ProfileService.updateCoverPhoto(req.user.id, req.file);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// Get user campaigns
router.get('/campaigns',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const campaigns = await ProfileService.getUserCampaigns(req.user.id);
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  }
);

// Get user posts
router.get('/posts',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const posts = await ProfileService.getUserPosts(req.user.id);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  }
);

// Create post
router.post('/posts',
  verifyToken,
  requireVerification,
  validate(schemas.createPost),
  upload.array('media', 5),
  async (req, res, next) => {
    try {
      const post = await ProfileService.createPost(req.user.id, req.body, req.files);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }
);

// Get user stories
router.get('/stories',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const stories = await ProfileService.getUserStories(req.user.id);
      res.json(stories);
    } catch (error) {
      next(error);
    }
  }
);

// Create story
router.post('/stories',
  verifyToken,
  requireVerification,
  upload.single('media'),
  async (req, res, next) => {
    try {
      const story = await ProfileService.createStory(req.user.id, req.file);
      res.status(201).json(story);
    } catch (error) {
      next(error);
    }
  }
);

// Get user ads
router.get('/ads',
  verifyToken,
  requireVerification,
  requireKYC,
  async (req, res, next) => {
    try {
      const ads = await ProfileService.getUserAds(req.user.id);
      res.json(ads);
    } catch (error) {
      next(error);
    }
  }
);

// Create ad
router.post('/ads',
  verifyToken,
  requireVerification,
  requireKYC,
  upload.single('media'),
  async (req, res, next) => {
    try {
      const ad = await ProfileService.createAd(req.user.id, req.body, req.file);
      res.status(201).json(ad);
    } catch (error) {
      next(error);
    }
  }
);

// Get investment progress
router.get('/investments',
  verifyToken,
  requireVerification,
  requireKYC,
  async (req, res, next) => {
    try {
      const investments = await ProfileService.getInvestmentProgress(req.user.id);
      res.json(investments);
    } catch (error) {
      next(error);
    }
  }
);

// Setup 2FA
router.post('/2fa/setup',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const setup = await ProfileService.setup2FA(req.user.id);
      res.json(setup);
    } catch (error) {
      next(error);
    }
  }
);

// Verify 2FA
router.post('/2fa/verify',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const result = await ProfileService.verify2FA(req.user.id, req.body.code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get suggested connections
router.get('/connections',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const connections = await ProfileService.getSuggestedConnections(req.user.id);
      res.json(connections);
    } catch (error) {
      next(error);
    }
  }
);

// Invite user
router.post('/invite',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const invite = await ProfileService.inviteUser(req.user.id, req.body.email);
      res.json(invite);
    } catch (error) {
      next(error);
    }
  }
);

// Generate profile sharing link
router.get('/share',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const link = await ProfileService.generateSharingLink(req.user.id);
      res.json({ link });
    } catch (error) {
      next(error);
    }
  }
);

// Update notification settings
router.put('/notifications',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const settings = await ProfileService.updateNotificationSettings(req.user.id, req.body);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }
);

// Get login history
router.get('/login-history',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const history = await ProfileService.getLoginHistory(req.user.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

// Link social account
router.post('/social/link',
  verifyToken,
  requireVerification,
  async (req, res, next) => {
    try {
      const result = await ProfileService.linkSocialAccount(req.user.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 