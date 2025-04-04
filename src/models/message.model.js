const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'media', 'poll', 'link', 'file'],
    default: 'text'
  },
  content: {
    text: String,
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'document', 'audio'],
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
        width: Number,
        height: Number,
        format: String
      }
    }],
    poll: {
      question: String,
      options: [{
        text: String,
        votes: [{
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          votedAt: {
            type: Date,
            default: Date.now
          }
        }],
        voteCount: {
          type: Number,
          default: 0
        }
      }],
      settings: {
        multipleChoice: {
          type: Boolean,
          default: false
        },
        endTime: Date,
        showResults: {
          type: Boolean,
          default: true
        }
      }
    },
    link: {
      url: String,
      title: String,
      description: String,
      thumbnail: String
    },
    file: {
      name: String,
      url: String,
      size: Number,
      type: String
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  thread: {
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    replyCount: {
      type: Number,
      default: 0
    }
  },
  reactions: [{
    emoji: String,
    users: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reactedAt: {
        type: Date,
        default: Date.now
      }
    }],
    count: {
      type: Number,
      default: 0
    }
  }],
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'edited', 'deleted'],
    default: 'sent'
  },
  editedAt: Date,
  deletedAt: Date,
  metadata: {
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    forwardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scheduledFor: Date,
    pinnedAt: Date,
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ 'thread.parentMessage': 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Pre-save middleware to update counts
messageSchema.pre('save', function(next) {
  if (this.isModified('views')) {
    this.viewCount = this.views.length;
  }
  if (this.isModified('reactions')) {
    this.reactions.forEach(reaction => {
      reaction.count = reaction.users.length;
    });
  }
  next();
});

// Methods
messageSchema.methods.addReaction = async function(userId, emoji) {
  let reaction = this.reactions.find(r => r.emoji === emoji);
  if (!reaction) {
    reaction = {
      emoji,
      users: [],
      count: 0
    };
    this.reactions.push(reaction);
  }
  
  if (!reaction.users.some(u => u.user.toString() === userId.toString())) {
    reaction.users.push({
      user: userId,
      reactedAt: new Date()
    });
    reaction.count = reaction.users.length;
    await this.save();
  }
};

messageSchema.methods.removeReaction = async function(userId, emoji) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  if (reaction) {
    reaction.users = reaction.users.filter(u => u.user.toString() !== userId.toString());
    reaction.count = reaction.users.length;
    if (reaction.users.length === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
    await this.save();
  }
};

messageSchema.methods.addView = async function(userId) {
  if (!this.views.some(v => v.user.toString() === userId.toString())) {
    this.views.push({
      user: userId,
      viewedAt: new Date()
    });
    this.viewCount = this.views.length;
    await this.save();
  }
};

messageSchema.methods.votePoll = async function(userId, optionIndex) {
  if (this.type === 'poll' && this.content.poll) {
    const option = this.content.poll.options[optionIndex];
    if (option && !option.votes.some(v => v.user.toString() === userId.toString())) {
      if (!this.content.poll.settings.multipleChoice) {
        // Remove existing votes if multiple choice is not allowed
        this.content.poll.options.forEach(opt => {
          opt.votes = opt.votes.filter(v => v.user.toString() !== userId.toString());
          opt.voteCount = opt.votes.length;
        });
      }
      option.votes.push({
        user: userId,
        votedAt: new Date()
      });
      option.voteCount = option.votes.length;
      await this.save();
    }
  }
};

messageSchema.methods.edit = async function(newContent) {
  this.content = newContent;
  this.status = 'edited';
  this.editedAt = new Date();
  await this.save();
};

messageSchema.methods.delete = async function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.content = null;
  await this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 