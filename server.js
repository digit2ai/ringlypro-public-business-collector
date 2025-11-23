require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { orchestrate } = require('./src/orchestrator');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 10,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/run', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ringlypro-public-business-collector',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Diagnostic endpoint to check API key configuration
app.get('/diagnostics', (req, res) => {
  const hasGoogleMapsKey = !!process.env.GOOGLE_MAPS_API_KEY;
  const hasOpenCorporatesKey = !!process.env.OPENCORPORATES_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    data_sources_configured: {
      google_maps: hasGoogleMapsKey,
      opencorporates: hasOpenCorporatesKey
    },
    llm_sources_configured: {
      openai: hasOpenAIKey,
      anthropic: hasAnthropicKey
    },
    api_key_prefixes: {
      google_maps: hasGoogleMapsKey ? process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'NOT_SET',
      opencorporates: hasOpenCorporatesKey ? 'SET' : 'NOT_SET'
    },
    ready_for_collection: hasGoogleMapsKey || hasOpenCorporatesKey,
    recommendation: hasGoogleMapsKey ?
      'Google Maps API configured - ready to collect data' :
      'WARNING: No data source API keys configured. Add GOOGLE_MAPS_API_KEY to environment variables.'
  });
});

// Main collection endpoint
app.get('/run', async (req, res) => {
  try {
    const {
      category,
      geo,
      geography,
      max = 500,
      synonyms,
      sources
    } = req.query;

    // Use geo or geography (support both param names)
    const location = geo || geography;

    if (!category || !location) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['category', 'geo (or geography)'],
        received: { category, location }
      });
    }

    logger.info('Starting collection', {
      category,
      geography: location,
      maxResults: max
    });

    const result = await orchestrate({
      category,
      geography: location,
      maxResults: parseInt(max),
      synonyms: synonyms ? synonyms.split(',') : undefined,
      sourceHints: sources ? sources.split(',') : undefined
    });

    logger.info('Collection completed', {
      category,
      geography: location,
      totalFound: result.meta.total_found
    });

    res.json(result);
  } catch (error) {
    logger.error('Collection failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Collection failed',
      message: error.message
    });
  }
});

// POST endpoint for more complex requests
app.post('/run', async (req, res) => {
  try {
    const {
      category,
      geography,
      maxResults = 500,
      synonyms,
      sourceHints,
      fields
    } = req.body;

    if (!category || !geography) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['category', 'geography']
      });
    }

    logger.info('Starting collection (POST)', {
      category,
      geography,
      maxResults
    });

    const result = await orchestrate({
      category,
      geography,
      maxResults,
      synonyms,
      sourceHints,
      fields
    });

    logger.info('Collection completed (POST)', {
      category,
      geography,
      totalFound: result.meta.total_found
    });

    res.json(result);
  } catch (error) {
    logger.error('Collection failed (POST)', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Collection failed',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`RinglyPro Business Collector running on port ${PORT}`);
  logger.info('Compliance mode: ENABLED');
  logger.info(`Respect robots.txt: ${process.env.RESPECT_ROBOTS_TXT !== 'false'}`);
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Collection endpoint: http://localhost:${PORT}/run?category=X&geo=Y&max=500\n`);
});

module.exports = app;
