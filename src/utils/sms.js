const twilio = require('twilio');

// Create Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SMS templates
const templates = {
  verification: (code) => ({
    body: `Your VECTRAGrow verification code is: ${code}. Valid for 10 minutes.`
  }),
  
  passwordReset: (code) => ({
    body: `Your VECTRAGrow password reset code is: ${code}. Valid for 10 minutes.`
  }),
  
  investmentConfirmation: (amount, campaign) => ({
    body: `Your investment of $${amount} in "${campaign}" has been confirmed. Track your investment in the VECTRAGrow app.`
  }),
  
  campaignUpdate: (campaign, message) => ({
    body: `Update on "${campaign}": ${message}`
  }),
  
  milestoneReached: (campaign, milestone) => ({
    body: `Congratulations! Your campaign "${campaign}" has reached the milestone: ${milestone}`
  }),
  
  invite: (name, link) => ({
    body: `${name} has invited you to join VECTRAGrow. Click here to join: ${link}`
  }),
  
  loginAlert: (user) => ({
    body: `New login detected on your VECTRAGrow account. If this wasn't you, please contact support immediately.`
  }),
  
  paymentReminder: (amount, dueDate) => ({
    body: `Reminder: Payment of $${amount} is due on ${dueDate}. Please ensure timely payment.`
  }),
  
  securityAlert: (type, details) => ({
    body: `Security Alert: ${type}. ${details} If this wasn't you, please contact support immediately.`
  })
};

// Send SMS function
async function sendSMS({ to, template, context }) {
  try {
    if (!templates[template]) {
      throw new Error(`SMS template '${template}' not found`);
    }

    const { body } = templates[template](context);

    const message = await client.messages.create({
      body,
      to,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log('SMS sent:', message.sid);
    return message;
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw error;
  }
}

// Send bulk SMS
exports.sendBulkSMS = async (recipients, template, data) => {
  try {
    const smsPromises = recipients.map(recipient => 
      exports.sendSMS({
        to: recipient.phoneNumber,
        template,
        data: { ...data, ...recipient }
      })
    );
    
    const results = await Promise.allSettled(smsPromises);
    return results;
  } catch (error) {
    console.error('Error sending bulk SMS:', error);
    throw error;
  }
};

// Generate verification code
exports.generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Verify phone number
exports.verifyPhoneNumber = async (phoneNumber) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneNumber, channel: 'sms' });
    
    return verification;
  } catch (error) {
    console.error('Error verifying phone number:', error);
    throw error;
  }
};

// Check verification code
exports.checkVerificationCode = async (phoneNumber, code) => {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phoneNumber, code });
    
    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Error checking verification code:', error);
    throw error;
  }
};

// Send 2FA code
exports.send2FACode = async (phoneNumber, code) => {
  try {
    return await exports.sendSMS({
      to: phoneNumber,
      template: 'verification',
      data: code
    });
  } catch (error) {
    console.error('Error sending 2FA code:', error);
    throw error;
  }
};

// Verify Twilio configuration
exports.verifyTwilioConfig = async () => {
  try {
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('Twilio configuration is valid');
    return true;
  } catch (error) {
    console.error('Twilio configuration error:', error);
    return false;
  }
};

module.exports = {
  sendSMS
}; 