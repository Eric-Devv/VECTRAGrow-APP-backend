# VECTRAGrow Backend

A comprehensive backend for the VECTRAGrow platform, providing APIs for user management, social interactions, campaign management, investments, KYC verification, and more.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [User Profile](#user-profile)
  - [Social Features](#social-features)
  - [Campaign Management](#campaign-management)
  - [Investment Management](#investment-management)
  - [KYC Verification](#kyc-verification)
  - [Chat System](#chat-system)
  - [Analytics](#analytics)
- [Security Implementation](#security-implementation)
- [Error Handling](#error-handling)
- [File Uploads](#file-uploads)
- [Real-time Features](#real-time-features)
- [Deployment](#deployment)

## Features

- **User Management**: Registration, authentication, profile management, and social connections
- **Social Features**: Posts, stories, groups, channels, comments, and reactions
- **Campaign Management**: Create, manage, and track crowdfunding campaigns
- **Investment Management**: Invest in campaigns, track returns, and manage payment methods
- **KYC Verification**: Document verification and verification badges
- **Chat System**: Real-time messaging between users
- **Analytics**: Track user engagement, campaign performance, and investment metrics
- **Security**: JWT authentication, role-based access control, and data protection
- **File Management**: Secure upload and storage of media files
- **Real-time Notifications**: Instant updates for important events

## Tech Stack

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB
- **JWT**: Authentication
- **Socket.IO**: Real-time communication
- **Cloudinary**: Media storage
- **Twilio**: SMS notifications
- **Nodemailer**: Email notifications
- **Multer**: File upload handling
- **Joi**: Request validation
- **Passport.js**: Authentication strategies

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Cloudinary account
- Twilio account (for SMS)
- SMTP server (for emails)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/vectragrow-backend.git
   cd vectragrow-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your credentials.

5. Start the development server:
   ```
   npm run dev
   ```

## API Documentation

### Authentication

#### Register a new user
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Data Constraints**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "token": "jwt_token_here",
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
    ```

#### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Data Constraints**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "token": "jwt_token_here",
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
    ```

#### Google OAuth Login
- **URL**: `/api/auth/google`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: Redirects to Google login page

#### LinkedIn OAuth Login
- **URL**: `/api/auth/linkedin`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: Redirects to LinkedIn login page

#### Request Password Reset
- **URL**: `/api/auth/forgot-password`
- **Method**: `POST`
- **Auth Required**: No
- **Data Constraints**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Password reset email sent"
    }
    ```

#### Reset Password
- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Auth Required**: No
- **Data Constraints**:
  ```json
  {
    "token": "reset_token",
    "password": "new_password"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Password successfully reset"
    }
    ```

#### Verify Email
- **URL**: `/api/auth/verify-email`
- **Method**: `POST`
- **Auth Required**: No
- **Data Constraints**:
  ```json
  {
    "token": "verification_token"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Email successfully verified"
    }
    ```

#### Get Current User
- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "profilePhoto": "url_to_photo",
      "coverPhoto": "url_to_cover",
      "bio": "User bio",
      "location": "User location",
      "website": "user_website",
      "emailVerified": true,
      "kycVerified": true,
      "twoFactorEnabled": false,
      "role": "user",
      "status": "active",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
    ```

#### Logout
- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

### User Profile

#### Get User Profile
- **URL**: `/api/profile`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: User profile data

#### Update Profile
- **URL**: `/api/profile`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "bio": "Updated bio",
    "location": "Updated location",
    "website": "updated_website"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated user profile

#### Update Profile Photo
- **URL**: `/api/profile/photo`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with `photo` file
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated user profile with new photo URL

#### Update Cover Photo
- **URL**: `/api/profile/cover`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with `cover` file
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated user profile with new cover photo URL

#### Get User Campaigns
- **URL**: `/api/profile/campaigns`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of user's campaigns

#### Get User Posts
- **URL**: `/api/profile/posts`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of user's posts

#### Create Post
- **URL**: `/api/profile/posts`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with `content`, `media` (up to 5 files), and other post data
- **Success Response**:
  - **Code**: 201
  - **Content**: Created post data

#### Get User Stories
- **URL**: `/api/profile/stories`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of user's stories

#### Create Story
- **URL**: `/api/profile/stories`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with `media` file
- **Success Response**:
  - **Code**: 201
  - **Content**: Created story data

#### Get User Ads
- **URL**: `/api/profile/ads`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of user's ads

#### Create Ad
- **URL**: `/api/profile/ads`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with `media` file and ad data
- **Success Response**:
  - **Code**: 201
  - **Content**: Created ad data

#### Get Investment Progress
- **URL**: `/api/profile/investments`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: User's investment progress data

#### Setup 2FA
- **URL**: `/api/profile/2fa/setup`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: 2FA setup data including QR code

#### Verify 2FA
- **URL**: `/api/profile/2fa/verify`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "code": "2fa_code"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: 2FA verification result

#### Get Suggested Connections
- **URL**: `/api/profile/connections`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of suggested connections

#### Invite User
- **URL**: `/api/profile/invite`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "email": "invite@example.com"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Invitation result

#### Generate Profile Sharing Link
- **URL**: `/api/profile/share`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "link": "sharing_link"
    }
    ```

#### Update Notification Settings
- **URL**: `/api/profile/notifications`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "email": true,
    "sms": false,
    "push": true,
    "loginAlerts": true,
    "investmentUpdates": true,
    "campaignUpdates": true,
    "socialInteractions": true
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated notification settings

#### Get Login History
- **URL**: `/api/profile/login-history`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of login history entries

#### Link Social Account
- **URL**: `/api/profile/social/link`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "platform": "google",
    "token": "oauth_token"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Social account linking result

### Social Features

#### Create Post
- **URL**: `/api/social/posts`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with `content`, `media` (up to 5 files), and other post data
- **Success Response**:
  - **Code**: 201
  - **Content**: Created post data

#### Get Post
- **URL**: `/api/social/posts/:postId`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Post data

#### Get User Posts
- **URL**: `/api/social/users/:userId/posts`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Success Response**:
  - **Code**: 200
  - **Content**: List of user's posts

#### Like Post
- **URL**: `/api/social/posts/:postId/like`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated post data

#### Unlike Post
- **URL**: `/api/social/posts/:postId/like`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated post data

#### Add Comment
- **URL**: `/api/social/posts/:postId/comments`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "content": "Comment content"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created comment data

#### Add Reply
- **URL**: `/api/social/posts/:postId/comments/:commentId/replies`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "content": "Reply content"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created reply data

#### Create Group
- **URL**: `/api/social/groups`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with group data and optional `coverImage` and `profileImage` files
- **Success Response**:
  - **Code**: 201
  - **Content**: Created group data

#### Get Group
- **URL**: `/api/social/groups/:groupId`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Group data

#### Join Group
- **URL**: `/api/social/groups/:groupId/join`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated group data

#### Leave Group
- **URL**: `/api/social/groups/:groupId/leave`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated group data

#### Update Member Role
- **URL**: `/api/social/groups/:groupId/members/:userId/role`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "role": "admin"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated group data

#### Create Channel
- **URL**: `/api/social/channels`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with channel data and optional `coverImage`, `profileImage`, and `banner` files
- **Success Response**:
  - **Code**: 201
  - **Content**: Created channel data

#### Get Channel
- **URL**: `/api/social/channels/:channelId`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Channel data

#### Subscribe to Channel
- **URL**: `/api/social/channels/:channelId/subscribe`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated channel data

#### Unsubscribe from Channel
- **URL**: `/api/social/channels/:channelId/unsubscribe`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated channel data

#### Pin Post
- **URL**: `/api/social/channels/:channelId/posts/:postId/pin`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated channel data

#### Unpin Post
- **URL**: `/api/social/channels/:channelId/posts/:postId/pin`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated channel data

### Campaign Management

#### Create Campaign
- **URL**: `/api/campaigns`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with campaign data and media files
- **Success Response**:
  - **Code**: 201
  - **Content**: Created campaign data

#### Get Campaigns
- **URL**: `/api/campaigns`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `category`: Filter by category
  - `status`: Filter by status
- **Success Response**:
  - **Code**: 200
  - **Content**: List of campaigns

#### Get Campaign
- **URL**: `/api/campaigns/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Campaign data

#### Update Campaign
- **URL**: `/api/campaigns/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Data Constraints**: Form data with updated campaign data
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated campaign data

#### Delete Campaign
- **URL**: `/api/campaigns/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Campaign deleted successfully"
    }
    ```

#### Invest in Campaign
- **URL**: `/api/campaigns/:id/invest`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "amount": 1000,
    "paymentMethodId": "payment_method_id"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Investment data

#### Get Campaign Investments
- **URL**: `/api/campaigns/:id/investments`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of campaign investments

#### Add Campaign Update
- **URL**: `/api/campaigns/:id/updates`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with update content and optional media
- **Success Response**:
  - **Code**: 201
  - **Content**: Created update data

#### Get Campaign Updates
- **URL**: `/api/campaigns/:id/updates`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of campaign updates

### Investment Management

#### Get User Investments
- **URL**: `/api/investments`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of user's investments

#### Get Investment Details
- **URL**: `/api/investments/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Investment details

#### Withdraw Investment
- **URL**: `/api/investments/:id/withdraw`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "amount": 500,
    "paymentMethodId": "payment_method_id"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Withdrawal data

#### Get Investment Returns
- **URL**: `/api/investments/returns`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Investment returns data

#### Add Payment Method
- **URL**: `/api/investments/payment-methods`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "type": "card",
    "details": {
      "number": "card_number",
      "expiryMonth": "12",
      "expiryYear": "2025",
      "cvv": "123"
    }
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created payment method data

#### Get Payment Methods
- **URL**: `/api/investments/payment-methods`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of payment methods

#### Remove Payment Method
- **URL**: `/api/investments/payment-methods/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Payment method removed successfully"
    }
    ```

### KYC Verification

#### Initiate KYC Verification
- **URL**: `/api/kyc/initiate`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "documentType": "passport",
    "documentNumber": "AB123456"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: KYC verification data

#### Submit Documents
- **URL**: `/api/kyc/documents`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with document files
- **Success Response**:
  - **Code**: 201
  - **Content**: Document submission data

#### Update Document Status
- **URL**: `/api/kyc/documents/:documentId`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "status": "verified",
    "notes": "Document verified successfully"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated document data

#### Update Verification Status
- **URL**: `/api/kyc/status`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "status": "verified",
    "notes": "KYC verification completed"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated verification status

#### Get Verification Status
- **URL**: `/api/kyc/status`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Verification status data

#### Get Pending Verifications
- **URL**: `/api/kyc/pending`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of pending verifications

#### Add Verification Badge
- **URL**: `/api/kyc/badges/:badge`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated badges data

#### Remove Verification Badge
- **URL**: `/api/kyc/badges/:badge`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated badges data

#### Get Verification Badges
- **URL**: `/api/kyc/badges`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of verification badges

### Chat System

#### Get Conversations
- **URL**: `/api/chat/conversations`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: List of conversations

#### Create Conversation
- **URL**: `/api/chat/conversations`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "participants": ["user_id_1", "user_id_2"],
    "type": "direct"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created conversation data

#### Get Conversation
- **URL**: `/api/chat/conversations/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Conversation data

#### Send Message
- **URL**: `/api/chat/conversations/:id/messages`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**: Form data with message content and optional media
- **Success Response**:
  - **Code**: 201
  - **Content**: Created message data

#### Get Messages
- **URL**: `/api/chat/conversations/:id/messages`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
- **Success Response**:
  - **Code**: 200
  - **Content**: List of messages

#### Mark as Read
- **URL**: `/api/chat/conversations/:id/read`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated conversation data

#### Delete Conversation
- **URL**: `/api/chat/conversations/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Conversation deleted successfully"
    }
    ```

### Analytics

#### Get User Analytics
- **URL**: `/api/analytics/user`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: User analytics data

#### Get Campaign Analytics
- **URL**: `/api/analytics/campaign/:campaignId`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Campaign analytics data

#### Track Page View
- **URL**: `/api/analytics/track/page-view`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "page": "profile",
    "referrer": "home"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Page view tracked successfully"
    }
    ```

#### Track Event
- **URL**: `/api/analytics/track/event`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "eventType": "button_click",
    "eventData": {
      "buttonId": "submit_button",
      "page": "checkout"
    }
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Event tracked successfully"
    }
    ```

#### Track Campaign Interaction
- **URL**: `/api/analytics/track/campaign/:campaignId`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data Constraints**:
  ```json
  {
    "interactionType": "view",
    "interactionData": {
      "source": "email",
      "duration": 120
    }
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Campaign interaction tracked successfully"
    }
    ```

#### Get Engagement Metrics
- **URL**: `/api/analytics/engagement`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**: Engagement metrics data

## Security Implementation

The backend implements several security measures to protect user data and ensure secure operations:

### Authentication

- **JWT-based Authentication**: All API endpoints (except registration and login) require a valid JWT token.
- **Token Verification**: The `verifyToken` middleware validates the token and checks if the user exists and is active.
- **Role-based Access Control**: The `checkRole` middleware ensures users have the required role for specific operations.
- **Email Verification**: The `requireVerification` middleware ensures users have verified their email.
- **KYC Verification**: The `requireKYC` middleware ensures users have completed KYC verification for sensitive operations.
- **Two-factor Authentication**: The `require2FA` middleware ensures users have enabled 2FA for high-security operations.

### Authorization

- **Resource Ownership**: The `checkOwnership` middleware ensures users can only access their own resources.
- **Group/Channel Membership**: The `checkMembership` middleware ensures users can only access groups/channels they are members of.
- **Action-specific Permissions**: The `checkPermission` middleware ensures users have the required permissions for specific actions.

### Data Protection

- **Input Validation**: All requests are validated using Joi schemas to prevent malicious data.
- **Rate Limiting**: Rate limiting is implemented to prevent abuse.
- **File Upload Restrictions**: File uploads are restricted by type and size.
- **Error Handling**: Errors are handled securely, with different responses for development and production environments.

## Error Handling

The backend implements a comprehensive error handling system:

- **Custom Error Class**: The `AppError` class extends the standard Error class to include status code and operational status.
- **Global Error Handler**: The `errorHandler` middleware handles all errors and formats the response based on the environment.
- **Error Type Handlers**: Specific error types (e.g., validation errors, JWT errors) are handled by dedicated functions.
- **Consistent Error Format**: All error responses follow a consistent format.

## File Uploads

The backend handles file uploads securely:

- **Multer Integration**: File uploads are handled using Multer.
- **Cloudinary Storage**: Files are stored in Cloudinary for secure and scalable storage.
- **File Type Validation**: Only allowed file types are accepted.
- **File Size Limits**: File sizes are limited to prevent abuse.

## Real-time Features

The backend implements real-time features using Socket.IO:

- **Socket Authentication**: Socket connections are authenticated using JWT tokens.
- **Real-time Chat**: Chat messages are delivered in real-time.
- **Notifications**: Notifications are sent in real-time.
- **Connection Management**: Socket connections are managed properly.

## Deployment

The backend can be deployed to various platforms:

- **Environment Variables**: All configuration is done through environment variables.
- **Docker Support**: The application can be containerized using Docker.
- **CI/CD Integration**: The application can be integrated with CI/CD pipelines.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 