// Google Places API collector for real business data
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetch businesses from Google Places API
 * @param {Object} params - Search parameters
 * @param {string} params.category - Business category (e.g., "Real Estate Agent")
 * @param {string} params.location - Location (e.g., "Florida" or "Tampa, FL")
 * @param {number} params.maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of business records
 */
async function fetchFromGooglePlaces({ category, location, maxResults = 100 }) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, skipping Google Places');
    return [];
  }

  const results = [];
  let nextPageToken = null;
  const query = `${category} in ${location}`;

  try {
    // Google Places returns max 20 results per request, use pagination
    while (results.length < maxResults) {
      const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      const params = {
        query,
        key: apiKey
      };

      if (nextPageToken) {
        params.pagetoken = nextPageToken;
        // Required delay between paginated requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info(`Fetching from Google Places: ${query} (page ${nextPageToken ? 'next' : '1'})`);

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        logger.error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
        break;
      }

      if (!data.results || data.results.length === 0) {
        logger.info('No more results from Google Places');
        break;
      }

      // Convert Google Places format to our standard format
      for (const place of data.results) {
        // Get detailed place info if we have place_id
        let detailedInfo = null;
        if (place.place_id) {
          try {
            detailedInfo = await getPlaceDetails(place.place_id, apiKey);
            await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
          } catch (error) {
            logger.warn(`Failed to get details for ${place.name}:`, error.message);
          }
        }

        const business = {
          business_name: place.name,
          category: category,
          street: detailedInfo?.formatted_address || place.formatted_address || null,
          city: extractCity(place.formatted_address),
          state: extractState(place.formatted_address),
          postal_code: extractZip(place.formatted_address),
          country: 'USA',
          phone: detailedInfo?.formatted_phone_number || detailedInfo?.international_phone_number || null,
          email: null, // Google Places doesn't provide email
          website: detailedInfo?.website || null,
          source_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          confidence: calculateConfidence(place, detailedInfo),
          notes: `Rating: ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)`,
          // Additional Google Places metadata
          google_place_id: place.place_id,
          google_rating: place.rating,
          google_reviews: place.user_ratings_total,
          google_types: place.types?.join(', '),
          is_operational: place.business_status === 'OPERATIONAL'
        };

        results.push(business);

        if (results.length >= maxResults) {
          break;
        }
      }

      nextPageToken = data.next_page_token;

      // Break if no more pages
      if (!nextPageToken) {
        break;
      }
    }

    logger.info(`Collected ${results.length} businesses from Google Places`);
    return results;

  } catch (error) {
    logger.error('Error fetching from Google Places:', error.message);
    return results; // Return partial results
  }
}

/**
 * Get detailed place information
 */
async function getPlaceDetails(placeId, apiKey) {
  const url = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = {
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total',
    key: apiKey
  };

  const response = await axios.get(url, { params });

  if (response.data.status === 'OK') {
    return response.data.result;
  }

  return null;
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidence(place, details) {
  let score = 0.5; // Base score

  // Has reviews and good rating
  if (place.rating && place.rating >= 4.0) score += 0.15;
  if (place.user_ratings_total && place.user_ratings_total >= 10) score += 0.1;

  // Is operational
  if (place.business_status === 'OPERATIONAL') score += 0.1;

  // Has additional details
  if (details?.website) score += 0.1;
  if (details?.formatted_phone_number) score += 0.05;

  return Math.min(1.0, Math.round(score * 100) / 100);
}

/**
 * Extract city from formatted address
 */
function extractCity(address) {
  if (!address) return null;

  // Format: "123 Main St, City, ST 12345, USA"
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 3]; // City is usually 3rd from end
  }

  return null;
}

/**
 * Extract state from formatted address
 */
function extractState(address) {
  if (!address) return null;

  const stateMatch = address.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|PR|RI|SC|SD|TN|TX|UT|VA|VI|VT|WA|WI|WV|WY)\b/i);

  return stateMatch ? stateMatch[1].toUpperCase() : null;
}

/**
 * Extract ZIP code from formatted address
 */
function extractZip(address) {
  if (!address) return null;

  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);

  return zipMatch ? zipMatch[1] : null;
}

module.exports = {
  fetchFromGooglePlaces
};
