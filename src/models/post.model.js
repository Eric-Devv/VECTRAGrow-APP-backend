const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document'],
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
  }],
  visibility: {
    type: String,
    enum: ['public', 'connections', 'private'],
    default: 'public'
  },
  tags: [String],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    platform: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    engagement: {
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
postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'analytics.engagement': -1 });

// Methods
postSchema.methods.addLike = async function(userId) {
  if (!this.likes.some(like => like.user.toString() === userId.toString())) {
    this.likes.push({ user: userId });
    this.analytics.engagement += 1;
    await this.save();
  }
};

postSchema.methods.removeLike = async function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  this.analytics.engagement -= 1;
  await this.save();
};

postSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content
  });
  this.analytics.engagement += 2;
  await this.save();
};

postSchema.methods.addReply = async function(commentId, userId, content) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.replies.push({
      user: userId,
      content
    });
    this.analytics.engagement += 1;
    await this.save();
  }
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 