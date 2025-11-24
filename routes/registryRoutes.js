const express = require('express');
const { getRegistry, getLanguageRegistry, createConceptSchemeHandler } = require('../controllers/registryController');

const router = express.Router();

router.get('/registry', getRegistry);
router.get('/registry/language', getLanguageRegistry);
router.post('/createConceptScheme', createConceptSchemeHandler);

module.exports = router;
