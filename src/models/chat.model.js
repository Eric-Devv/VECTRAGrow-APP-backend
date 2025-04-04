const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  metadata: {
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: Date
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['investor', 'business_owner', 'admin'],
      required: true
    },
    lastSeen: Date,
    isOnline: {
      type: Boolean,
      default: false
    }
  }],
  
  // Chat type and context
  type: {
    type: String,
    enum: ['direct', 'campaign', 'support'],
    required: true
  },
  context: {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment'
    }
  },
  
  // Messages
  messages: [messageSchema],
  
  // Chat settings
  settings: {
    isArchived: {
      type: Boolean,
      default: false
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    pinnedMessages: [{
      type: mongoose.Schema.Types.ObjectId
    }]
  },
  
  // Notifications
  notifications: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['message', 'mention', 'reaction'],
      required: true
    },
    message: String,
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ 'context.campaign': 1 });
chatSchema.index({ 'context.investment': 1 });
chatSchema.index({ updatedAt: -1 });

// Methods
chatSchema.methods.addMessage = async function(senderId, content, type = 'text', metadata = {}) {
  const message = {
    sender: senderId,
    content,
    type,
    metadata,
    readBy: [{
      user: senderId,
      readAt: new Date()
    }]
  };
  
  this.messages.push(message);
  await this.save();
  
  return message;
};

chatSchema.methods.markAsRead = async function(userId) {
  const unreadMessages = this.messages.filter(msg => 
    !msg.readBy.some(read => read.user.toString() === userId.toString())
  );
  
  unreadMessages.forEach(msg => {
    msg.readBy.push({
      user: userId,
      readAt: new Date()
    });
    msg.status = 'read';
  });
  
  await this.save();
};

chatSchema.methods.updateParticipantStatus = async function(userId, isOnline) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isOnline = isOnline;
    participant.lastSeen = isOnline ? new Date() : participant.lastSeen;
    await this.save();
  }
};

chatSchema.methods.addNotification = async function(userId, type, message) {
  this.notifications.push({
    user: userId,
    type,
    message,
    isRead: false
  });
  
  await this.save();
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat; 