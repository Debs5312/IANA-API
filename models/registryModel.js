const axios = require('axios');
const https = require('https');
const querystring = require('querystring');
const { logger, responseLogger } = require('../config/logger');
const { parseRegistry } = require('../utils/parseRegistry');
const fs = require('fs').promises;

const IANA_URL = process.env.IANA_URL;
const poolpartyBaseUrl = process.env.POOLPARTY_URL;
const POOLPARTY_USERNAME = process.env.POOLPARTY_USERNAME;
const POOLPARTY_PASSWORD = process.env.POOLPARTY_PASSWORD;

// Private helper functions
async function _getAuthHeader () {
  return `Basic ${Buffer.from(`${POOLPARTY_USERNAME}:${POOLPARTY_PASSWORD}`).toString('base64')}`;
}

function _buildPoolPartyUrl (projectUUID, endpoint) {
  return `${poolpartyBaseUrl}/${projectUUID}/${endpoint}`;
}

async function _postToPoolParty (url, data, authHeader, languageDetails = null) {
  const response = await axios.post(url, querystring.stringify(data), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authHeader
    }
  });
  if (response.status !== 200) {
    const datetime = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const dir = `data/error_tags_${datetime}`;
    await fs.mkdir(dir, { recursive: true });
    const errorDetails = {
      url,
      data,
      status: response.status,
      responseData: response.data,
      timestamp: new Date().toISOString(),
      ...(languageDetails || {})
    };
    await fs.writeFile(`${dir}/error.json`, JSON.stringify(errorDetails, null, 2));
    logger.error(`PoolParty error saved to ${dir}/error.json: ${JSON.stringify(languageDetails || {})}`);
    return null;
  }
  return response.data;
}

async function _createConcept (projectUUID, prefLabel, parent, authHeader, languageDetails = null) {
  const url = _buildPoolPartyUrl(projectUUID, 'createConcept');
  const data = { prefLabel, parent };
  const langDetails = { prefLabel, action: 'createConcept', ...(languageDetails || {}) };
  const resource = await _postToPoolParty(url, data, authHeader, langDetails);
  if (!resource) {
    logger.error(`Failed to create concept ${prefLabel}`);
    return null;
  }
  return resource;
}

async function _addAltLabels (resource, descriptions, projectUUID, prefLabel, authHeader, isExisting = false, languageDetails = null) {
  for (const desc of descriptions) {
    const url = _buildPoolPartyUrl(projectUUID, 'addLiteral');
    const data = { resource, label: desc, property: 'skos:altLabel' };
    await _postToPoolParty(url, data, authHeader, { prefLabel, description: desc, action: 'addAltLabel', isExisting, ...(languageDetails || {}) });
    responseLogger.info(isExisting ? `Added description '${desc}' to existing concept ${prefLabel}` : `Added description '${desc}' to new concept ${prefLabel}`);
  }
}

async function _deleteAltLabels (resource, descriptionsTobeDeleted, projectUUID, prefLabel, authHeader) {
  for (const desc of descriptionsTobeDeleted) {
    const url = _buildPoolPartyUrl(projectUUID, 'removeLiteral');
    const data = {
      resource,
      label: desc,
      property: 'skos:altLabel'
    };
    await _postToPoolParty(url, data, authHeader);
    responseLogger.info(`Deleted description '${desc}' from existing concept ${prefLabel}`);
  }
}

async function _addDeprecatedDefinition (resource, projectUUID, prefLabel, authHeader) {
  const url = _buildPoolPartyUrl(projectUUID, 'addLiteral');
  const data = {
    resource,
    label: 'Deprecated',
    property: 'skos:definition'
  };
  await _postToPoolParty(url, data, authHeader);
  responseLogger.info(`Marked as Deprecated for existing concept ${prefLabel}`);
}

function _ensureArray (value) {
  return Array.isArray(value) ? value : [];
}

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

function isSubtagDescriptionDuplicate (subtag, description) {
  const lowerSubtag = subtag.toLowerCase();
  const match = description.some(desc => {
    const trimmedDesc = (desc || '').trim();
    const isMatch = trimmedDesc.toLowerCase() === lowerSubtag;
    return isMatch;
  });
  return match;
}

async function findSubtagDescriptionDuplicates (languages) {
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

async function computeDuplicateDetails (language) {
  const { Subtag, Description = [] } = language;
  const lowerSubtag = Subtag.toLowerCase();
  const selfMatchingDescs = Description.filter(desc => (desc || '').trim().toLowerCase() === lowerSubtag);
  const otherDescs = Description.filter(desc => !selfMatchingDescs.includes(desc)) || [];
  const altLevel = Description[0] ? Description[0].trim() + '.' : '';
  return {
    selfMatchingDescs: _ensureArray(selfMatchingDescs),
    otherDescs: _ensureArray(otherDescs),
    altLevel
  };

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

async function upsertConcept (projectUUID, parent) {
  try {
    // Fetch and filter languages using the dedicated function
    const languages = await fetchRegistryFilterByLanguage();

    // Find and save subtag-description duplicates, then filter them out
    const duplicates = await findSubtagDescriptionDuplicates(languages);
    const finalLanguages = languages;

    logger.info(`Processing ${finalLanguages.length} languages including ${duplicates.length} duplicates with modified altLevels.`);

    if (finalLanguages.length === 0) {
      logger.info('All languages are found with duplicate description');
      return { message: 'All languages found with duplicate descriptions', processed: 0, duplicatesCount: duplicates.length };
    }

    const existingConceptsResponse = await getTopConcepts(projectUUID, parent);
    const existingConcepts = existingConceptsResponse || [];
    const results = [];
    const authHeader = await _getAuthHeader();

    logger.info(`Found ${existingConcepts.length} existing concepts.`);

    for (const language of finalLanguages) {
      const prefLabel = language.Subtag;
      const isDuplicate = duplicates.some(d => d.Subtag === prefLabel);
      const existingConcept = existingConcepts.find(concept => concept.prefLabel === prefLabel);

      if (!isDuplicate) {
        if (existingConcept) {
          const altLabels = _ensureArray(existingConcept.altLabels);
          // Find extra levels: altLabels in existing concept but NOT in language Description
          const extraAltLabels = altLabels.filter(altLabel => !language.Description.includes(altLabel));

          // Skip undefined/null/empty altLabels
          const validExtraAltLabels = extraAltLabels.filter(altLabel => altLabel != null && altLabel !== '' && altLabel.trim() !== '');

          // Find new additions: language Description NOT present in existing concept
          const newDescriptions = language.Description.filter(desc => !altLabels.includes(desc));

          // Remove extra levels if any
          if (validExtraAltLabels.length > 0) {
            await _deleteAltLabels(existingConcept.uri, validExtraAltLabels, projectUUID, prefLabel, authHeader);
            results.push(existingConcept.uri);
          }

          // Add new descriptions if any
          if (newDescriptions.length > 0) {
            await _addAltLabels(existingConcept.uri, newDescriptions, projectUUID, prefLabel, authHeader, true);
            results.push(existingConcept.uri);
          }
        } else {
          // Create new concept
          const resource = await _createConcept(projectUUID, prefLabel, parent, authHeader);
          if (resource) {
            // Add all descriptions
            await _addAltLabels(resource, language.Description, projectUUID, prefLabel, authHeader, false);
            responseLogger.info(`POST successful for ${prefLabel}`);
            results.push(resource);
          } else { continue; }
        }
      } else {
        // Handle duplicate: add non-self-matching descriptions + modified first desc
        const { otherDescs, altLevel } = await computeDuplicateDetails(language);
        if (otherDescs.length === 0 && !altLevel) {
          logger.warn(`No valid descriptions for duplicate subtag ${prefLabel}, skipping.`);
          continue;
        }

        if (existingConcept) {
          const altLabels = _ensureArray(existingConcept.altLabels);

          // Delete extras (existing logic)
          const extraAltLabels = altLabels.filter(altLabel => !language.Description.includes(altLabel));
          const lowercaseLabel = prefLabel.trim().toLowerCase();
          const protectedAltLabel = `${lowercaseLabel}.`;
          const validExtraAltLabels = extraAltLabels.filter(altLabel => altLabel != null && altLabel !== '' && altLabel.trim() !== '' && altLabel.trim().toLowerCase() !== protectedAltLabel);
          if (validExtraAltLabels.length > 0) {
            await _deleteAltLabels(existingConcept.uri, validExtraAltLabels, projectUUID, prefLabel, authHeader);
            results.push(existingConcept.uri);
          }

          // Add otherDescs if new
          const newOtherDescs = otherDescs.filter(desc => !altLabels.includes(desc));
          if (newOtherDescs.length > 0) {
            await _addAltLabels(existingConcept.uri, newOtherDescs, projectUUID, prefLabel, authHeader, true);
            results.push(existingConcept.uri);
          }

          // Add altLevel if new
          if (altLevel && !altLabels.includes(altLevel)) {
            await _addAltLabels(existingConcept.uri, [altLevel], projectUUID, prefLabel, authHeader, true);
            results.push(existingConcept.uri);
          }
        } else {
          // Create new concept
          const resource = await _createConcept(projectUUID, prefLabel, parent, authHeader);
          if (resource) {
            const descriptionsToAdd = [...otherDescs];
            if (altLevel) descriptionsToAdd.push(altLevel);
            await _addAltLabels(resource, descriptionsToAdd, projectUUID, prefLabel, authHeader, false);
            responseLogger.info(`POST successful for duplicate ${prefLabel} with ${descriptionsToAdd.length} altLabels`);
            results.push(resource);
          } else {
            continue;
          }
        }
      }
    }

    // Handle deprecated languages - mark existing concepts as deprecated
    const deprecatedLanguages = await fetchDeprecatedLanguages();
    logger.info(`Found ${deprecatedLanguages.length} deprecated languages.`);

    for (const deprecatedLang of deprecatedLanguages) {
      const prefLabel = deprecatedLang.Subtag;
      const existingConcept = existingConcepts.find(concept => concept.prefLabel === prefLabel);

      if (existingConcept) {
        // Call addDescriptionForDeprecatedConcepts for existing deprecated concepts
        await _addDeprecatedDefinition(existingConcept.uri, projectUUID, prefLabel, authHeader);
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
    const authHeader = await _getAuthHeader();
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
    // Normalize altLabels to always be an array
    const concepts = (Array.isArray(data) ? data : []).map(concept => ({
      ...concept,
      altLabels: _ensureArray(concept.altLabels)
    }));
    return concepts;
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
    const authHeader = await _getAuthHeader();
    const POOLPARTY_DELETE_URL = _buildPoolPartyUrl(projectUUID, 'deleteConcept');
    for (const element of responseData) {
      const data = { concept: element.uri };
      await _postToPoolParty(POOLPARTY_DELETE_URL, data, authHeader);
      responseLogger.info(`DELETE successful for ${element.uri}, ${element.prefLabel}`);
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
