const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

class ChatService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.setupSocketHandlers();
  }
  
  // Setup Socket.IO event handlers
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      // Handle user authentication
      socket.on('authenticate', async (userId) => {
        try {
          const user = await User.findById(userId);
          if (user) {
            this.connectedUsers.set(userId, socket.id);
            user.status = 'online';
            await user.save();
            
            // Notify other users
            this.io.emit('userStatus', {
              userId,
              status: 'online'
            });
          }
        } catch (error) {
          console.error('Authentication error:', error);
        }
      });
      
      // Handle joining chat room
      socket.on('joinChat', async (chatId) => {
        try {
          const chat = await Chat.findById(chatId);
          if (chat) {
            socket.join(chatId);
            
            // Mark messages as read
            const userId = Array.from(this.connectedUsers.entries())
              .find(([_, id]) => id === socket.id)?.[0];
            
            if (userId) {
              await chat.markAsRead(userId);
            }
          }
        } catch (error) {
          console.error('Join chat error:', error);
        }
      });
      
      // Handle leaving chat room
      socket.on('leaveChat', (chatId) => {
        socket.leave(chatId);
      });
      
      // Handle new message
      socket.on('sendMessage', async (data) => {
        try {
          const { chatId, senderId, content, type = 'text', metadata = {} } = data;
          
          const chat = await Chat.findById(chatId);
          if (!chat) {
            throw new Error('Chat not found');
          }
          
          // Add message to chat
          const message = await chat.addMessage(senderId, content, type, metadata);
          
          // Broadcast message to chat room
          this.io.to(chatId).emit('newMessage', {
            chatId,
            message
          });
          
          // Send notifications to offline users
          await this.sendMessageNotifications(chat, message);
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', {
            message: 'Failed to send message'
          });
        }
      });
      
      // Handle typing status
      socket.on('typing', (data) => {
        const { chatId, userId, isTyping } = data;
        socket.to(chatId).emit('userTyping', {
          chatId,
          userId,
          isTyping
        });
      });
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        const userId = Array.from(this.connectedUsers.entries())
          .find(([_, id]) => id === socket.id)?.[0];
        
        if (userId) {
          this.connectedUsers.delete(userId);
          
          // Update user status
          const user = await User.findById(userId);
          if (user) {
            user.status = 'offline';
            await user.save();
            
            // Notify other users
            this.io.emit('userStatus', {
              userId,
              status: 'offline'
            });
          }
        }
        
        console.log('User disconnected:', socket.id);
      });
    });
  }
  
  // Send message notifications
  async sendMessageNotifications(chat, message) {
    try {
      const offlineUsers = chat.participants.filter(participant => 
        !this.connectedUsers.has(participant.user.toString())
      );
      
      for (const participant of offlineUsers) {
        const user = await User.findById(participant.user);
        if (!user) continue;
        
        // Add notification to chat
        await chat.addNotification(
          participant.user,
          'message',
          `New message from ${message.sender.firstName}`
        );
        
        // Send email notification
        if (user.email) {
          await sendEmail({
            to: user.email,
            template: 'newMessage',
            data: {
              firstName: user.firstName,
              senderName: message.sender.firstName,
              chatId: chat._id
            }
          });
        }
        
        // Send SMS notification if phone number exists
        if (user.phoneNumber) {
          await sendSMS({
            to: user.phoneNumber,
            template: 'newMessage',
            data: {
              senderName: message.sender.firstName
            }
          });
        }
      }
    } catch (error) {
      console.error('Send notifications error:', error);
    }
  }
  
  // Create new chat
  async createChat(participants, type, context = {}) {
    try {
      const chat = new Chat({
        participants: participants.map(p => ({
          user: p.userId,
          role: p.role
        })),
        type,
        context
      });
      
      await chat.save();
      return chat;
    } catch (error) {
      console.error('Create chat error:', error);
      throw error;
    }
  }
  
  // Get user chats
  async getUserChats(userId) {
    try {
      const chats = await Chat.find({
        'participants.user': userId
      })
      .populate('participants.user', 'firstName lastName profilePicture status')
      .populate('context.campaign', 'title')
      .populate('context.investment', 'amount')
      .sort('-updatedAt');
      
      return chats;
    } catch (error) {
      console.error('Get user chats error:', error);
      throw error;
    }
  }
  
  // Get chat messages
  async getChatMessages(chatId, page = 1, limit = 50) {
    try {
      const chat = await Chat.findById(chatId)
        .populate('messages.sender', 'firstName lastName profilePicture')
        .populate('messages.readBy.user', 'firstName lastName');
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const messages = chat.messages
        .slice(startIndex, endIndex)
        .reverse();
      
      return {
        messages,
        hasMore: endIndex < chat.messages.length
      };
    } catch (error) {
      console.error('Get chat messages error:', error);
      throw error;
    }
  }
  
  // Delete chat
  async deleteChat(chatId, userId) {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        'participants.user': userId
      });
      
      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }
      
      await chat.remove();
      return true;
    } catch (error) {
      console.error('Delete chat error:', error);
      throw error;
    }
  }
}

module.exports = ChatService; 