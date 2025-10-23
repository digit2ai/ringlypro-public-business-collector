# RinglyPro Public Business Collector - Project Summary

## Overview

A **completely separate** repository from RinglyPro-CRM, designed to collect publicly available small business data in a compliant, ethical manner.

## Project Location

```
/Users/manuelstagg/Documents/GitHub/ringlypro-public-business-collector/
```

**IMPORTANT**: This is NOT inside the RinglyPro-CRM directory. It's a standalone project with its own:
- Git repository
- Dependencies (package.json)
- Server configuration
- Port (3001 vs CRM's 3000)
- Deployment pipeline

## No Conflicts with RinglyPro-CRM

### Separation Guarantees

1. **Different Directory** - Completely separate file structure
2. **Different Port** - Uses port 3001 (CRM uses 3000)
3. **Different Repository** - Own git history and remote
4. **Different Dependencies** - No shared node_modules
5. **Different Deployment** - Own Render service
6. **Different Database** - No database conflicts (collector doesn't use DB)
7. **Different API Keys** - Uses LLM keys (OpenAI/Anthropic)

### Running Both Services

You can run both services simultaneously:

```bash
# Terminal 1: RinglyPro CRM
cd /Users/manuelstagg/Documents/GitHub/RinglyPro-CRM
npm start  # Runs on port 3000

# Terminal 2: Business Collector
cd /Users/manuelstagg/Documents/GitHub/ringlypro-public-business-collector
npm start  # Runs on port 3001
```

## Architecture

### RinglyPro CRM (Existing)
- **Purpose**: Customer relationship management, voice AI, appointments
- **Tech**: Express + PostgreSQL + Twilio + Stripe
- **Port**: 3000
- **Deployment**: ringlypro-crm.onrender.com

### Business Collector (New)
- **Purpose**: Public business data research and collection
- **Tech**: Express + LLM (OpenAI/Anthropic) + Web scraping
- **Port**: 3001
- **Deployment**: ringlypro-public-business-collector.onrender.com

## Project Structure

```
ringlypro-public-business-collector/
├── README.md                    # Full documentation
├── DEPLOYMENT.md                # Step-by-step deployment guide
├── CODE_OF_CONDUCT.md          # Ethical use guidelines
├── SECURITY.md                  # Security policy
├── LICENSE                      # MIT license
├── package.json                 # Dependencies
├── render.yaml                  # Render deployment config
├── .env.example                 # Environment template
├── .gitignore                   # Git exclusions
├── server.js                    # Main Express server
└── src/
    ├── orchestrator.js          # LLM-driven research orchestration
    └── utils/
        ├── logger.js            # Winston logging
        ├── deduplication.js     # Record normalization & dedup
        └── robots.js            # robots.txt compliance

```

## Key Features

### 1. Compliance-First Design
- Respects robots.txt automatically
- Rate limiting (10 req/min default)
- Source traceability for every record
- CAN-SPAM, GDPR, CASL compliant by design
- Public data only - no authentication bypass

### 2. LLM-Orchestrated Research
- Uses OpenAI GPT-4 or Anthropic Claude
- Intelligent source selection
- Multi-source cross-validation
- Automatic quality assessment

### 3. Data Quality
- Automatic deduplication
- E.164 phone number formatting
- URL normalization
- Confidence scoring (0-1)
- Cross-source verification

### 4. Production Ready
- Helmet.js security headers
- CORS enabled
- Express rate limiting
- Winston logging
- Health check endpoint
- Render-optimized

## API Endpoints

### GET /health
Returns service status

### GET /run
Collect business data
```
?category=Real%20Estate%20Agents
&geo=Florida
&max=500
```

### POST /run
Advanced collection with JSON body
```json
{
  "category": "Plumbers",
  "geography": "Tampa Bay, FL",
  "maxResults": 300,
  "synonyms": ["Plumbing", "Pipe Repair"]
}
```

## Response Format

```json
{
  "meta": {
    "category": "Real Estate Agents",
    "geography": "Florida",
    "total_found": 487,
    "generated_at": "2025-10-23T12:00:00.000Z",
    "sources_used": ["realtor.com", "zillow.com"],
    "deduplication_applied": true,
    "duplicates_removed": 13,
    "execution_time_ms": 4523
  },
  "rows": [
    {
      "business_name": "ABC Realty",
      "category": "Real Estate Agents",
      "phone": "+18135551234",
      "email": "info@abcrealty.com",
      "website": "https://abcrealty.com",
      "source_url": "https://realtor.com/agent/abc",
      "confidence": 0.95,
      ...
    }
  ]
}
```

## Deployment to Render

### Quick Steps

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/ringlypro-public-business-collector.git
   git push -u origin main
   ```

2. **Deploy to Render**
   - New → Blueprint
   - Connect repository
   - Render auto-configures from render.yaml
   - Add OPENAI_API_KEY or ANTHROPIC_API_KEY
   - Deploy

3. **Test**
   ```bash
   curl https://ringlypro-public-business-collector.onrender.com/health
   ```

## Environment Variables

### Required
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

### Optional
- `PORT` (default: 3001)
- `MAX_REQUESTS_PER_MINUTE` (default: 10)
- `RESPECT_ROBOTS_TXT` (default: true)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` (for S3 storage)

## Security & Compliance

### Built-in Protections
- ✅ robots.txt checking
- ✅ Rate limiting
- ✅ HTTP security headers (Helmet)
- ✅ CORS
- ✅ Input validation
- ✅ Audit logging

### Legal Compliance
- ✅ CAN-SPAM (US)
- ✅ GDPR (EU)
- ✅ CASL (Canada)
- ✅ Source attribution
- ✅ Public data only

## Development

```bash
# Install
npm install

# Copy environment
cp .env.example .env

# Add your API key to .env
# OPENAI_API_KEY=sk-...

# Run development server
npm run dev

# Test
curl "http://localhost:3001/health"
curl "http://localhost:3001/run?category=Coffee%20Shops&geo=Seattle&max=10"
```

## Integration with RinglyPro CRM

While these are separate services, you can integrate them:

### Option 1: Direct API Call
From your CRM, call the collector API:
```javascript
const response = await axios.get(
  'https://ringlypro-public-business-collector.onrender.com/run',
  {
    params: {
      category: 'Real Estate Agents',
      geo: 'Florida',
      max: 500
    }
  }
);
const businesses = response.data.rows;
// Import into CRM as leads
```

### Option 2: Scheduled Batch
Use a cron job to collect and import daily:
```yaml
# In collector's render.yaml
cronJobs:
  - name: daily-collect
    schedule: "0 2 * * *"  # 2 AM daily
    command: "node scripts/collect-and-push-to-crm.js"
```

### Option 3: Manual Import
1. Run collection via API
2. Download JSON results
3. Import into CRM via admin panel

## Next Steps

1. **Push to GitHub**
   - Create repository on GitHub
   - Push this code
   - Enable branch protection

2. **Deploy to Render**
   - Follow DEPLOYMENT.md
   - Add API keys
   - Test endpoints

3. **Monitor & Optimize**
   - Check logs regularly
   - Adjust rate limits if needed
   - Upgrade plan for production use

4. **Integrate with CRM**
   - Decide on integration strategy
   - Implement API calls or batch imports
   - Test end-to-end flow

## Support & Documentation

- **Full README**: [README.md](README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Security Policy**: [SECURITY.md](SECURITY.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **License**: [LICENSE](LICENSE) (MIT)

## Git Status

```bash
# Current status
git status
# On branch main
# nothing to commit, working tree clean

# First commit made
git log --oneline
# dab0f39 Initial commit: RinglyPro Public Business Collector
```

## Summary

✅ **Completely separate from RinglyPro-CRM**
✅ **No conflicts or dependencies**
✅ **Production-ready code**
✅ **Full compliance documentation**
✅ **Ready to deploy to Render**
✅ **Ethical and legal by design**

This collector can safely run alongside your CRM without any conflicts. They are completely independent services that can optionally integrate via API calls.
