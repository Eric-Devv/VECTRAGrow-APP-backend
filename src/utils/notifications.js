const { io } = require('../app');
const User = require('../models/user.model');

class NotificationService {
  static async sendToUser(userId, notification) {
    try {
      io.to(`user:${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  static async sendToChannel(channelId, notification) {
    try {
      io.to(`channel:${channelId}`).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending notification to channel:', error);
    }
  }

  static async sendToGroup(groupId, notification) {
    try {
      io.to(`group:${groupId}`).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending notification to group:', error);
    }
  }

  static async sendToMultipleUsers(userIds, notification) {
    try {
      userIds.forEach(userId => {
        io.to(`user:${userId}`).emit('notification', {
          ...notification,
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error('Error sending notification to multiple users:', error);
    }
  }

  static async sendToAdmins(notification) {
    try {
      const admins = await User.find({ role: 'admin' });
      admins.forEach(admin => {
        io.to(`user:${admin._id}`).emit('notification', {
          ...notification,
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error('Error sending notification to admins:', error);
    }
  }
}

module.exports = NotificationService; 