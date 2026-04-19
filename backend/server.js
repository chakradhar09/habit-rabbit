const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');

// Initialize express
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const localDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173'
];

const allowedOrigins = isProduction
  ? [...new Set(configuredOrigins)]
  : [...new Set([...configuredOrigins, ...localDevOrigins])];

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('FRONTEND_URL or FRONTEND_URLS must be configured in production.');
}

// Connect to database
connectDB();
app.set('trust proxy', 1);

// Middleware
const helmetConfig = {
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"]
        }
      }
    : false
};

app.use(helmet(helmetConfig));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin denied'));
  },
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Habit Rabbit API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message === 'CORS origin denied') {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed by CORS policy.'
    });
  }

  logger.error('Unhandled server error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_RETRIES = isProduction ? 0 : 10;

const applyServerTimeouts = (serverInstance) => {
  serverInstance.keepAliveTimeout = 65000;
  serverInstance.headersTimeout = 66000;
};

const startServer = (port, retriesLeft = MAX_PORT_RETRIES) => {
  const server = http.createServer(app);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      logger.warn('Port is in use, retrying on next port', {
        occupiedPort: port,
        nextPort
      });
      startServer(nextPort, retriesLeft - 1);
      return;
    }

    logger.error('Server failed to start', {
      port,
      code: error.code,
      error: error.message
    });
    process.exit(1);
  });

  server.listen(port, () => {
    logger.info('Habit Rabbit server started', {
      port,
      apiUrl: `http://localhost:${port}/api`,
      frontendUrl: `http://localhost:${port}`,
      isProduction,
      allowedOrigins
    });
  });

  applyServerTimeouts(server);
};

startServer(DEFAULT_PORT);
