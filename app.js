const express = require('express');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: 'logs/info.log',
      level: 'info',
      format: winston.format.combine(
        winston.format((info) => {
          if (info.level === 'error') return false;
          return info;
        })(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.simple()
      )
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
app.use(express.json());

// Middleware to restrict to only allowed endpoints
app.use((req, res, next) => {
  const allowedPaths = ['/api/registry', '/api/registry/language'];
  const path = req.path.replace(/\/$/, ''); // Remove trailing slash
  if (allowedPaths.includes(path)) {
    next();
  } else {
    logger.error(`Invalid request: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

const IANA_URL = 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry';

function parseRegistry(text) {
  const lines = text.split('\n');
  const result = [];
  let current = {};
  for (let line of lines) {
    line = line.trim();
    if (line === '' || line === '%%') {
      if (Object.keys(current).length > 0) {
        result.push(current);
        current = {};
      }
    } else {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        current[key] = value;
      }
    }
  }
  if (Object.keys(current).length > 0) {
    result.push(current);
  }
  // Skip the header record (File-Date)
  if (result.length > 0 && result[0]['File-Date']) {
    return result.slice(1);
  }
  return result;
}

app.get('/api/registry', async (req, res) => {
  logger.info(`Request received: ${req.method} ${req.path}`);
  try {
    const response = await axios.get(IANA_URL, { family: 4 });
    const data = parseRegistry(response.data);
    res.json(data);
  } catch (error) {
    logger.error('Error fetching or parsing registry:', error);
    res.status(500).json({ error: 'Failed to fetch or parse the language subtag registry' });
  }
});

app.get('/api/registry/language', async (req, res) => {
  logger.info(`Request received: ${req.method} ${req.path}`);
  try {
    const response = await axios.get(IANA_URL, { family: 4 });
    const data = parseRegistry(response.data);
    const languageData = data.filter(obj => obj['Type'] === 'language').map(obj => ({ Subtag: obj.Subtag, Description: obj.Description }));
    res.json(languageData);
  } catch (error) {
    logger.error('Error fetching or parsing language registry:', error);
    res.status(500).json({ error: 'Failed to fetch or parse the language subtag registry' });
  }
});

app.listen(5500, () => {
  console.log('Server running on port 5500');
});
