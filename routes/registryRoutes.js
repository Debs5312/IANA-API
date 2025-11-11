const express = require('express');
const { getRegistry, getLanguageRegistry } = require('../controllers/registryController');

const router = express.Router();

router.get('/registry', getRegistry);
router.get('/registry/language', getLanguageRegistry);

module.exports = router;
