const express = require('express');
const { getRegistry, getLanguageRegistry, upsertConceptHandler, fetchConceptHandler, deleteConceptHandler } = require('../controllers/registryController');

const router = express.Router();

// router.get('/registry', getRegistry);
router.get('/registry/language', getLanguageRegistry);
router.get('/concepts', fetchConceptHandler);
router.post('/upsertConcept', upsertConceptHandler);
// router.delete('/deleteConcept', deleteConceptHandler);
module.exports = router;
