const express = require('express');
const router = express.Router();
const { verifyToken, requireVerification } = require('../middleware/auth');
const { checkOwnership, checkPermission } = require('../middleware/ownership');
const { upload } = require('../middleware/upload');
const Channel = require('../models/channel.model');
const Message = require('../models/message.model');
const { AppError } = require('../utils/error');

// Create a new channel
router.post('/', verifyToken, requireVerification, async (req, res, next) => {
  try {
    const { name, username, description, type, settings } = req.body;
    
    // Check if username is already taken
    if (username) {
      const existingChannel = await Channel.findByUsername(username);
      if (existingChannel) {
        throw new AppError('Username is already taken', 400);
      }
    }

    const channel = new Channel({
      name,
      username,
      description,
      type,
      owner: req.user._id,
      settings,
      admins: [{
        user: req.user._id,
        role: 'admin',
        permissions: {
          canPost: true,
          canEdit: true,
          canDelete: true,
          canInvite: true,
          canPin: true
        }
      }]
    });

    await channel.save();
    res.status(201).json(channel);
  } catch (error) {
    next(error);
  }
});

// Get channel by username or ID
router.get('/:identifier', verifyToken, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const channel = await Channel.findOne({
      $or: [
        { _id: identifier },
        { username: identifier }
      ]
    }).populate('owner', 'name username profilePhoto');

    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// Update channel
router.put('/:channelId', verifyToken, requireVerification, checkOwnership(Channel), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const updates = req.body;
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Check if username is being updated and is already taken
    if (updates.username && updates.username !== channel.username) {
      const existingChannel = await Channel.findByUsername(updates.username);
      if (existingChannel) {
        throw new AppError('Username is already taken', 400);
      }
    }

    Object.assign(channel, updates);
    await channel.save();
    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// Update channel media
router.put('/:channelId/media', verifyToken, requireVerification, checkOwnership(Channel), upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    if (req.files.profilePhoto) {
      channel.media.profilePhoto = req.files.profilePhoto[0].path;
    }
    if (req.files.coverPhoto) {
      channel.media.coverPhoto = req.files.coverPhoto[0].path;
    }
    if (req.files.banner) {
      channel.media.banner = req.files.banner[0].path;
    }

    await channel.save();
    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// Add admin
router.post('/:channelId/admins', verifyToken, requireVerification, checkOwnership(Channel), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { userId, role, permissions } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    await channel.addAdmin(userId, role, permissions);
    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// Remove admin
router.delete('/:channelId/admins/:userId', verifyToken, requireVerification, checkOwnership(Channel), async (req, res, next) => {
  try {
    const { channelId, userId } = req.params;
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    await channel.removeAdmin(userId);
    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/:channelId/messages', verifyToken, requireVerification, checkPermission(Channel, 'canPost'), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { type, content, replyTo } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    const message = new Message({
      channel: channelId,
      sender: req.user._id,
      type,
      content,
      replyTo
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Get messages
router.get('/:channelId/messages', verifyToken, async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 20, before } = req.query;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    const query = { channel: channelId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name username profilePhoto')
      .populate('replyTo');

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// React to message
router.post('/:channelId/messages/:messageId/reactions', verifyToken, async (req, res, next) => {
  try {
    const { channelId, messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    await message.addReaction(req.user._id, emoji);
    res.json(message);
  } catch (error) {
    next(error);
  }
});

// Remove reaction
router.delete('/:channelId/messages/:messageId/reactions/:emoji', verifyToken, async (req, res, next) => {
  try {
    const { channelId, messageId, emoji } = req.params;

    const message = await Message.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    await message.removeReaction(req.user._id, emoji);
    res.json(message);
  } catch (error) {
    next(error);
  }
});

// Pin message
router.post('/:channelId/messages/:messageId/pin', verifyToken, requireVerification, checkPermission(Channel, 'canPin'), async (req, res, next) => {
  try {
    const { channelId, messageId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    const message = await Message.findOne({ _id: messageId, channel: channelId });
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    message.metadata.pinnedAt = new Date();
    message.metadata.pinnedBy = req.user._id;
    await message.save();

    channel.pinnedMessages.push({
      message: messageId,
      pinnedAt: new Date(),
      pinnedBy: req.user._id
    });
    await channel.save();

    res.json(message);
  } catch (error) {
    next(error);
  }
});

// Unpin message
router.delete('/:channelId/messages/:messageId/pin', verifyToken, requireVerification, checkPermission(Channel, 'canPin'), async (req, res, next) => {
  try {
    const { channelId, messageId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    channel.pinnedMessages = channel.pinnedMessages.filter(
      pin => pin.message.toString() !== messageId
    );
    await channel.save();

    const message = await Message.findOne({ _id: messageId, channel: channelId });
    if (message) {
      message.metadata.pinnedAt = null;
      message.metadata.pinnedBy = null;
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete channel
router.delete('/:channelId', verifyToken, requireVerification, checkOwnership(Channel), async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    channel.status = 'deleted';
    await channel.save();

    // Delete all messages
    await Message.deleteMany({ channel: channelId });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 