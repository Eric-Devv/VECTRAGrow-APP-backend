const KYC = require('../models/kyc.model');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

class KYCService {
  async initiateVerification(userId, data) {
    const kyc = new KYC({
      user: userId,
      personalInfo: data.personalInfo,
      businessInfo: data.businessInfo,
      documents: data.documents
    });

    await kyc.save();
    return kyc;
  }

  async submitDocument(userId, documentType, documentUrl) {
    const kyc = await KYC.findOne({ user: userId });
    if (!kyc) {
      throw new Error('KYC verification not initiated');
    }

    kyc.documents.push({
      type: documentType,
      url: documentUrl,
      status: 'pending'
    });

    await kyc.save();
    return kyc;
  }

  async verifyDocument(userId, documentId, status, remarks) {
    const kyc = await KYC.findOne({ user: userId });
    if (!kyc) {
      throw new Error('KYC verification not found');
    }

    const document = kyc.documents.id(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    document.status = status;
    document.remarks = remarks;
    document.verifiedAt = new Date();

    await kyc.save();
    return kyc;
  }

  async updateVerificationStatus(userId, status, remarks) {
    const kyc = await KYC.findOne({ user: userId });
    if (!kyc) {
      throw new Error('KYC verification not found');
    }

    kyc.status = status;
    kyc.remarks = remarks;

    if (status === 'approved') {
      const user = await User.findById(userId);
      const verificationScore = kyc.calculateVerificationScore();
      await user.updateVerificationScore(verificationScore);

      // Add verification badges based on verified documents
      if (kyc.documents.some(doc => doc.type === 'identity' && doc.status === 'verified')) {
        await user.addVerificationBadge('identity');
      }
      if (kyc.documents.some(doc => doc.type === 'business' && doc.status === 'verified')) {
        await user.addVerificationBadge('business');
      }

      // Send notification
      await this.sendVerificationNotification(user, 'approved');
    } else if (status === 'rejected') {
      const user = await User.findById(userId);
      await this.sendVerificationNotification(user, 'rejected', remarks);
    }

    await kyc.save();
    return kyc;
  }

  async getVerificationStatus(userId) {
    const kyc = await KYC.findOne({ user: userId })
      .populate('user', 'firstName lastName email phoneNumber');
    return kyc;
  }

  async getPendingVerifications() {
    const kycs = await KYC.find({ status: 'pending' })
      .populate('user', 'firstName lastName email phoneNumber');
    return kycs;
  }

  async sendVerificationNotification(user, status, remarks = '') {
    const emailTemplate = status === 'approved'
      ? 'kycApproved'
      : 'kycRejected';

    const smsTemplate = status === 'approved'
      ? 'kycApproved'
      : 'kycRejected';

    // Send email notification
    if (user.settings.emailNotifications) {
      await sendEmail({
        to: user.email,
        template: emailTemplate,
        context: {
          name: user.firstName,
          remarks
        }
      });
    }

    // Send SMS notification
    if (user.settings.smsNotifications && user.phoneNumber) {
      await sendSMS({
        to: user.phoneNumber,
        template: smsTemplate,
        context: {
          name: user.firstName,
          remarks
        }
      });
    }
  }

  async addVerificationBadge(userId, badge) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await user.addVerificationBadge(badge);
    return user;
  }

  async removeVerificationBadge(userId, badge) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await user.removeVerificationBadge(badge);
    return user;
  }

  async getVerificationBadges(userId) {
    const user = await User.findById(userId)
      .select('verificationBadges verificationScore isVerified');
    return user;
  }
}

module.exports = new KYCService(); 