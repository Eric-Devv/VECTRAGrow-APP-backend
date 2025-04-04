const express = require('express');
const router = express.Router();
const socialService = require('../services/social.service');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Post routes
router.post('/posts', auth, upload.array('media', 5), async (req, res) => {
  try {
    const media = req.files ? req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 'video',
      url: file.path,
      thumbnail: file.mimetype.startsWith('video/') ? req.body.thumbnail : null
    })) : [];

    const post = await socialService.createPost(req.user.id, {
      ...req.body,
      media
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/posts/:postId', auth, async (req, res) => {
  try {
    const post = await socialService.getPost(req.params.postId);
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/users/:userId/posts', auth, async (req, res) => {
  try {
    const posts = await socialService.getUserPosts(
      req.params.userId,
      parseInt(req.query.page) || 1,
      parseInt(req.query.limit) || 10
    );
    res.status(200).json(posts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/posts/:postId/like', auth, async (req, res) => {
  try {
    const post = await socialService.likePost(req.user.id, req.params.postId);
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/posts/:postId/like', auth, async (req, res) => {
  try {
    const post = await socialService.unlikePost(req.user.id, req.params.postId);
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/posts/:postId/comments', auth, async (req, res) => {
  try {
    const post = await socialService.addComment(
      req.user.id,
      req.params.postId,
      req.body.content
    );
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/posts/:postId/comments/:commentId/replies', auth, async (req, res) => {
  try {
    const post = await socialService.addReply(
      req.user.id,
      req.params.postId,
      req.params.commentId,
      req.body.content
    );
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Group routes
router.post('/groups', auth, upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const media = {
      coverImage: req.files.coverImage ? req.files.coverImage[0].path : null,
      profileImage: req.files.profileImage ? req.files.profileImage[0].path : null
    };

    const group = await socialService.createGroup(req.user.id, {
      ...req.body,
      media
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/groups/:groupId', auth, async (req, res) => {
  try {
    const group = await socialService.getGroup(req.params.groupId);
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/groups/:groupId/join', auth, async (req, res) => {
  try {
    const group = await socialService.joinGroup(req.user.id, req.params.groupId);
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/groups/:groupId/leave', auth, async (req, res) => {
  try {
    const group = await socialService.leaveGroup(req.user.id, req.params.groupId);
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/groups/:groupId/members/:userId/role', auth, async (req, res) => {
  try {
    const group = await socialService.updateMemberRole(
      req.params.groupId,
      req.params.userId,
      req.body.role
    );
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Channel routes
router.post('/channels', auth, upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res) => {
  try {
    const media = {
      coverImage: req.files.coverImage ? req.files.coverImage[0].path : null,
      profileImage: req.files.profileImage ? req.files.profileImage[0].path : null,
      banner: req.files.banner ? req.files.banner[0].path : null
    };

    const channel = await socialService.createChannel(req.user.id, {
      ...req.body,
      media
    });
    res.status(201).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/channels/:channelId', auth, async (req, res) => {
  try {
    const channel = await socialService.getChannel(req.params.channelId);
    res.status(200).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/channels/:channelId/subscribe', auth, async (req, res) => {
  try {
    const channel = await socialService.subscribeToChannel(req.user.id, req.params.channelId);
    res.status(200).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/channels/:channelId/unsubscribe', auth, async (req, res) => {
  try {
    const channel = await socialService.unsubscribeFromChannel(req.user.id, req.params.channelId);
    res.status(200).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/channels/:channelId/posts/:postId/pin', auth, async (req, res) => {
  try {
    const channel = await socialService.pinPost(req.params.channelId, req.params.postId);
    res.status(200).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/channels/:channelId/posts/:postId/pin', auth, async (req, res) => {
  try {
    const channel = await socialService.unpinPost(req.params.channelId, req.params.postId);
    res.status(200).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 