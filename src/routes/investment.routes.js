const express = require('express');
const router = express.Router();
const InvestmentService = require('../services/investment.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Process new investment
router.post('/', authenticate, authorize(['investor']), async (req, res) => {
  try {
    const investment = await InvestmentService.processInvestment({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(investment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Process recurring investment
router.post('/recurring', authenticate, authorize(['investor']), async (req, res) => {
  try {
    const investment = await InvestmentService.processRecurringInvestment({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(investment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel recurring investment
router.post('/:id/cancel', authenticate, authorize(['investor']), async (req, res) => {
  try {
    const investment = await InvestmentService.cancelRecurringInvestment(
      req.params.id,
      req.user._id
    );
    res.json(investment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user investments
router.get('/user', authenticate, authorize(['investor']), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await InvestmentService.getUserInvestments(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get campaign investments
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await InvestmentService.getCampaignInvestments(
      req.params.campaignId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 