// Collector orchestrator - combines multiple data sources
const logger = require('../utils/logger');
const { fetchFromGooglePlaces } = require('./google-places');
const { fetchFromOpenCorporates } = require('./opencorporates');
const { deduplicateRecords } = require('../utils/deduplication');

/**
 * Collect businesses from all available sources
 * @param {Object} params - Collection parameters
 * @param {string} params.category - Business category
 * @param {string} params.geography - Location
 * @param {number} params.maxResults - Maximum total results
 * @returns {Promise<Object>} Collection results with metadata
 */
async function collectFromAllSources({ category, geography, maxResults = 100 }) {
  const startTime = Date.now();
  logger.info(`Starting multi-source collection: ${category} in ${geography}`);

  const allResults = [];
  const sourcesUsed = [];
  const errors = [];

  // Priority order: Google Places (most up-to-date) → OpenCorporates (authoritative)
  const resultsPerSource = Math.ceil(maxResults / 2); // Split quota between sources

  // 1. Google Places - Best for current operating businesses
  try {
    if (process.env.GOOGLE_MAPS_API_KEY) {
      logger.info('Fetching from Google Places...');
      const googleResults = await fetchFromGooglePlaces({
        category,
        location: geography,
        maxResults: resultsPerSource
      });

      if (googleResults.length > 0) {
        allResults.push(...googleResults);
        sourcesUsed.push('Google Places');
        logger.info(`✓ Google Places: ${googleResults.length} results`);
      }
    } else {
      logger.warn('⊘ Google Places: API key not configured');
    }
  } catch (error) {
    logger.error('✗ Google Places error:', error.message);
    errors.push({ source: 'Google Places', error: error.message });
  }

  // 2. OpenCorporates - Good for registered entities
  try {
    logger.info('Fetching from OpenCorporates...');
    const ocResults = await fetchFromOpenCorporates({
      category,
      location: geography,
      maxResults: resultsPerSource
    });

    if (ocResults.length > 0) {
      allResults.push(...ocResults);
      sourcesUsed.push('OpenCorporates');
      logger.info(`✓ OpenCorporates: ${ocResults.length} results`);
    }
  } catch (error) {
    logger.error('✗ OpenCorporates error:', error.message);
    errors.push({ source: 'OpenCorporates', error: error.message });
  }

  // 3. Deduplicate combined results
  logger.info(`Deduplicating ${allResults.length} results...`);
  const deduplicated = deduplicateRecords(allResults);

  // 4. Sort by confidence and limit to maxResults
  const sorted = deduplicated
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, maxResults);

  const executionTime = Date.now() - startTime;

  logger.info(`Collection complete: ${sorted.length} unique businesses in ${executionTime}ms`);

  return {
    meta: {
      category,
      geography,
      total_found: sorted.length,
      generated_at: new Date().toISOString(),
      sources_used: sourcesUsed,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : undefined
    },
    rows: sorted
  };
}

/**
 * Quick collection with automatic fallback
 * If primary source fails, tries backup sources
 */
async function quickCollect(category, geography, maxResults = 50) {
  logger.info(`Quick collect: ${category} in ${geography}`);

  // Try Google Places first (fastest and most reliable)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const results = await fetchFromGooglePlaces({
        category,
        location: geography,
        maxResults
      });

      if (results.length > 0) {
        return {
          meta: {
            category,
            geography,
            total_found: results.length,
            generated_at: new Date().toISOString(),
            sources_used: ['Google Places'],
            execution_time_ms: 0
          },
          rows: results
        };
      }
    } catch (error) {
      logger.warn('Google Places failed, trying fallback sources:', error.message);
    }
  }

  // Fallback to OpenCorporates
  try {
    const results = await fetchFromOpenCorporates({
      category,
      location: geography,
      maxResults
    });

    return {
      meta: {
        category,
        geography,
        total_found: results.length,
        generated_at: new Date().toISOString(),
        sources_used: ['OpenCorporates'],
        execution_time_ms: 0
      },
      rows: results
    };
  } catch (error) {
    logger.error('All sources failed:', error.message);
    return {
      meta: {
        category,
        geography,
        total_found: 0,
        generated_at: new Date().toISOString(),
        sources_used: [],
        error: 'All data sources failed'
      },
      rows: []
    };
  }
}

module.exports = {
  collectFromAllSources,
  quickCollect
};
