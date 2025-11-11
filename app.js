const express = require('express');
const logger = require('./config/logger');
const registryRoutes = require('./routes/registryRoutes');

const app = express();
app.use(express.json());

// Middleware to restrict to only allowed endpoints
app.use((req, res, next) => {
  const allowedPaths = ['/api/registry', '/api/registry/language', '/api/createConceptScheme'];
  const path = req.path.replace(/\/$/, ''); // Remove trailing slash
  if (allowedPaths.includes(path)) {
    next();
  } else {
    logger.error(`Invalid request: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Use routes
app.use('/api', registryRoutes);

app.listen(5500, () => {
  console.log('Server running on port 5500');
});
