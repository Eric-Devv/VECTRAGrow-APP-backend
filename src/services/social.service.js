const Post = require('../models/post.model');
const Group = require('../models/group.model');
const Channel = require('../models/channel.model');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

class SocialService {
  // Post methods
  async createPost(userId, data) {
    const post = new Post({
      author: userId,
      content: data.content,
      media: data.media,
      visibility: data.visibility,
      tags: data.tags,
      mentions: data.mentions
    });

    await post.save();

    // Notify mentioned users
    if (data.mentions && data.mentions.length > 0) {
      await this.notifyMentionedUsers(data.mentions, post);
    }

    return post;
  }

  async getPost(postId) {
    const post = await Post.findById(postId)
      .populate('author', 'firstName lastName profilePicture')
      .populate('mentions', 'firstName lastName profilePicture')
      .populate('likes.user', 'firstName lastName profilePicture')
      .populate('comments.user', 'firstName lastName profilePicture')
      .populate('comments.replies.user', 'firstName lastName profilePicture');
    return post;
  }

  async getUserPosts(userId, page = 1, limit = 10) {
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'firstName lastName profilePicture')
      .populate('mentions', 'firstName lastName profilePicture');
    return posts;
  }

  async likePost(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.addLike(userId);
    return post;
  }

  async unlikePost(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.removeLike(userId);
    return post;
  }

  async addComment(userId, postId, content) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.addComment(userId, content);
    return post;
  }

  async addReply(userId, postId, commentId, content) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    await post.addReply(userId, commentId, content);
    return post;
  }

  // Group methods
  async createGroup(userId, data) {
    const group = new Group({
      name: data.name,
      description: data.description,
      creator: userId,
      category: data.category,
      privacy: data.privacy,
      rules: data.rules,
      media: data.media
    });

    // Add creator as admin
    group.admins.push(userId);
    group.members.push({
      user: userId,
      role: 'admin',
      joinedAt: new Date()
    });

    await group.save();
    return group;
  }

  async getGroup(groupId) {
    const group = await Group.findById(groupId)
      .populate('creator', 'firstName lastName profilePicture')
      .populate('admins', 'firstName lastName profilePicture')
      .populate('moderators', 'firstName lastName profilePicture')
      .populate('members.user', 'firstName lastName profilePicture')
      .populate('posts');
    return group;
  }

  async joinGroup(userId, groupId) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.privacy === 'private') {
      group.joinRequests.push({
        user: userId,
        message: 'Request to join group',
        status: 'pending'
      });
    } else {
      await group.addMember(userId);
    }

    await group.save();
    return group;
  }

  async leaveGroup(userId, groupId) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    await group.removeMember(userId);
    return group;
  }

  async updateMemberRole(groupId, userId, role) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    await group.updateMemberRole(userId, role);
    return group;
  }

  // Channel methods
  async createChannel(userId, data) {
    const channel = new Channel({
      name: data.name,
      description: data.description,
      owner: userId,
      category: data.category,
      privacy: data.privacy,
      rules: data.rules,
      media: data.media,
      settings: data.settings
    });

    // Add owner as admin
    channel.admins.push(userId);
    channel.subscribers.push({
      user: userId,
      subscribedAt: new Date()
    });

    await channel.save();
    return channel;
  }

  async getChannel(channelId) {
    const channel = await Channel.findById(channelId)
      .populate('owner', 'firstName lastName profilePicture')
      .populate('admins', 'firstName lastName profilePicture')
      .populate('moderators', 'firstName lastName profilePicture')
      .populate('subscribers.user', 'firstName lastName profilePicture')
      .populate('posts')
      .populate('pinnedPosts');
    return channel;
  }

  async subscribeToChannel(userId, channelId) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    await channel.addSubscriber(userId);
    return channel;
  }

  async unsubscribeFromChannel(userId, channelId) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    await channel.removeSubscriber(userId);
    return channel;
  }

  async pinPost(channelId, postId) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    await channel.pinPost(postId);
    return channel;
  }

  async unpinPost(channelId, postId) {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    await channel.unpinPost(postId);
    return channel;
  }

  // Notification methods
  async notifyMentionedUsers(userIds, post) {
    const users = await User.find({ _id: { $in: userIds } });
    
    for (const user of users) {
      if (user.settings.emailNotifications) {
        await sendEmail({
          to: user.email,
          template: 'postMention',
          context: {
            name: user.firstName,
            postId: post._id,
            authorName: post.author.firstName
          }
        });
      }

      if (user.settings.smsNotifications && user.phoneNumber) {
        await sendSMS({
          to: user.phoneNumber,
          template: 'postMention',
          context: {
            name: user.firstName,
            postId: post._id,
            authorName: post.author.firstName
          }
        });
      }
    }
  }
}

module.exports = new SocialService(); 