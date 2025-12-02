const express = require('express');
const { getRegistry, getLanguageRegistry, createConceptHandler, fetchConceptHandler, deleteConceptHandler } = require('../controllers/registryController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/registry', getRegistry);
router.get('/registry/language', getLanguageRegistry);
router.get('/concepts', authenticateToken, fetchConceptHandler);
// router.post('/createConceptScheme', createConceptSchemeHandler);
router.post('/createConcept', authenticateToken, createConceptHandler);
router.delete('/deleteConcept', authenticateToken, deleteConceptHandler);


module.exports = router;
