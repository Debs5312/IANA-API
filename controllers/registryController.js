const { fetchRegistry, fetchRegistryFilterByLanguage, upsertConcept, getTopConcepts, deleteConcepts } = require('../models/registryModel');
const { logger } = require('../config/logger');

/**
 * Fetches the complete IANA language subtag registry data.
 * @route GET /registry
 * @returns {Promise<void>} JSON response with registry data or 500 error
 */
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

/**
 * Fetches filtered IANA language subtag registry (language type only, non-deprecated).
 * @route GET /registry/language
 * @returns {Promise<void>} JSON response with language data or 500 error
 */
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

/**
 * Handles concept upsert/create operation for language subtags in PoolParty.
 * Processes languages, handles duplicates/deprecated, syncs altLabels.
 * @route POST /upsertConcept
 * @param {Object} req.body - { projectUUID, parent }
 * @returns {Promise<void>} JSON { success, data } or 500 error
 */
async function upsertConceptHandler (req, res) {
  logger.info(`Request received: POST ${req.path} from ${req.ip}`);
  try {
    const { projectUUID, parent } = req.body;
    const data = await upsertConcept(projectUUID, parent);
    res.json({ success: true, data });
  } catch (error) {
    logger.error(`Error updating or creating concept: + ${error.message}`);
    res.status(500).json({ error: 'Failed to create or update concept' });
  }
}

/**
 * Fetches top concepts from PoolParty for given project and scheme.
 * @route GET /concepts
 * @query {string} projectUUID - PoolParty project ID
 * @query {string} scheme - Concept scheme identifier
 * @returns {Promise<void>} JSON { success, data } or 500 error
 */
async function fetchConceptHandler (req, res) {
  logger.info(`Request received: GET ${req.path} from ${req.ip}`);
  try {
    const { projectUUID, scheme } = req.query;
    const data = await getTopConcepts(projectUUID, scheme);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching concept:', error);
    res.status(500).json({ error: 'Failed to fetch concept' });
  }
}

/**
 * Deletes all top concepts for given project and scheme from PoolParty.
 * Returns 404 if no concepts found.
 * @route DELETE /deleteConcept
 * @query {string} projectUUID - PoolParty project ID
 * @query {string} scheme - Concept scheme identifier
 * @returns {Promise<void>} JSON { success, data } or 404/500 error
 */
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
  upsertConceptHandler,
  fetchConceptHandler,
  deleteConceptHandler
};
