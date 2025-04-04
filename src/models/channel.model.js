const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'moderator'],
      default: 'admin'
    },
    permissions: {
      canPost: {
        type: Boolean,
        default: true
      },
      canEdit: {
        type: Boolean,
        default: true
      },
      canDelete: {
        type: Boolean,
        default: true
      },
      canInvite: {
        type: Boolean,
        default: true
      },
      canPin: {
        type: Boolean,
        default: true
      }
    }
  }],
  subscribers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['subscriber', 'member'],
      default: 'subscriber'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  settings: {
    joinMode: {
      type: String,
      enum: ['open', 'approval', 'invite'],
      default: 'open'
    },
    slowMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number,
        default: 30 // seconds
      }
    },
    welcomeMessage: {
      type: String,
      default: 'Welcome to the channel!'
    },
    autoDelete: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number,
        default: 24 // hours
      }
    }
  },
  media: {
    profilePhoto: String,
    coverPhoto: String,
    banner: String
  },
  pinnedMessages: [{
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    pinnedAt: {
      type: Date,
      default: Date.now
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  stats: {
    subscriberCount: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    mediaCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ username: 1 });
channelSchema.index({ 'subscribers.user': 1 });

// Pre-save middleware to update subscriber count
channelSchema.pre('save', function(next) {
  this.stats.subscriberCount = this.subscribers.length;
  next();
});

// Methods
channelSchema.methods.addSubscriber = async function(userId, role = 'subscriber') {
  if (!this.subscribers.some(s => s.user.toString() === userId.toString())) {
    this.subscribers.push({
      user: userId,
      role,
      joinedAt: new Date()
    });
    await this.save();
  }
};

channelSchema.methods.removeSubscriber = async function(userId) {
  this.subscribers = this.subscribers.filter(s => s.user.toString() !== userId.toString());
  await this.save();
};

channelSchema.methods.updateSubscriberRole = async function(userId, newRole) {
  const subscriber = this.subscribers.find(s => s.user.toString() === userId.toString());
  if (subscriber) {
    subscriber.role = newRole;
    await this.save();
  }
};

channelSchema.methods.addAdmin = async function(userId, role = 'admin', permissions = {}) {
  if (!this.admins.some(a => a.user.toString() === userId.toString())) {
    this.admins.push({
      user: userId,
      role,
      permissions: {
        canPost: true,
        canEdit: true,
        canDelete: true,
        canInvite: true,
        canPin: true,
        ...permissions
      }
    });
    await this.save();
  }
};

channelSchema.methods.removeAdmin = async function(userId) {
  this.admins = this.admins.filter(a => a.user.toString() !== userId.toString());
  await this.save();
};

channelSchema.methods.updateAdminPermissions = async function(userId, permissions) {
  const admin = this.admins.find(a => a.user.toString() === userId.toString());
  if (admin) {
    admin.permissions = { ...admin.permissions, ...permissions };
    await this.save();
  }
};

// Static methods
channelSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel; 