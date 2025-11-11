const axios = require('axios');

const IANA_URL = 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry';

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

module.exports = {
  fetchRegistry,
  parseRegistry
};
