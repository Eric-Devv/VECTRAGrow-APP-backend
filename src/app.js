const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('passport');
const socketio = require('socket.io');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const campaignRoutes = require('./routes/campaign.routes');
const investmentRoutes = require('./routes/investment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const chatRoutes = require('./routes/chat.routes');
const kycRoutes = require('./routes/kyc.routes');
const socialRoutes = require('./routes/social.routes');
const profileRoutes = require('./routes/profile.routes');
const channelRoutes = require('./routes/channel.routes');
const groupRoutes = require('./routes/group.routes');

// Import middleware
const { errorHandler, errorTypeHandler } = require('./middleware/error');
const { createRateLimiter } = require('./middleware/auth');

// Import services
const chatService = require('./services/chat.service');
const User = require('./models/user.model');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Initialize passport
app.use(passport.initialize());
require('./config/passport')(passport);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
app.use('/api/', createRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
app.use('/api/auth/', createRateLimiter(60 * 60 * 1000, 5)); // 5 requests per hour for auth routes

// General middleware
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/groups', groupRoutes);

// Socket.IO connection handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.user._id);
  
  // Join user's channels and groups
  socket.on('join-channels', async (channels) => {
    channels.forEach(channel => {
      socket.join(`channel:${channel}`);
    });
  });

  socket.on('join-groups', async (groups) => {
    groups.forEach(group => {
      socket.join(`group:${group}`);
    });
  });

  // Handle channel messages
  socket.on('channel-message', async (data) => {
    io.to(`channel:${data.channelId}`).emit('new-message', {
      ...data,
      sender: socket.user._id,
      timestamp: new Date()
    });
  });

  // Handle group messages
  socket.on('group-message', async (data) => {
    io.to(`group:${data.groupId}`).emit('new-message', {
      ...data,
      sender: socket.user._id,
      timestamp: new Date()
    });
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    socket.to(data.room).emit('user-typing', {
      userId: socket.user._id,
      username: socket.user.username
    });
  });

  socket.on('typing-stop', (data) => {
    socket.to(data.room).emit('user-stopped-typing', {
      userId: socket.user._id
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.user._id);
  });
});

// Error handling
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  const error = errorTypeHandler(err);
  errorHandler(error, req, res, next);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

module.exports = { app, io }; 