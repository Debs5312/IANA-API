const express = require('express');
const { getLanguageRegistry, upsertConceptHandler, fetchConceptHandler } = require('../controllers/registryController');

const router = express.Router();

/**
 * @route GET /registry/language
 * @summary Fetch filtered IANA language registry (non-deprecated languages)
 * @handler getLanguageRegistry
 */
router.get('/registry/language', getLanguageRegistry);
/**
 * @route GET /concepts
 * @summary Fetch all existing concepts from PoolParty project/scheme
 * @query {string} projectUUID - PoolParty project ID (required)
 * @query {string} scheme - Concept scheme (required)
 * @handler fetchConceptHandler
 */
router.get('/concepts', fetchConceptHandler);
/**
 * @route POST /upsertConcept
 * @summary Sync IANA languages to PoolParty (upsert concepts, handle duplicates/deprecated)
 * @body {string} projectUUID - PoolParty project ID (required)
 * @body {string} parent - Parent concept URI (required)
 * @handler upsertConceptHandler
 */
router.post('/upsertConcept', upsertConceptHandler);
/**
 * @route DELETE /deleteConcept
 * @summary Delete all top concepts for project/scheme from PoolParty
 * @query {string} projectUUID - PoolParty project ID (required)
 * @query {string} scheme - Concept scheme (required)
 * @handler deleteConceptHandler (commented out)
 */
// router.delete('/deleteConcept', deleteConceptHandler);
module.exports = router;
