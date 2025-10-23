# RinglyPro Public Business Collector

A compliant, source-first web research and data-extraction service for discovering publicly available small-business records.

## Purpose & Compliance

This service is designed to ethically and legally collect publicly available business information while respecting:

- **robots.txt directives** - All sources are checked against robots.txt before access
- **Public data only** - No login-required, paywalled, or private data sources
- **CAN-SPAM/GDPR/CASL compliance** - Every record includes traceable source_url
- **Rate limiting** - Respectful request pacing to avoid overwhelming any domain
- **Terms of Service** - Prohibited sources are skipped automatically

## Features

- LLM-orchestrated intelligent research (OpenAI or Anthropic)
- Multi-source cross-validation for higher confidence
- Automatic deduplication and normalization
- E.164 phone formatting
- Source traceability for every record
- RESTful API with rate limiting
- Ready for Render deployment

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/ringlypro/ringlypro-public-business-collector.git
cd ringlypro-public-business-collector

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Start the server
npm start
```

The server will start on http://localhost:3001

### Environment Variables

Required:
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM API key for orchestration

Optional:
- `PORT` - Server port (default: 3001)
- `MAX_REQUESTS_PER_MINUTE` - Rate limit (default: 10)
- `RESPECT_ROBOTS_TXT` - Enable robots.txt checking (default: true)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` - For S3 output storage

## API Usage

### Health Check

```bash
GET /health
```

Returns service status and version information.

### Collection Endpoint (GET)

```bash
GET /run?category=Real%20Estate%20Agents&geo=Florida&max=500
```

Parameters:
- `category` (required) - Business category to search
- `geo` or `geography` (required) - Geographic location
- `max` (optional) - Maximum results to return (default: 500)
- `synonyms` (optional) - Comma-separated category synonyms
- `sources` (optional) - Comma-separated source hints

Example:
```bash
curl "http://localhost:3001/run?category=Plumbers&geo=Tampa%20Bay,%20FL&max=300"
```

### Collection Endpoint (POST)

```bash
POST /run
Content-Type: application/json

{
  "category": "Real Estate Agents",
  "geography": "Florida",
  "maxResults": 500,
  "synonyms": ["Realtor", "Broker"],
  "sourceHints": {
    "registries": "Florida Realtors, DBPR License Lookup"
  }
}
```

### Response Format

```json
{
  "meta": {
    "category": "Real Estate Agents",
    "geography": "Florida",
    "total_found": 487,
    "generated_at": "2025-10-23T12:00:00.000Z",
    "sources_used": ["realtor.com", "zillow.com", "mls.com"],
    "deduplication_applied": true,
    "duplicates_removed": 13,
    "execution_time_ms": 4523
  },
  "rows": [
    {
      "business_name": "ABC Realty Group",
      "category": "Real Estate Agents",
      "street": "123 Main St",
      "city": "Tampa",
      "state": "FL",
      "postal_code": "33601",
      "country": "US",
      "phone": "+18135551234",
      "email": "info@abcrealty.com",
      "website": "https://abcrealty.com",
      "source_url": "https://realtor.com/agent/abc-realty",
      "confidence": 0.95,
      "notes": "Verified on Realtor.com and Zillow"
    }
  ]
}
```

## Data Schema

Each business record contains:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| business_name | string | Yes | Business name |
| category | string | Yes | Normalized category |
| street | string | No | Street address |
| city | string | No | City |
| state | string | No | State (2-letter code) |
| postal_code | string | No | ZIP/postal code |
| country | string | No | Country code (default: US) |
| phone | string | No | E.164 formatted phone |
| email | string | No | Public business email |
| website | string | No | Normalized website URL |
| source_url | string | Yes | Where record was found |
| confidence | number | Yes | Confidence score (0-1) |
| notes | string | No | Additional context |

## Deployment to Render

### Option 1: Blueprint (Recommended)

1. Push this repository to GitHub
2. In Render Dashboard: **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will auto-configure from `render.yaml`
5. Add environment variables in the Render dashboard
6. Deploy

### Option 2: Manual

1. In Render Dashboard: **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: ringlypro-public-business-collector
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or upgrade as needed)
4. Add environment variables
5. Deploy

### Post-Deployment

Your service will be available at:
```
https://ringlypro-public-business-collector.onrender.com
```

Test it:
```bash
curl "https://ringlypro-public-business-collector.onrender.com/health"
curl "https://ringlypro-public-business-collector.onrender.com/run?category=Dentists&geo=Miami&max=100"
```

## Source Priority

The collector follows this source hierarchy:

1. **Official Registries** - State license boards, professional associations
2. **Major Directories** - Google Business Profiles, Yelp, BBB
3. **Local Directories** - Chamber of Commerce, city/county listings
4. **Company Websites** - Direct business websites for email/phone validation

## Quality Assurance

- **Cross-validation**: Records are verified across multiple sources when possible
- **Deduplication**: Automatic duplicate removal by website, or name+phone+ZIP
- **Normalization**: Phone numbers formatted to E.164, URLs cleaned
- **Confidence scoring**: Higher confidence for multi-source verified records
- **Source traceability**: Every record links back to its source

## Rate Limiting

Default: 10 requests per minute per IP address. Adjust via `MAX_REQUESTS_PER_MINUTE` environment variable.

## Error Handling

If a collection fails, the API returns:

```json
{
  "meta": {
    "category": "...",
    "geography": "...",
    "total_found": 0,
    "error": "Error description",
    "execution_time_ms": 123
  },
  "rows": []
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run tests (when available)
npm test
```

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: https://github.com/ringlypro/ringlypro-public-business-collector/issues
- Website: https://ringlypro.com

## Ethical Use

This tool is designed for legitimate business development purposes. Users are responsible for:
- Complying with all applicable laws (CAN-SPAM, GDPR, CASL, etc.)
- Respecting opt-out requests
- Using data only for lawful purposes
- Not engaging in spam or harassment

**Do not use this tool to:**
- Send unsolicited bulk emails
- Harass individuals or businesses
- Violate privacy laws
- Access non-public data
- Circumvent access controls or paywalls
