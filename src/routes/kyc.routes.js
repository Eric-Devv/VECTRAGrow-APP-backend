const express = require('express');
const router = express.Router();
const kycService = require('../services/kyc.service');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// KYC verification routes
router.post('/initiate', auth, async (req, res) => {
  try {
    const kyc = await kycService.initiateVerification(req.user.id, req.body);
    res.status(201).json(kyc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/documents', auth, upload.single('document'), async (req, res) => {
  try {
    const kyc = await kycService.submitDocument(
      req.user.id,
      req.body.type,
      req.file.path
    );
    res.status(200).json(kyc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/documents/:documentId', auth, async (req, res) => {
  try {
    const kyc = await kycService.verifyDocument(
      req.user.id,
      req.params.documentId,
      req.body.status,
      req.body.remarks
    );
    res.status(200).json(kyc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/status', auth, async (req, res) => {
  try {
    const kyc = await kycService.updateVerificationStatus(
      req.user.id,
      req.body.status,
      req.body.remarks
    );
    res.status(200).json(kyc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const kyc = await kycService.getVerificationStatus(req.user.id);
    res.status(200).json(kyc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    const kycs = await kycService.getPendingVerifications();
    res.status(200).json(kycs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verification badge routes
router.post('/badges/:badge', auth, async (req, res) => {
  try {
    const user = await kycService.addVerificationBadge(req.user.id, req.params.badge);
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/badges/:badge', auth, async (req, res) => {
  try {
    const user = await kycService.removeVerificationBadge(req.user.id, req.params.badge);
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/badges', auth, async (req, res) => {
  try {
    const badges = await kycService.getVerificationBadges(req.user.id);
    res.status(200).json(badges);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 