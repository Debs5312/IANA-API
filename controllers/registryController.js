const { fetchRegistry, createConceptScheme } = require('../models/registryModel');
const { logger } = require('../config/logger');

async function getRegistry (req, res) {
  logger.info(`Request received: ${req.method} ${req.path} from ${req.ip}`);
  try {
    const data = await fetchRegistry();
    res.json(data);
  } catch (error) {
    logger.error('Error fetching or parsing registry:', error);
    res.status(500).json({ error: 'Failed to fetch or parse the language subtag registry' });
  }
}

async function getLanguageRegistry (req, res) {
  logger.info(`Request received: ${req.method} ${req.path} from ${req.ip}`);
  try {
    const data = await fetchRegistry();
    const languageData = data
      .filter(obj => obj.Type === 'language' && obj.Subtag)
      .map(obj => ({
        Subtag: obj.Subtag,
        Description: obj.Description || 'No description available'
      }));
    res.json(languageData);
  } catch (error) {
    logger.error('Error fetching or parsing language registry:', error);
    res.status(500).json({ error: 'Failed to fetch or parse the language subtag registry' });
  }
}

async function createConceptSchemeHandler (req, res) {
  logger.info(`Request received: POST ${req.path} from ${req.ip}`);
  try {
    const data = await createConceptScheme();
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating concept scheme:', error);
    res.status(500).json({ error: 'Failed to create concept scheme' });
  }
}

module.exports = {
  getRegistry,
  getLanguageRegistry,
  createConceptSchemeHandler
};
