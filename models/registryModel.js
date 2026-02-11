const axios = require('axios');
const https = require('https');
const querystring = require('querystring');
const { logger, responseLogger } = require('../config/logger');
const { parseRegistry } = require('../utils/parseRegistry');

const IANA_URL = process.env.IANA_URL;
const poolpartyBaseUrl = process.env.POOLPARTY_URL;
const POOLPARTY_USERNAME = process.env.POOLPARTY_USERNAME;
const POOLPARTY_PASSWORD = process.env.POOLPARTY_PASSWORD;

async function fetchRegistry () {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    const response = await axios.get(IANA_URL, { family: 4, httpsAgent: agent });
    logger.info('Fetched IANA registry successfully');
    return parseRegistry(response.data);
  } catch (error) {
    logger.error('Error fetching IANA registry:', error);
    throw error;
  }
}

async function fetchRegistryFilterByLanguage () {
  try {
    const allData = await fetchRegistry();
    const languages = allData
      .filter(obj => obj.Type === 'language' && obj.Deprecated == null)
      .map(obj => ({ Subtag: obj.Subtag, Description: obj.Description || [] }))
      .filter(lang => lang.Subtag && lang.Description.length > 0);
    return languages;
  } catch (error) {
    logger.error('Filter type Language is invalid:', error);
    throw error;
  }
}

async function addAltLabels (resource, descriptions, authHeader, url, prefLabel, isExisting = false) {
  for (const desc of descriptions) {
    const data = querystring.stringify({
      resource,
      label: desc,
      property: 'skos:altLabel'
    });
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader
      }
    });
    if (response.status !== 200) {
      const errorMsg = isExisting
        ? `Adding description '${desc}' to existing concept ${prefLabel} failed: ${response.status}`
        : `POST new concept was successful for ${prefLabel} but adding description '${desc}' to alternate label failed: ${response.status}`;
      throw new Error(errorMsg);
    }
    responseLogger.info(isExisting ? `Added description '${desc}' to existing concept ${prefLabel}` : `Added description '${desc}' to new concept ${prefLabel}`);
  }
}

async function createConcept (projectUUID, parent) {
  try {
    // Fetch and filter languages using the dedicated function
    const languages = await fetchRegistryFilterByLanguage();
    const existingConceptsResponse = await getTopConcepts(projectUUID, parent);
    const existingConcepts = existingConceptsResponse || [];
    const results = [];
    const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
    const POOLPARTY_URL = `${poolpartyBaseUrl}/${projectUUID}/createConcept`;
    const POOLPARTY_URL_TO_ADD_DESC = `${poolpartyBaseUrl}/${projectUUID}/addLiteral`;

    logger.info(`Found ${existingConcepts.length} existing concepts.`);

    for (const language of languages) {
      const prefLabel = language.Subtag;
      const existingConcept = existingConcepts.find(concept => concept.prefLabel === prefLabel);

      if (existingConcept) {
        // Concept exists, check and add missing descriptions
        const missingDescriptions = language.Description.filter(desc => !existingConcept.altLabels.includes(desc));
        if (missingDescriptions.length > 0) {
          await addAltLabels(existingConcept.uri, missingDescriptions, authHeader, POOLPARTY_URL_TO_ADD_DESC, prefLabel, true);
          results.push(existingConcept.uri);
        }
      } else {
        // Create new concept
        const data = querystring.stringify({
          prefLabel,
          parent
        });
        const response = await axios.post(POOLPARTY_URL, data, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authHeader
          }
        });
        if (response.status !== 200) {
          throw new Error(`POST failed for ${prefLabel}: ${response.status}`);
        }
        const resource = response.data;
        // Add all descriptions
        await addAltLabels(resource, language.Description, authHeader, POOLPARTY_URL_TO_ADD_DESC, prefLabel, false);
        responseLogger.info(`POST successful for ${prefLabel}: ${response.status}`);
        results.push(resource);
      }
    }
    return results;
  } catch (error) {
    logger.error('Error in createConcept:', error);
    throw error;
  }
}

async function getTopConcepts (projectUUID, scheme) {
  try {
    const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
    const POOLPARTY_GET_URL = `${poolpartyBaseUrl}/${projectUUID}/topconcepts?scheme=${scheme}&properties=skos:altLabel`;

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

async function fetchConcepts (projectUUID, scheme) {
  return await getTopConcepts(projectUUID, scheme);
}

async function deleteConcepts (projectUUID, scheme) {
  try {
    const responseData = await getTopConcepts(projectUUID, scheme);
    // Check if concepts are present; if not, throw an error to indicate 404
    if (responseData.length === 0) {
      throw new Error('No concepts found to delete');
    }
    // Proceed to delete each concept
    const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
    const POOLPARTY_DELETE_URL = `${poolpartyBaseUrl}/${projectUUID}/deleteConcept`;
    for (const element of responseData) {
      const data = querystring.stringify({
        concept: element.uri
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
    }
    return responseData;
  } catch (error) {
    logger.error('Error in deleting Concept:', error);
    throw error;
  }
}
module.exports = {
  fetchRegistry,
  fetchRegistryFilterByLanguage,
  // createConceptScheme,
  createConcept,
  fetchConcepts,
  deleteConcepts
};
