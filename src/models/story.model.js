const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  media: {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    metadata: {
      size: Number,
      duration: Number,
      format: String
    }
  },
  viewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'sad', 'angry'],
      default: 'like'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    name: String
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [String],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    reactions: {
      type: Number,
      default: 0
    },
    replies: {
      type: Number,
      default: 0
    }
  },
  expiresAt: {
    type: Date,
    required: true
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
storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ 'location.coordinates': '2dsphere' });
storySchema.index({ hashtags: 1 });
storySchema.index({ mentions: 1 });

// Methods
storySchema.methods.addViewer = async function(userId) {
  if (!this.viewers.some(viewer => viewer.user.toString() === userId.toString())) {
    this.viewers.push({ user: userId });
    this.analytics.views += 1;
    await this.save();
  }
};

storySchema.methods.addReaction = async function(userId, type = 'like') {
  const existingReaction = this.reactions.find(
    reaction => reaction.user.toString() === userId.toString()
  );

  if (existingReaction) {
    existingReaction.type = type;
  } else {
    this.reactions.push({ user: userId, type });
    this.analytics.reactions += 1;
  }

  await this.save();
};

storySchema.methods.addReply = async function(userId, content) {
  this.replies.push({
    user: userId,
    content
  });
  this.analytics.replies += 1;
  await this.save();
};

// Pre-save middleware to check expiration
storySchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  }
  next();
});

const Story = mongoose.model('Story', storySchema);

module.exports = Story; 