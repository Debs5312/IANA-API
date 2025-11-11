const express = require('express');
const { getRegistry, getLanguageRegistry, createConceptSchemeHandler } = require('../controllers/registryController');

const router = express.Router();

router.get('/registry', getRegistry);
router.get('/registry/language', getLanguageRegistry);
router.get('/createConceptScheme', createConceptSchemeHandler);

module.exports = router;
