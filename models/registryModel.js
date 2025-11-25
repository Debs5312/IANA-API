const axios = require('axios');
const querystring = require('querystring');
const { logger, responseLogger } = require('../config/logger');
const { parseRegistry } = require('../utils/parseRegistry');

const IANA_URL = process.env.IANA_URL;
const POOLPARTY_Base_URL = process.env.POOLPARTY_URL;
const POOLPARTY_USERNAME = process.env.POOLPARTY_USERNAME;
const POOLPARTY_PASSWORD = process.env.POOLPARTY_PASSWORD;


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

async function fetchRegistryFilterByLanguage () {
  try {
    const allData = await fetchRegistry();
    const languages = allData
      .filter(obj => obj.Type === 'language')
      .map(obj => ({ Subtag: obj.Subtag, Description: obj.Description || '' }))
      .filter(lang => lang.Subtag && lang.Description);
    return languages;
  } catch (error) {
    logger.error('Filter type Language is invalid:', error);
    throw error;
  }
}

// async function createConceptScheme (projectUUID, creator) {
//   try {
//     // Fetch and filter languages directly to avoid self-reference
//     const allData = await fetchRegistry();
//     const languages = allData
//       .filter(obj => obj.Type === 'language')
//       .map(obj => ({ Subtag: obj.Subtag, Description: obj.Description || '' }))
//       .filter(lang => lang.Subtag && lang.Description); // Ensure required fields
//     const results = [];
//     for (const language of languages.slice(0, 5)) {
//       const title = language.Subtag;
//       const description = language.Description;

//       const data = querystring.stringify({
//         title,
//         description,
//         creator
//       });

//       const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
//       const POOLPARTY_URL = `${POOLPARTY_Base_URL}/${projectUUID}/createConceptScheme`;
//       const response = await axios.post(POOLPARTY_URL, data, {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           Authorization: authHeader
//         }
//       });

//       if (response.status !== 200) {
//         throw new Error(`POST failed for ${title}: ${response.status}`);
//       }

//       responseLogger.info(`POST successful for ${title}: ${response.status}`);
//       results.push(response.data);
//     }
//     return results;
//   } catch (error) {
//     logger.error('Error in createConceptScheme:', error);
//     throw error;
//   }
// }

async function createConcept (projectUUID, parent) {
  try {
    // Fetch and filter languages using the dedicated function
    const languages = await fetchRegistryFilterByLanguage();
    const existingConcepts = await getTopConcepts(projectUUID, parent);
    const results = [];
    let languagesToCreate = languages;
    if (existingConcepts.length > 0) {
      // Match prefLabels with language Subtag and skip matching data
      const existingPrefLabels = existingConcepts.map(concept => concept.prefLabel);
      languagesToCreate = languages.filter(language => !existingPrefLabels.includes(language.Subtag));
      logger.info(`Found ${existingConcepts.length} existing concepts. Proceeding with creation for ${languagesToCreate.length} remaining languages.`);
    } else {
      logger.info('No existing concepts found. Proceeding with concept creation.');
    }
    if (languagesToCreate.length === 0) {
      logger.info('No new languages to create.');
      return results;
    }
    for (const language of languagesToCreate.slice(0, 5)) {
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

async function getTopConcepts (projectUUID, scheme) {
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
    const POOLPARTY_DELETE_URL = `${POOLPARTY_Base_URL}/${projectUUID}/deleteConcept`;
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
