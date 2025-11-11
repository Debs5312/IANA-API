const axios = require('axios');
const querystring = require('querystring');
const logger = require('../config/logger');

const IANA_URL = 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry';
const POOLPARTY_URL = 'https://atticusdata02.uk.oup.com/PoolParty/api/thesaurus/ccfbf9ad-c84f-41b0-95a6-df11a545ea08/createConceptScheme';

function parseRegistry(text) {
  const lines = text.split('\n');
  const result = [];
  let current = {};
  for (let line of lines) {
    line = line.trim();
    if (line === '' || line === '%%') {
      if (Object.keys(current).length > 0) {
        result.push(current);
        current = {};
      }
    } else {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        current[key] = value;
      }
    }
  }
  if (Object.keys(current).length > 0) {
    result.push(current);
  }
  // Skip the header record (File-Date)
  if (result.length > 0 && result[0]['File-Date']) {
    return result.slice(1);
  }
  return result;
}

async function fetchRegistry() {
  const response = await axios.get(IANA_URL, { family: 4 });
  return parseRegistry(response.data);
}

async function createConceptScheme() {
  // Fetch language data from the local API
  const languageResponse = await axios.get('http://localhost:5500/api/registry/language');
  const languages = languageResponse.data;
  const results = [];
  for (const language of languages) {
    const title = language.Subtag;
    const description = language.Description;

    const data = querystring.stringify({
      title: title,
      description: description,
      creator: 'superadmin'
    });

    const username = 'abcd';
    const password = 'xxxxx';
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const response = await axios.post(POOLPARTY_URL, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      }
    });

    if (response.status !== 200) {
      throw new Error(`POST failed for ${title}: ${response.status}`);
    }

    logger.info(`POST successful for ${title}: ${response.status}`, { filename: 'logs/response.log' });
    results.push(response.data);
  }
  return results;
}

module.exports = {
  fetchRegistry,
  parseRegistry,
  createConceptScheme
};
