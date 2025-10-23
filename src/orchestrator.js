const axios = require('axios');
const logger = require('./utils/logger');
const { deduplicateRecords, normalizeRecord } = require('./utils/deduplication');
const { respectsRobotsTxt } = require('./utils/robots');

// System prompt for the LLM agent
const SYSTEM_PROMPT = `Role: You are a compliant, source-first web research and data-extraction agent.
Mission: Given a CATEGORY and GEOGRAPHY, discover publicly available small-business records and return clean, deduplicated, verified results.

Non-negotiables:
1. Respect robots.txt and site Terms. Skip prohibited sources.
2. Use public data only (no logins/paywalls/private data).
3. Comply with CAN-SPAM/GDPR/CASL; include traceable source_url for every record.
4. Do not fabricate values. Leave unknown fields empty.

Source priority (in order):
1. Official registries/associations (state license boards, accredited orgs)
2. Major directories (Google Business Profiles, Yelp, BBB, relevant marketplaces)
3. Local chambers/city–county business directories
4. Company websites (email/phone validation)

Fields (default schema):
- business_name (required)
- category (normalized to input taxonomy)
- street, city, state, postal_code, country
- phone (E.164 if possible)
- email (public business emails only; prefer role-based like info@, office@)
- website
- source_url (required; where you found the record)
- confidence (0–1; how sure you are this is current/correct)
- notes (brief: e.g., "email from contact page", "phone from GBP")

Quality rules:
1. Cross-check across ≥2 sources when possible; raise confidence on matches.
2. Normalize phones/URLs; dedupe by website or (business_name + phone + postal_code).
3. If no email is public, return website and (if available) contact page URL; leave email empty.

Rate & scope:
1. Honor MAX_RESULTS. Pace requests politely; never hammer one domain.
2. If blocked by automation defenses, skip and note in notes.

Output (strict):
Return JSON:
{
  "meta": {
    "category": "...",
    "geography": "...",
    "total_found": <int>,
    "generated_at": "<ISO8601>",
    "sources_used": ["..."]
  },
  "rows": [ { /* fields above */ } ]
}

Always populate sources_used with domains actually consulted.

Ambiguity handling:
- If CATEGORY is ambiguous, try top 2–3 NAICS-aligned synonyms and note this.
- For broad geographies (e.g., "Florida"), sample major metros first, then expand.`;

/**
 * Build user prompt for the LLM
 */
function buildUserPrompt(params) {
  const {
    category,
    geography,
    maxResults = 500,
    synonyms = [],
    sourceHints = {},
    fields = 'default'
  } = params;

  return `TASK: Build a small-business contact dataset.

CATEGORY: ${category}
GEOGRAPHY: ${geography}
SYNONYMS: ${synonyms.length > 0 ? JSON.stringify(synonyms) : 'Auto-detect NAICS synonyms'}
FIELDS: ${fields}
MAX_RESULTS: ${maxResults}

STRICTNESS:
  robots_txt: true
  public_only: true
  no_logins: true
  respect_terms: true

SOURCE_HINTS:
  Associations/Registries: ${sourceHints.registries || 'Auto-discover state/industry associations'}
  Major Directories: Google Business Profiles, Yelp, BBB
  Local Directories: Chambers, City/County business directories

OUTPUT:
  format: JSON
  include_meta: true

NOTES:
  - Prefer role-based emails when multiple are present.
  - Return contact URL when email is form-only.
  - Normalize phone (E.164); dedupe by website or name+phone+ZIP.
  - IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`;
}

/**
 * Call LLM API (OpenAI or Anthropic)
 */
async function callLLM(systemPrompt, userPrompt) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey && !anthropicKey) {
    throw new Error('No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY');
  }

  // Prefer OpenAI if available
  if (openaiKey) {
    logger.info('Using OpenAI for orchestration');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  // Fallback to Anthropic
  if (anthropicKey) {
    logger.info('Using Anthropic for orchestration');
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.content[0].text;
  }
}

/**
 * Parse LLM response and extract JSON
 */
function parseLLMResponse(response) {
  try {
    // Try direct JSON parse first
    return JSON.parse(response);
  } catch (e) {
    // Look for JSON in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Look for JSON object in text
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error('Could not parse LLM response as JSON');
  }
}

/**
 * Main orchestration function
 */
async function orchestrate(params) {
  const startTime = Date.now();
  logger.info('Orchestration started', params);

  try {
    // Build prompts
    const userPrompt = buildUserPrompt(params);

    // Call LLM for research orchestration
    logger.info('Calling LLM for orchestration...');
    const llmResponse = await callLLM(SYSTEM_PROMPT, userPrompt);

    // Parse response
    logger.info('Parsing LLM response...');
    let result = parseLLMResponse(llmResponse);

    // Validate and normalize records
    if (result.rows && Array.isArray(result.rows)) {
      logger.info(`Processing ${result.rows.length} raw records...`);

      // Normalize each record
      result.rows = result.rows.map(normalizeRecord);

      // Deduplicate
      const beforeDedup = result.rows.length;
      result.rows = deduplicateRecords(result.rows);
      const afterDedup = result.rows.length;

      logger.info(`Deduplication: ${beforeDedup} → ${afterDedup} records (${beforeDedup - afterDedup} duplicates removed)`);

      // Update meta
      result.meta.total_found = afterDedup;
      result.meta.deduplication_applied = true;
      result.meta.duplicates_removed = beforeDedup - afterDedup;
    }

    // Add execution metadata
    result.meta.execution_time_ms = Date.now() - startTime;
    result.meta.orchestrator_version = '1.0.0';

    logger.info('Orchestration completed successfully', {
      totalRecords: result.meta.total_found,
      executionTime: result.meta.execution_time_ms
    });

    return result;
  } catch (error) {
    logger.error('Orchestration failed', {
      error: error.message,
      stack: error.stack,
      params
    });

    // Return error in expected format
    return {
      meta: {
        category: params.category,
        geography: params.geography,
        total_found: 0,
        generated_at: new Date().toISOString(),
        sources_used: [],
        error: error.message,
        execution_time_ms: Date.now() - startTime
      },
      rows: []
    };
  }
}

module.exports = { orchestrate, buildUserPrompt, SYSTEM_PROMPT };
