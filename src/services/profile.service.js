const User = require('../models/user.model');
const Campaign = require('../models/campaign.model');
const Post = require('../models/post.model');
const Group = require('../models/group.model');
const Channel = require('../models/channel.model');
const Story = require('../models/story.model');
const Ad = require('../models/ad.model');
const Investment = require('../models/investment.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const { generateQRCode } = require('../utils/qr');
const { uploadToCloudinary } = require('../utils/cloudinary');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');

class ProfileService {
  // Profile Management
  async updateProfile(userId, data) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update basic info
    Object.assign(user, {
      firstName: data.firstName || user.firstName,
      lastName: data.lastName || user.lastName,
      bio: data.bio || user.bio,
      location: data.location || user.location,
      website: data.website || user.website,
      company: data.company || user.company,
      jobTitle: data.jobTitle || user.jobTitle,
      industry: data.industry || user.industry,
      skills: data.skills || user.skills,
      interests: data.interests || user.interests,
      socialLinks: data.socialLinks || user.socialLinks
    });

    await user.save();
    return user;
  }

  async updateProfilePhoto(userId, photoFile) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const result = await uploadToCloudinary(photoFile, 'profile_photos');
    user.profilePicture = result.secure_url;
    await user.save();
    return user;
  }

  async updateCoverPhoto(userId, photoFile) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const result = await uploadToCloudinary(photoFile, 'cover_photos');
    user.coverPhoto = result.secure_url;
    await user.save();
    return user;
  }

  // Campaign Management
  async getUserCampaigns(userId, page = 1, limit = 10) {
    const campaigns = await Campaign.find({ creator: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category')
      .populate('investments');
    return campaigns;
  }

  // Post Management
  async getUserPosts(userId, page = 1, limit = 10) {
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'firstName lastName profilePicture')
      .populate('mentions', 'firstName lastName profilePicture');
    return posts;
  }

  async schedulePost(userId, postData, scheduleTime) {
    const post = new Post({
      author: userId,
      content: postData.content,
      media: postData.media,
      visibility: postData.visibility,
      tags: postData.tags,
      mentions: postData.mentions,
      status: 'scheduled',
      scheduledFor: scheduleTime
    });

    await post.save();
    return post;
  }

  // Story Management
  async createStory(userId, mediaFile, duration = 24) {
    const result = await uploadToCloudinary(mediaFile, 'stories');
    const story = new Story({
      user: userId,
      media: {
        type: mediaFile.mimetype.startsWith('image/') ? 'image' : 'video',
        url: result.secure_url,
        thumbnail: mediaFile.mimetype.startsWith('video/') ? result.secure_url : null
      },
      expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000)
    });

    await story.save();
    return story;
  }

  async getStories(userId) {
    const stories = await Story.find({
      user: userId,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    return stories;
  }

  // Ad Management
  async createAd(userId, adData) {
    const ad = new Ad({
      creator: userId,
      title: adData.title,
      description: adData.description,
      targetAudience: adData.targetAudience,
      budget: adData.budget,
      duration: adData.duration,
      media: adData.media,
      status: 'pending'
    });

    await ad.save();
    return ad;
  }

  async getAds(userId) {
    const ads = await Ad.find({ creator: userId })
      .sort({ createdAt: -1 });
    return ads;
  }

  async trackAdPerformance(adId) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Ad not found');
    }

    return {
      views: ad.analytics.views,
      clicks: ad.analytics.clicks,
      conversions: ad.analytics.conversions,
      spend: ad.analytics.spend,
      ctr: ad.analytics.ctr,
      cpc: ad.analytics.cpc
    };
  }

  // Investment Tracking
  async getInvestmentProgress(userId) {
    const investments = await Investment.find({ investor: userId })
      .populate('campaign')
      .sort({ createdAt: -1 });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const returns = investments.reduce((sum, inv) => sum + (inv.returns || 0), 0);

    return {
      totalInvested,
      activeInvestments: activeInvestments.length,
      totalReturns: returns,
      roi: totalInvested > 0 ? (returns / totalInvested) * 100 : 0,
      investments
    };
  }

  // 2FA Management
  async setup2FA(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `VECTRAGrow:${user.email}`
    });

    user.mfaSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode: qrCodeUrl };
  }

  async verify2FA(userId, token) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      user.mfaEnabled = true;
      await user.save();
    }

    return verified;
  }

  // Social Connections
  async getSuggestedConnections(userId) {
    const user = await User.findById(userId);
    const suggestions = await User.find({
      _id: { $ne: userId },
      industry: user.industry,
      skills: { $in: user.skills },
      'following.user': { $ne: userId }
    })
    .limit(10)
    .select('firstName lastName profilePicture company jobTitle');
    return suggestions;
  }

  async findContacts(userId, contacts) {
    const users = await User.find({
      phoneNumber: { $in: contacts.map(c => c.phoneNumber) },
      _id: { $ne: userId }
    }).select('firstName lastName profilePicture phoneNumber');
    return users;
  }

  async inviteUser(userId, email, platform) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const inviteLink = `${process.env.FRONTEND_URL}/invite/${user._id}`;
    
    if (platform === 'email') {
      await sendEmail({
        to: email,
        template: 'invite',
        context: {
          name: user.firstName,
          inviteLink
        }
      });
    } else if (platform === 'sms') {
      await sendSMS({
        to: email, // Using email field for phone number in this case
        template: 'invite',
        context: {
          name: user.firstName,
          inviteLink
        }
      });
    }

    return { success: true };
  }

  // Profile Sharing
  async generateProfileLink(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const profileUrl = `${process.env.FRONTEND_URL}/profile/${user._id}`;
    const qrCode = await generateQRCode(profileUrl);
    
    return {
      profileUrl,
      qrCode
    };
  }

  // Notification Settings
  async updateNotificationSettings(userId, settings) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.settings = {
      ...user.settings,
      ...settings
    };

    await user.save();
    return user.settings;
  }

  // Login History
  async getLoginHistory(userId) {
    const user = await User.findById(userId)
      .select('loginHistory');
    return user.loginHistory;
  }

  // Social Login
  async linkSocialAccount(userId, platform, token) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (platform === 'google') {
      user.googleId = token;
    } else if (platform === 'linkedin') {
      user.linkedinId = token;
    }

    await user.save();
    return user;
  }
}

module.exports = new ProfileService(); 