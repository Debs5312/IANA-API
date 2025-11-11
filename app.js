require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { logger } = require('./config/logger');
const registryRoutes = require('./routes/registryRoutes');

const app = express();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing middleware
app.use(express.json());

// Middleware to restrict to only allowed endpoints (moved after routes to act as 404 handler)
app.use('/api', registryRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  logger.error(`Invalid request: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5500;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});
