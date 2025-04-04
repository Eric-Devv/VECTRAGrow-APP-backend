const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Analytics = require('../models/analytics.model');

// Get user analytics
router.get('/user', auth, async (req, res) => {
  try {
    const analytics = await Analytics.findOne({ user: req.user.id });
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Error fetching analytics data' });
  }
});

// Get campaign analytics
router.get('/campaign/:campaignId', auth, async (req, res) => {
  try {
    const analytics = await Analytics.findOne({
      user: req.user.id,
      'campaigns.campaignId': req.params.campaignId
    }).select('campaigns.$');
    
    if (!analytics) {
      return res.status(404).json({ error: 'Campaign analytics not found' });
    }
    
    res.json(analytics.campaigns[0]);
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({ error: 'Error fetching campaign analytics' });
  }
});

// Track page view
router.post('/track/page-view', auth, async (req, res) => {
  try {
    const { page, referrer } = req.body;
    
    await Analytics.findOneAndUpdate(
      { user: req.user.id },
      {
        $inc: { 'pageViews.total': 1 },
        $push: {
          'pageViews.history': {
            page,
            referrer,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    );
    
    res.json({ message: 'Page view tracked successfully' });
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({ error: 'Error tracking page view' });
  }
});

// Track event
router.post('/track/event', auth, async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    
    await Analytics.findOneAndUpdate(
      { user: req.user.id },
      {
        $inc: { [`events.${eventType}`]: 1 },
        $push: {
          'events.history': {
            type: eventType,
            data: eventData,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    );
    
    res.json({ message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Error tracking event' });
  }
});

// Track campaign interaction
router.post('/track/campaign/:campaignId', auth, async (req, res) => {
  try {
    const { interactionType, interactionData } = req.body;
    
    await Analytics.findOneAndUpdate(
      { user: req.user.id },
      {
        $inc: { [`campaigns.$.interactions.${interactionType}`]: 1 },
        $push: {
          'campaigns.$.interactions.history': {
            type: interactionType,
            data: interactionData,
            timestamp: new Date()
          }
        }
      },
      { 
        upsert: true,
        new: true,
        arrayFilters: [{ 'campaigns.campaignId': req.params.campaignId }]
      }
    );
    
    res.json({ message: 'Campaign interaction tracked successfully' });
  } catch (error) {
    console.error('Error tracking campaign interaction:', error);
    res.status(500).json({ error: 'Error tracking campaign interaction' });
  }
});

// Get engagement metrics
router.get('/engagement', auth, async (req, res) => {
  try {
    const analytics = await Analytics.findOne({ user: req.user.id })
      .select('events pageViews campaigns');
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics data not found' });
    }
    
    const engagementMetrics = {
      totalPageViews: analytics.pageViews.total,
      totalEvents: Object.values(analytics.events).reduce((a, b) => a + b, 0),
      campaignEngagement: analytics.campaigns.map(campaign => ({
        campaignId: campaign.campaignId,
        totalInteractions: Object.values(campaign.interactions)
          .reduce((a, b) => a + b, 0)
      }))
    };
    
    res.json(engagementMetrics);
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({ error: 'Error fetching engagement metrics' });
  }
});

module.exports = router; 