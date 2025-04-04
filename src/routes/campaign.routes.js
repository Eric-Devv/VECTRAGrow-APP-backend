const express = require('express');
const router = express.Router();
const CampaignService = require('../services/campaign.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Create new campaign
router.post('/', authenticate, authorize(['business_owner']), async (req, res) => {
  try {
    const campaign = await CampaignService.createCampaign({
      ...req.body,
      owner: req.user._id
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update campaign
router.put('/:id', authenticate, authorize(['business_owner']), async (req, res) => {
  try {
    const campaign = await CampaignService.updateCampaign(
      req.params.id,
      req.body,
      req.user._id
    );
    res.json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await CampaignService.getCampaignById(req.params.id);
    res.json(campaign);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Search campaigns
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await CampaignService.searchCampaigns(filters, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add milestone
router.post('/:id/milestones', authenticate, authorize(['business_owner']), async (req, res) => {
  try {
    const campaign = await CampaignService.addMilestone(
      req.params.id,
      req.body,
      req.user._id
    );
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update milestone
router.put('/:id/milestones/:milestoneId', authenticate, authorize(['business_owner']), async (req, res) => {
  try {
    const campaign = await CampaignService.updateMilestone(
      req.params.id,
      req.params.milestoneId,
      req.body,
      req.user._id
    );
    res.json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const campaign = await CampaignService.addComment(
      req.params.id,
      req.user._id,
      req.body.content
    );
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get trending campaigns
router.get('/trending', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const campaigns = await CampaignService.getTrendingCampaigns(parseInt(limit));
    res.json(campaigns);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get recommended campaigns
router.get('/recommended', authenticate, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const campaigns = await CampaignService.getRecommendedCampaigns(
      req.user._id,
      parseInt(limit)
    );
    res.json(campaigns);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 