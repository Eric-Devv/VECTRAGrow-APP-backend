const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['public', 'private', 'secret'],
    default: 'public'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  inviteLink: {
    type: String,
    unique: true
  },
  inviteLinkEnabled: {
    type: Boolean,
    default: true
  },
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
    membersCanInvite: {
      type: Boolean,
      default: true
    },
    membersCanPost: {
      type: Boolean,
      default: true
    },
    membersCanComment: {
      type: Boolean,
      default: true
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
      default: 'Welcome to the group!'
    }
  },
  media: {
    profilePhoto: String,
    coverPhoto: String
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
    memberCount: {
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
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ inviteLink: 1 });

// Pre-save middleware to update member count
groupSchema.pre('save', function(next) {
  this.stats.memberCount = this.members.length;
  next();
});

// Methods
groupSchema.methods.addMember = async function(userId, role = 'member', invitedBy = null) {
  if (!this.members.some(m => m.user.toString() === userId.toString())) {
    this.members.push({
      user: userId,
      role,
      joinedAt: new Date(),
      invitedBy
    });
    await this.save();
  }
};

groupSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  await this.save();
};

groupSchema.methods.updateMemberRole = async function(userId, newRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = newRole;
    await this.save();
  }
};

groupSchema.methods.generateInviteLink = function() {
  const randomString = Math.random().toString(36).substring(2, 15);
  this.inviteLink = `${process.env.FRONTEND_URL}/join/${this._id}/${randomString}`;
  return this.inviteLink;
};

// Static methods
groupSchema.statics.findByInviteLink = function(inviteLink) {
  return this.findOne({ inviteLink });
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group; 