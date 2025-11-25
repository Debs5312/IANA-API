const express = require('express');
const { getRegistry, getLanguageRegistry, createConceptSchemeHandler, createConceptHandler, fetchConceptHandler } = require('../controllers/registryController');

const router = express.Router();

router.get('/registry', getRegistry);
router.get('/registry/language', getLanguageRegistry);
router.get('/concepts', fetchConceptHandler);
router.post('/createConceptScheme', createConceptSchemeHandler);
router.post('/createConcept', createConceptHandler);


module.exports = router;
