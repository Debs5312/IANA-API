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

function isSubtagDescriptionDuplicate(subtag, description) {
  const lowerSubtag = subtag.toLowerCase();
  const match = description.some(desc => {
    const trimmedDesc = (desc || '').trim();
    const isMatch = trimmedDesc.toLowerCase() === lowerSubtag;
    return isMatch;
  });
  return match;
}

async function findSubtagDescriptionDuplicates(languages) {
  try {
    const duplicates = languages.filter(lang => isSubtagDescriptionDuplicate(lang.Subtag, lang.Description));
    const now = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filePath = `data/subtag-description-duplicates-${now}.json`;
    const fs = require('fs').promises;
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(duplicates, null, 2));
    
    logger.info(`Saved ${duplicates.length} subtag-description duplicate entries to ${filePath}`);
    return duplicates;
  } catch (error) {
    logger.error('Error finding/saving subtag-description duplicates:', error);
    throw error;
  }
}

async function fetchDeprecatedLanguages () {
  try {
    const allData = await fetchRegistry();
    const deprecatedLanguages = allData
      .filter(obj => obj.Type === 'language' && obj.Deprecated != null)
      .map(obj => ({ Subtag: obj.Subtag, Description: obj.Description || [], Deprecated: obj.Deprecated }))
      .filter(lang => lang.Subtag);
    return deprecatedLanguages;
  } catch (error) {
    logger.error('Error fetching deprecated languages:', error);
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

async function addDescriptionForDeprecatedConcepts (resource, authHeader, url, prefLabel) {
  const data = querystring.stringify({
    resource,
    label: "Deprecated",
    property: 'skos:definition'
  });
  const response = await axios.post(url, data, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authHeader
    }
  });
  if (response.status !== 200) {
    const errorMsg = `Marked as Deprecated for existing concept ${prefLabel} failed: ${response.status}`
    throw new Error(errorMsg);
  }
  responseLogger.info(`Marked as Deprecated for existing concept ${prefLabel}`);
}

async function deleteAltLabels (resource, descriptionsTobeDeleted, authHeader, url, prefLabel) {
  for (const desc of descriptionsTobeDeleted) {
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
      const errorMsg = `Deletion of description '${desc}' from existing concept ${prefLabel} has failed: ${response.status}`;
      throw new Error(errorMsg);
    }
    responseLogger.info(`Deleted description '${desc}' from existing concept ${prefLabel}`);
  }
}

async function upsertConcept (projectUUID, parent) {
  try {
    // Fetch and filter languages using the dedicated function
    const languages = await fetchRegistryFilterByLanguage();
    
    // Find and save subtag-description duplicates, then filter them out
    const duplicates = await findSubtagDescriptionDuplicates(languages);
    const finalLanguages = languages.filter(lang => !duplicates.some(d => d.Subtag === lang.Subtag));
    
    logger.info(`Filtered out ${duplicates.length} subtag-description duplicate entries. Processing ${finalLanguages.length} languages.`);
    
    if (finalLanguages.length === 0) {
      logger.info('All languages are found with duplicate description');
      return { message: 'All languages found with duplicate descriptions', processed: 0, duplicatesCount: duplicates.length };
    }
    
    const existingConceptsResponse = await getTopConcepts(projectUUID, parent);
    const existingConcepts = existingConceptsResponse || [];
    const results = [];
    const authHeader = `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
    const POOLPARTY_URL = `${poolpartyBaseUrl}/${projectUUID}/createConcept`;
    const POOLPARTY_URL_TO_ADD_DESC = `${poolpartyBaseUrl}/${projectUUID}/addLiteral`;
    const POOLPARTY_URL_TO_DELETE_DESC = `${poolpartyBaseUrl}/${projectUUID}/removeLiteral`;

    logger.info(`Found ${existingConcepts.length} existing concepts.`);

    for (const language of finalLanguages) {
      const prefLabel = language.Subtag;
        const existingConcept = existingConcepts.find(concept => concept.prefLabel === prefLabel);

      if (existingConcept) {
        const altLabels = existingConcept.altLabels || [];
        // Find extra levels: altLabels in existing concept but NOT in language Description
        const extraAltLabels = altLabels.filter(altLabel => !language.Description.includes(altLabel));
        
        // Skip undefined/null/empty altLabels
        const validExtraAltLabels = extraAltLabels.filter(altLabel => altLabel != null && altLabel !== '' && altLabel.trim() !== '');
        
        // Find new additions: language Description NOT present in existing concept
        const newDescriptions = language.Description.filter(desc => !altLabels.includes(desc));
        
        // Remove extra levels if any
        if (validExtraAltLabels.length > 0) {
          await deleteAltLabels(existingConcept.uri, validExtraAltLabels, authHeader, POOLPARTY_URL_TO_DELETE_DESC, prefLabel);
          results.push(existingConcept.uri);
        }
        
        // Add new descriptions if any
        if (newDescriptions.length > 0) {
          await addAltLabels(existingConcept.uri, newDescriptions, authHeader, POOLPARTY_URL_TO_ADD_DESC, prefLabel, true);
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

    // Handle deprecated languages - mark existing concepts as deprecated
    const deprecatedLanguages = await fetchDeprecatedLanguages();
    logger.info(`Found ${deprecatedLanguages.length} deprecated languages.`);

    for (const deprecatedLang of deprecatedLanguages) {
      const prefLabel = deprecatedLang.Subtag;
      const existingConcept = existingConcepts.find(concept => concept.prefLabel === prefLabel);

      if (existingConcept) {
        const altLabels = existingConcept.altLabels || [];  // Ensure safety for potential future use
        // Call addDescriptionForDeprecatedConcepts for existing deprecated concepts
        await addDescriptionForDeprecatedConcepts(existingConcept.uri, authHeader, POOLPARTY_URL_TO_ADD_DESC, prefLabel);
        results.push(existingConcept.uri);
      }
    }

    return results;
  } catch (error) {
    logger.error('Error in upsertConcept:', error);
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
  upsertConcept,
  getTopConcepts,
  deleteConcepts
};
