// OpenCorporates API collector for business registration data
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Map US state names/codes to OpenCorporates jurisdiction codes
 */
const STATE_TO_JURISDICTION = {
  'AL': 'us_al', 'Alabama': 'us_al',
  'AK': 'us_ak', 'Alaska': 'us_ak',
  'AZ': 'us_az', 'Arizona': 'us_az',
  'AR': 'us_ar', 'Arkansas': 'us_ar',
  'CA': 'us_ca', 'California': 'us_ca',
  'CO': 'us_co', 'Colorado': 'us_co',
  'CT': 'us_ct', 'Connecticut': 'us_ct',
  'DE': 'us_de', 'Delaware': 'us_de',
  'FL': 'us_fl', 'Florida': 'us_fl',
  'GA': 'us_ga', 'Georgia': 'us_ga',
  'HI': 'us_hi', 'Hawaii': 'us_hi',
  'ID': 'us_id', 'Idaho': 'us_id',
  'IL': 'us_il', 'Illinois': 'us_il',
  'IN': 'us_in', 'Indiana': 'us_in',
  'IA': 'us_ia', 'Iowa': 'us_ia',
  'KS': 'us_ks', 'Kansas': 'us_ks',
  'KY': 'us_ky', 'Kentucky': 'us_ky',
  'LA': 'us_la', 'Louisiana': 'us_la',
  'ME': 'us_me', 'Maine': 'us_me',
  'MD': 'us_md', 'Maryland': 'us_md',
  'MA': 'us_ma', 'Massachusetts': 'us_ma',
  'MI': 'us_mi', 'Michigan': 'us_mi',
  'MN': 'us_mn', 'Minnesota': 'us_mn',
  'MS': 'us_ms', 'Mississippi': 'us_ms',
  'MO': 'us_mo', 'Missouri': 'us_mo',
  'MT': 'us_mt', 'Montana': 'us_mt',
  'NE': 'us_ne', 'Nebraska': 'us_ne',
  'NV': 'us_nv', 'Nevada': 'us_nv',
  'NH': 'us_nh', 'New Hampshire': 'us_nh',
  'NJ': 'us_nj', 'New Jersey': 'us_nj',
  'NM': 'us_nm', 'New Mexico': 'us_nm',
  'NY': 'us_ny', 'New York': 'us_ny',
  'NC': 'us_nc', 'North Carolina': 'us_nc',
  'ND': 'us_nd', 'North Dakota': 'us_nd',
  'OH': 'us_oh', 'Ohio': 'us_oh',
  'OK': 'us_ok', 'Oklahoma': 'us_ok',
  'OR': 'us_or', 'Oregon': 'us_or',
  'PA': 'us_pa', 'Pennsylvania': 'us_pa',
  'RI': 'us_ri', 'Rhode Island': 'us_ri',
  'SC': 'us_sc', 'South Carolina': 'us_sc',
  'SD': 'us_sd', 'South Dakota': 'us_sd',
  'TN': 'us_tn', 'Tennessee': 'us_tn',
  'TX': 'us_tx', 'Texas': 'us_tx',
  'UT': 'us_ut', 'Utah': 'us_ut',
  'VT': 'us_vt', 'Vermont': 'us_vt',
  'VA': 'us_va', 'Virginia': 'us_va',
  'WA': 'us_wa', 'Washington': 'us_wa',
  'WV': 'us_wv', 'West Virginia': 'us_wv',
  'WI': 'us_wi', 'Wisconsin': 'us_wi',
  'WY': 'us_wy', 'Wyoming': 'us_wy'
};

/**
 * Fetch businesses from OpenCorporates
 * @param {Object} params - Search parameters
 * @param {string} params.category - Business category
 * @param {string} params.location - Location (state name or code)
 * @param {number} params.maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of business records
 */
async function fetchFromOpenCorporates({ category, location, maxResults = 100 }) {
  const apiKey = process.env.OPENCORPORATES_API_KEY;

  // OpenCorporates works better with jurisdiction codes
  const jurisdictionCode = STATE_TO_JURISDICTION[location] ||
                          STATE_TO_JURISDICTION[location.toUpperCase()] ||
                          extractStateJurisdiction(location);

  if (!jurisdictionCode) {
    logger.warn(`Could not map location "${location}" to OpenCorporates jurisdiction`);
    return [];
  }

  const results = [];
  let page = 1;
  const perPage = 30; // OpenCorporates returns 30 per page

  try {
    while (results.length < maxResults) {
      const url = 'https://api.opencorporates.com/v0.4/companies/search';
      const params = {
        q: category,
        jurisdiction_code: jurisdictionCode,
        page,
        per_page: perPage
      };

      if (apiKey) {
        params.api_token = apiKey;
      }

      logger.info(`Fetching from OpenCorporates: ${category} in ${jurisdictionCode} (page ${page})`);

      const response = await axios.get(url, {
        params,
        timeout: 15000
      });

      const data = response.data;
      const companies = data?.results?.companies || [];

      if (companies.length === 0) {
        logger.info('No more results from OpenCorporates');
        break;
      }

      for (const item of companies) {
        const company = item.company;

        // Parse address
        const address = company.registered_address_in_full || '';
        const addressParts = parseAddress(address);

        const business = {
          business_name: company.name,
          category: category,
          street: addressParts.street,
          city: addressParts.city,
          state: addressParts.state,
          postal_code: addressParts.zip,
          country: 'USA',
          phone: null, // OpenCorporates doesn't provide phone
          email: null, // OpenCorporates doesn't provide email
          website: null, // OpenCorporates doesn't provide website
          source_url: company.opencorporates_url,
          confidence: calculateConfidence(company),
          notes: `Status: ${company.current_status || 'Unknown'}, Company Type: ${company.company_type || 'Unknown'}`,
          // Additional OpenCorporates metadata
          oc_company_number: company.company_number,
          oc_jurisdiction: company.jurisdiction_code,
          oc_incorporation_date: company.incorporation_date,
          oc_status: company.current_status,
          oc_company_type: company.company_type
        };

        results.push(business);

        if (results.length >= maxResults) {
          break;
        }
      }

      // Check if there are more pages
      const totalPages = Math.ceil((data.results?.total_count || 0) / perPage);
      if (page >= totalPages) {
        break;
      }

      page++;

      // Rate limiting: OpenCorporates free tier has limits
      await new Promise(resolve => setTimeout(resolve, apiKey ? 500 : 2000));
    }

    logger.info(`Collected ${results.length} businesses from OpenCorporates`);
    return results;

  } catch (error) {
    logger.error('Error fetching from OpenCorporates:', error.message);
    return results; // Return partial results
  }
}

/**
 * Extract state jurisdiction from location string
 */
function extractStateJurisdiction(location) {
  // Try to find state code or name in location string
  for (const [key, jurisdiction] of Object.entries(STATE_TO_JURISDICTION)) {
    if (location.includes(key)) {
      return jurisdiction;
    }
  }

  return null;
}

/**
 * Parse address into components
 */
function parseAddress(address) {
  if (!address) {
    return { street: null, city: null, state: null, zip: null };
  }

  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : null;

  const stateMatch = address.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|PR|RI|SC|SD|TN|TX|UT|VA|VI|VT|WA|WI|WV|WY)\b/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : null;

  // Simple city/street extraction
  let city = null;
  let street = null;

  if (state) {
    const parts = address.split(new RegExp(`\\b${state}\\b`, 'i'));
    if (parts[0]) {
      const preParts = parts[0].split(',').map(p => p.trim());
      if (preParts.length >= 2) {
        street = preParts[0];
        city = preParts[1];
      } else {
        street = preParts[0];
      }
    }
  } else {
    // No state found, just take first part as street
    const parts = address.split(',').map(p => p.trim());
    street = parts[0] || null;
    city = parts[1] || null;
  }

  return { street, city, state, zip };
}

/**
 * Calculate confidence score
 */
function calculateConfidence(company) {
  let score = 0.4; // Base score (registry data is authoritative but may be outdated)

  // Active status
  if (company.current_status && /active|good standing/i.test(company.current_status)) {
    score += 0.3;
  }

  // Recent incorporation
  if (company.incorporation_date) {
    const yearMatch = company.incorporation_date.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      if (currentYear - year <= 5) {
        score += 0.15; // Recently incorporated
      } else if (currentYear - year <= 10) {
        score += 0.1;
      }
    }
  }

  // Has full address
  if (company.registered_address_in_full) {
    score += 0.15;
  }

  return Math.min(1.0, Math.round(score * 100) / 100);
}

module.exports = {
  fetchFromOpenCorporates
};
