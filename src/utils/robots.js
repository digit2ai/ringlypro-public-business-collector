const robotsParser = require('robots-parser');
const axios = require('axios');
const logger = require('./logger');

// Cache robots.txt parsers
const robotsCache = new Map();

/**
 * Check if a URL respects robots.txt
 */
async function respectsRobotsTxt(url, userAgent = null) {
  // Skip check if disabled
  if (process.env.RESPECT_ROBOTS_TXT === 'false') {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const ua = userAgent || process.env.USER_AGENT || 'RinglyProBusinessCollector/1.0';

    // Check cache
    if (robotsCache.has(robotsUrl)) {
      const robots = robotsCache.get(robotsUrl);
      return robots.isAllowed(url, ua);
    }

    // Fetch robots.txt
    try {
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: { 'User-Agent': ua }
      });

      const robots = robotsParser(robotsUrl, response.data);
      robotsCache.set(robotsUrl, robots);

      const allowed = robots.isAllowed(url, ua);

      if (!allowed) {
        logger.warn(`URL blocked by robots.txt: ${url}`);
      }

      return allowed;
    } catch (error) {
      // If robots.txt doesn't exist or fetch fails, assume allowed
      if (error.response?.status === 404) {
        logger.debug(`No robots.txt found for ${robotsUrl}, assuming allowed`);
        return true;
      }

      logger.warn(`Could not fetch robots.txt for ${robotsUrl}:`, error.message);
      return true; // Fail open
    }
  } catch (error) {
    logger.error('Error checking robots.txt:', error);
    return true; // Fail open
  }
}

/**
 * Get crawl delay from robots.txt
 */
async function getCrawlDelay(url, userAgent = null) {
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const ua = userAgent || process.env.USER_AGENT || 'RinglyProBusinessCollector/1.0';

    if (robotsCache.has(robotsUrl)) {
      const robots = robotsCache.get(robotsUrl);
      return robots.getCrawlDelay(ua) || 1000; // Default 1 second
    }

    return 1000; // Default 1 second
  } catch (error) {
    return 1000;
  }
}

module.exports = {
  respectsRobotsTxt,
  getCrawlDelay
};
