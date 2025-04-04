const express = require('express');
const router = express.Router();
const { verifyToken, requireVerification } = require('../middleware/auth');
const { checkOwnership, checkMembership, checkPermission } = require('../middleware/ownership');
const { upload } = require('../middleware/upload');
const Group = require('../models/group.model');
const Message = require('../models/message.model');
const { AppError } = require('../utils/error');

// Create a new group
router.post('/', verifyToken, requireVerification, async (req, res, next) => {
  try {
    const { name, description, type, settings } = req.body;
    
    const group = new Group({
      name,
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
      }],
      members: [{
        user: req.user._id,
        role: 'member',
        joinedAt: new Date()
      }]
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

// Get group by ID
router.get('/:groupId', verifyToken, checkMembership(Group), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate('owner', 'name username profilePhoto')
      .populate('admins.user', 'name username profilePhoto')
      .populate('members.user', 'name username profilePhoto');

    if (!group) {
      throw new AppError('Group not found', 404);
    }

    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Update group
router.put('/:groupId', verifyToken, requireVerification, checkOwnership(Group), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;
    
    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    Object.assign(group, updates);
    await group.save();
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Update group media
router.put('/:groupId/media', verifyToken, requireVerification, checkOwnership(Group), upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    if (req.files.profilePhoto) {
      group.media.profilePhoto = req.files.profilePhoto[0].path;
    }
    if (req.files.coverPhoto) {
      group.media.coverPhoto = req.files.coverPhoto[0].path;
    }

    await group.save();
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Add admin
router.post('/:groupId/admins', verifyToken, requireVerification, checkOwnership(Group), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId, role, permissions } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    await group.addAdmin(userId, role, permissions);
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Remove admin
router.delete('/:groupId/admins/:userId', verifyToken, requireVerification, checkOwnership(Group), async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    await group.removeAdmin(userId);
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Invite member
router.post('/:groupId/invite', verifyToken, requireVerification, checkPermission(Group, 'canInvite'), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    if (group.members.some(m => m.user.toString() === userId)) {
      throw new AppError('User is already a member', 400);
    }

    group.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Remove member
router.delete('/:groupId/members/:userId', verifyToken, requireVerification, checkOwnership(Group), async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    if (userId === group.owner.toString()) {
      throw new AppError('Cannot remove group owner', 400);
    }

    group.members = group.members.filter(m => m.user.toString() !== userId);
    await group.save();
    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/:groupId/messages', verifyToken, requireVerification, checkMembership(Group), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { type, content, replyTo } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const message = new Message({
      group: groupId,
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
router.get('/:groupId/messages', verifyToken, checkMembership(Group), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20, before } = req.query;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const query = { group: groupId };
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
router.post('/:groupId/messages/:messageId/reactions', verifyToken, checkMembership(Group), async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findOne({ _id: messageId, group: groupId });
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
router.delete('/:groupId/messages/:messageId/reactions/:emoji', verifyToken, checkMembership(Group), async (req, res, next) => {
  try {
    const { groupId, messageId, emoji } = req.params;

    const message = await Message.findOne({ _id: messageId, group: groupId });
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
router.post('/:groupId/messages/:messageId/pin', verifyToken, requireVerification, checkPermission(Group, 'canPin'), async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    const message = await Message.findOne({ _id: messageId, group: groupId });
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    message.metadata.pinnedAt = new Date();
    message.metadata.pinnedBy = req.user._id;
    await message.save();

    group.pinnedMessages.push({
      message: messageId,
      pinnedAt: new Date(),
      pinnedBy: req.user._id
    });
    await group.save();

    res.json(message);
  } catch (error) {
    next(error);
  }
});

// Unpin message
router.delete('/:groupId/messages/:messageId/pin', verifyToken, requireVerification, checkPermission(Group, 'canPin'), async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    group.pinnedMessages = group.pinnedMessages.filter(
      pin => pin.message.toString() !== messageId
    );
    await group.save();

    const message = await Message.findOne({ _id: messageId, group: groupId });
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

// Leave group
router.post('/:groupId/leave', verifyToken, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    if (group.owner.toString() === req.user._id.toString()) {
      throw new AppError('Group owner cannot leave the group', 400);
    }

    group.members = group.members.filter(m => m.user.toString() !== req.user._id.toString());
    group.admins = group.admins.filter(a => a.user.toString() !== req.user._id.toString());
    await group.save();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete group
router.delete('/:groupId', verifyToken, requireVerification, checkOwnership(Group), async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    
    if (!group) {
      throw new AppError('Group not found', 404);
    }

    group.status = 'deleted';
    await group.save();

    // Delete all messages
    await Message.deleteMany({ group: groupId });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 