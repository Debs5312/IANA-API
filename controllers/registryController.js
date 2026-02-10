const { fetchRegistry, fetchRegistryFilterByLanguage, createConcept, fetchConcepts, deleteConcepts } = require('../models/registryModel');
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
    const data = await fetchRegistryFilterByLanguage();
    res.json(data);
  } catch (error) {
    logger.error('Error fetching or parsing language registry:', error);
    res.status(500).json({ error: 'Failed to fetch or parse the language subtag registry' });
  }
}

async function createConceptHandler (req, res) {
  logger.info(`Request received: POST ${req.path} from ${req.ip}`);
  try {
    const { projectUUID, parent } = req.body;
    const data = await createConcept(projectUUID, parent);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error creating concept:', error);
    res.status(500).json({ error: 'Failed to create concept' });
  }
}

async function fetchConceptHandler (req, res) {
  logger.info(`Request received: GET ${req.path} from ${req.ip}`);
  try {
    const { projectUUID, scheme } = req.query;
    const data = await fetchConcepts(projectUUID, scheme);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching concept:', error);
    res.status(500).json({ error: 'Failed to fetch concept' });
  }
}

async function deleteConceptHandler (req, res) {
  logger.info(`Request received: DELETE ${req.path} from ${req.ip}`);
  try {
    const { projectUUID, scheme } = req.query;
    const data = await deleteConcepts(projectUUID, scheme);
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === 'No concepts found to delete') {
      // Return 404 Not Found if no concepts are present
      logger.info('No concepts found to delete for the given scheme');
      res.status(404).json({ error: 'No concepts found to delete' });
    } else {
      logger.error('Error deleting concept:', error);
      res.status(500).json({ error: 'Failed to delete concept' });
    }
  }
}

module.exports = {
  getRegistry,
  getLanguageRegistry,
  createConceptHandler,
  fetchConceptHandler,
  deleteConceptHandler
};
