const axios = require('axios');
const querystring = require('querystring');
const { logger, responseLogger } = require('../config/logger');

const IANA_URL = process.env.IANA_URL;
const POOLPARTY_Base_URL = process.env.POOLPARTY_URL;
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

async function createConceptScheme (projectUUID, creator) {
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
        creator
      });

      const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
      const POOLPARTY_URL = `${POOLPARTY_Base_URL}/${projectUUID}/createConceptScheme`;
      const response = await axios.post(POOLPARTY_URL, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader
        }
      });

      if (response.status !== 200) {
        throw new Error(`POST failed for ${title}: ${response.status}`);
      }

      responseLogger.info(`POST successful for ${title}: ${response.status}`);
      results.push(response.data);
    }
    return results;
  } catch (error) {
    logger.error('Error in createConceptScheme:', error);
    throw error;
  }
}

async function createConcept (projectUUID, parent) {
  try {
    // Fetch and filter languages directly to avoid self-reference
    const allData = await fetchRegistry();
    const languages = allData
      .filter(obj => obj.Type === 'language')
      .map(obj => ({ Subtag: obj.Subtag, Description: obj.Description || '' }))
      .filter(lang => lang.Subtag && lang.Description); // Ensure required fields
    const results = [];
    for (const language of languages.slice(0, 5)) {
      const prefLabel = language.Subtag;
      //const description = language.Description;

      const data = querystring.stringify({
        prefLabel,
        parent
      });

      const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
      const POOLPARTY_URL = `${POOLPARTY_Base_URL}/${projectUUID}/createConcept`;
      const response = await axios.post(POOLPARTY_URL, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader
        }
      });

      if (response.status !== 200) {
        throw new Error(`POST failed for ${prefLabel}: ${response.status}`);
      }

      responseLogger.info(`POST successful for ${prefLabel}: ${response.status}`);
      results.push(response.data);
    }
    return results;
  } catch (error) {
    logger.error('Error in createConcept:', error);
    throw error;
  }
}

async function fetchConcepts (projectUUID, scheme) {
  try {
    const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
    const POOLPARTY_GET_URL = `${POOLPARTY_Base_URL}/${projectUUID}/topconcepts?scheme=${scheme}`;

    const response = await axios.get(POOLPARTY_GET_URL, {
      family: 4,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader
      }
    });
    logger.info('Fetched All Concepts from PoolParty successfully');
    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    return data;
  } catch (error) {
    logger.error('Error in fetching Concepts:', error);
    throw error;
  }
}

async function deleteConcepts (projectUUID, scheme) {
  try {
    const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
    const POOLPARTY_GET_URL = `${POOLPARTY_Base_URL}/${projectUUID}/topconcepts?scheme=${scheme}`;
    const POOLPARTY_DELETE_URL = `${POOLPARTY_Base_URL}/${projectUUID}/deleteConcept`;
    // Fetch the list of top concepts for the given scheme
    const response = await axios.get(POOLPARTY_GET_URL, {
      family: 4,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader
      }
    });
    let responseData = response.data;
    // Parse the response data if it's a string
    if (typeof responseData === 'string') {
      responseData = JSON.parse(responseData);
    }
    // Check if concepts are present; if not, throw an error to indicate 404
    if (responseData.length === 0) {
      throw new Error('No concepts found to delete');
    }
    // Proceed to delete each concept
    responseData.forEach(async element => {
      console.log(element.uri);
      const data = querystring.stringify({
        concept : element.uri
      });
      const response = await axios.post(POOLPARTY_DELETE_URL, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader
        }
      });
      if (response.status !== 200) {
        throw new Error(`DELETE failed for ${element.uri}: ${response.status}`);
      }
      responseLogger.info(`DELETE successful for ${element.uri}, ${element.prefLabel}: ${response.status}`);
    });
    return responseData;
  } catch (error) {
    logger.error('Error in deleting Concept:', error);
    throw error;
  }
}
module.exports = {
  fetchRegistry,
  parseRegistry,
  createConceptScheme,
  createConcept,
  fetchConcepts,
  deleteConcepts
};
