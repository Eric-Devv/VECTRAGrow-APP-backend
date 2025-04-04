const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('passport');
const socketio = require('socket.io');
const http = require('http');
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

// Import middleware
const { errorHandler, errorTypeHandler } = require('./middleware/error');
const { createRateLimiter } = require('./middleware/auth');

// Import services
const chatService = require('./services/chat.service');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server);

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/profile', profileRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        socket.userId = user._id;
        chatService.handleConnection(socket);
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (socket.userId) {
      chatService.handleDisconnection(socket);
    }
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

module.exports = app; 