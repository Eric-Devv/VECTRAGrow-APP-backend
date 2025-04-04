const express = require('express');
const router = express.Router();
const ChatService = require('../services/chat.service');
const { authenticate } = require('../middleware/auth.middleware');

// Create new chat
router.post('/', authenticate, async (req, res) => {
  try {
    const chat = await ChatService.createChat({
      ...req.body,
      participants: [req.user._id, ...req.body.participants]
    });
    res.status(201).json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user chats
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await ChatService.getUserChats(req.user._id);
    res.json(chats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get chat messages
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await ChatService.getChatMessages(
      req.params.id,
      parseInt(page),
      parseInt(limit)
    );
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send message
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const message = await ChatService.addMessage(
      req.params.id,
      req.user._id,
      req.body.content,
      req.body.type
    );
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark messages as read
router.put('/:id/messages/read', authenticate, async (req, res) => {
  try {
    const chat = await ChatService.markMessagesAsRead(
      req.params.id,
      req.user._id
    );
    res.json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update chat settings
router.put('/:id/settings', authenticate, async (req, res) => {
  try {
    const chat = await ChatService.updateChatSettings(
      req.params.id,
      req.user._id,
      req.body
    );
    res.json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete chat
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await ChatService.deleteChat(req.params.id, req.user._id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 