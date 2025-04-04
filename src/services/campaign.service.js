const Campaign = require('../models/campaign.model');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

class CampaignService {
  // Create new campaign
  async createCampaign(campaignData) {
    try {
      const campaign = new Campaign(campaignData);
      await campaign.save();
      
      // Send notification to admin for approval
      await this.notifyAdminForApproval(campaign);
      
      return campaign;
    } catch (error) {
      console.error('Create campaign error:', error);
      throw error;
    }
  }
  
  // Update campaign
  async updateCampaign(campaignId, updateData, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        owner: userId
      });
      
      if (!campaign) {
        throw new Error('Campaign not found or unauthorized');
      }
      
      // Update campaign
      Object.assign(campaign, updateData);
      await campaign.save();
      
      // Notify investors about update
      await this.notifyInvestorsAboutUpdate(campaign);
      
      return campaign;
    } catch (error) {
      console.error('Update campaign error:', error);
      throw error;
    }
  }
  
  // Get campaign by ID
  async getCampaignById(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId)
        .populate('owner', 'firstName lastName profilePicture company')
        .populate('investors.user', 'firstName lastName profilePicture')
        .populate('comments.user', 'firstName lastName profilePicture');
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Increment views
      campaign.views += 1;
      await campaign.save();
      
      return campaign;
    } catch (error) {
      console.error('Get campaign error:', error);
      throw error;
    }
  }
  
  // Search campaigns
  async searchCampaigns(filters, page = 1, limit = 10) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.industry) {
        query.industry = filters.industry;
      }
      if (filters.location) {
        query['location.country'] = filters.location;
      }
      if (filters.minFunding) {
        query.fundingGoal = { $gte: filters.minFunding };
      }
      if (filters.maxFunding) {
        query.fundingGoal = { ...query.fundingGoal, $lte: filters.maxFunding };
      }
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Search with text index if search term provided
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      
      const campaigns = await Campaign.find(query)
        .populate('owner', 'firstName lastName profilePicture company')
        .sort(filters.sort || '-createdAt')
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await Campaign.countDocuments(query);
      
      return {
        campaigns,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Search campaigns error:', error);
      throw error;
    }
  }
  
  // Add milestone
  async addMilestone(campaignId, milestoneData, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        owner: userId
      });
      
      if (!campaign) {
        throw new Error('Campaign not found or unauthorized');
      }
      
      campaign.milestones.push(milestoneData);
      await campaign.save();
      
      // Notify investors about new milestone
      await this.notifyInvestorsAboutMilestone(campaign, milestoneData);
      
      return campaign;
    } catch (error) {
      console.error('Add milestone error:', error);
      throw error;
    }
  }
  
  // Update milestone
  async updateMilestone(campaignId, milestoneId, updateData, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        owner: userId
      });
      
      if (!campaign) {
        throw new Error('Campaign not found or unauthorized');
      }
      
      const milestone = campaign.milestones.id(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }
      
      Object.assign(milestone, updateData);
      await campaign.save();
      
      // Notify investors about milestone update
      await this.notifyInvestorsAboutMilestoneUpdate(campaign, milestone);
      
      return campaign;
    } catch (error) {
      console.error('Update milestone error:', error);
      throw error;
    }
  }
  
  // Add comment
  async addComment(campaignId, userId, content) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      await campaign.addComment(userId, content);
      
      // Notify campaign owner about new comment
      await this.notifyOwnerAboutComment(campaign, userId);
      
      return campaign;
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  }
  
  // Get trending campaigns
  async getTrendingCampaigns(limit = 5) {
    try {
      const campaigns = await Campaign.find({
        status: 'active'
      })
      .sort('-views')
      .limit(limit)
      .populate('owner', 'firstName lastName profilePicture company');
      
      return campaigns;
    } catch (error) {
      console.error('Get trending campaigns error:', error);
      throw error;
    }
  }
  
  // Get recommended campaigns
  async getRecommendedCampaigns(userId, limit = 5) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get campaigns based on user preferences
      const campaigns = await Campaign.find({
        status: 'active',
        category: { $in: user.investmentPreferences.industries },
        'location.country': { $in: user.investmentPreferences.preferredLocations },
        fundingGoal: {
          $gte: user.investmentPreferences.minInvestment,
          $lte: user.investmentPreferences.maxInvestment
        }
      })
      .sort('-createdAt')
      .limit(limit)
      .populate('owner', 'firstName lastName profilePicture company');
      
      return campaigns;
    } catch (error) {
      console.error('Get recommended campaigns error:', error);
      throw error;
    }
  }
  
  // Notify admin for approval
  async notifyAdminForApproval(campaign) {
    try {
      const admins = await User.find({ userType: 'admin' });
      
      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          template: 'campaignApproval',
          data: {
            firstName: admin.firstName,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
      }
    } catch (error) {
      console.error('Notify admin error:', error);
    }
  }
  
  // Notify investors about update
  async notifyInvestorsAboutUpdate(campaign) {
    try {
      const investors = await User.find({
        _id: { $in: campaign.investors.map(i => i.user) }
      });
      
      for (const investor of investors) {
        await sendEmail({
          to: investor.email,
          template: 'campaignUpdate',
          data: {
            firstName: investor.firstName,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
        
        if (investor.phoneNumber) {
          await sendSMS({
            to: investor.phoneNumber,
            template: 'campaignUpdate',
            data: {
              campaignTitle: campaign.title
            }
          });
        }
      }
    } catch (error) {
      console.error('Notify investors error:', error);
    }
  }
  
  // Notify investors about milestone
  async notifyInvestorsAboutMilestone(campaign, milestone) {
    try {
      const investors = await User.find({
        _id: { $in: campaign.investors.map(i => i.user) }
      });
      
      for (const investor of investors) {
        await sendEmail({
          to: investor.email,
          template: 'milestoneReached',
          data: {
            firstName: investor.firstName,
            campaignTitle: campaign.title,
            milestoneTitle: milestone.title,
            campaignId: campaign._id
          }
        });
      }
    } catch (error) {
      console.error('Notify investors about milestone error:', error);
    }
  }
  
  // Notify owner about comment
  async notifyOwnerAboutComment(campaign, commenterId) {
    try {
      const commenter = await User.findById(commenterId);
      const owner = await User.findById(campaign.owner);
      
      if (owner && commenter) {
        await sendEmail({
          to: owner.email,
          template: 'newComment',
          data: {
            firstName: owner.firstName,
            commenterName: `${commenter.firstName} ${commenter.lastName}`,
            campaignTitle: campaign.title,
            campaignId: campaign._id
          }
        });
      }
    } catch (error) {
      console.error('Notify owner about comment error:', error);
    }
  }
}

module.exports = new CampaignService(); 