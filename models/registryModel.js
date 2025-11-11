const axios = require('axios');
const querystring = require('querystring');
const logger = require('../config/logger');

const IANA_URL = process.env.IANA_URL;
const POOLPARTY_URL = process.env.POOLPARTY_URL;
const POOLPARTY_USERNAME = process.env.POOLPARTY_USERNAME;
const POOLPARTY_PASSWORD = process.env.POOLPARTY_PASSWORD;

function parseRegistry (text) {
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

async function fetchRegistry () {
  try {
    const response = await axios.get(IANA_URL, { family: 4 });
    logger.info('Fetched IANA registry successfully');
    return parseRegistry(response.data);
  } catch (error) {
    logger.error('Error fetching IANA registry:', error);
    throw error;
  }
}

async function createConceptScheme () {
  try {
    // Fetch and filter languages directly to avoid self-reference
    const allData = await fetchRegistry();
    const languages = allData
      .filter(obj => obj.Type === 'language')
      .map(obj => ({ Subtag: obj.Subtag, Description: obj.Description || '' }))
      .filter(lang => lang.Subtag && lang.Description); // Ensure required fields
    const results = [];
    for (const language of languages.slice(0, 5)) {
      const title = language.Subtag;
      const description = language.Description;

      const data = querystring.stringify({
        title,
        description,
        creator: 'superadmin'
      });

      const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;

      const response = await axios.post(POOLPARTY_URL, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader
        }
      });

      if (response.status !== 200) {
        throw new Error(`POST failed for ${title}: ${response.status}`);
      }

      logger.info(`POST successful for ${title}: ${response.status}`);
      results.push(response.data);
    }
    return results;
  } catch (error) {
    logger.error('Error in createConceptScheme:', error);
    throw error;
  }
}

module.exports = {
  fetchRegistry,
  parseRegistry,
  createConceptScheme
};
