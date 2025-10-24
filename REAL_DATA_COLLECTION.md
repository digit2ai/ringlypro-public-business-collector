# Real Data Collection - Architecture Update

## Problem: LLM Hallucination

The original Business Collector asked Claude/OpenAI to "discover publicly available small-business records" from sources like Google, Yelp, BBB, etc. 

**This doesn't work** because:
- LLMs cannot browse websites
- LLMs cannot access APIs
- LLMs cannot scrape data
- LLMs can only generate text based on training data

Result: **0 real businesses, only hallucinated/empty data**

## Solution: Real API Integration

We completely rebuilt the architecture to use **actual public data sources**:

### New Architecture

```
User Request: "Collect Real Estate Agents in Florida"
    ↓
[1] REAL DATA COLLECTION (NEW!)
    • Google Places API → Fetch operating businesses
    • OpenCorporates API → Fetch registered entities
    ↓
[2] GET ACTUAL RESULTS
    {
      "business_name": "ABC Realty",
      "phone": "+1-813-555-1234",
      "address": "123 Main St, Tampa, FL",
      "website": "abcrealty.com",
      "source": "Google Places"
    }
    ↓
[3] DEDUPLICATE & MERGE
    • Remove duplicates across sources
    • Calculate confidence scores
    • Sort by data quality
```

### What Changed

**Created New Files:**

1. **src/collectors/google-places.js** (206 lines)
   - Integrates with Google Places API
   - Fetches real operating businesses
   - Extracts phone, website, address, ratings
   - Handles pagination (up to 60 results per query)
   - Confidence scoring based on reviews/ratings

2. **src/collectors/opencorporates.js** (253 lines)
   - Integrates with OpenCorporates API
   - Fetches registered business entities
   - Maps US states to jurisdiction codes
   - Parses registered addresses
   - Confidence scoring based on status/age

3. **src/collectors/index.js** (141 lines)
   - Orchestrates multiple data sources
   - Combines results from Google Places + OpenCorporates
   - Automatic deduplication
   - Error handling with fallbacks
   - `collectFromAllSources()` - Multi-source collection
   - `quickCollect()` - Fast single-source collection

**Updated Files:**

4. **src/orchestrator.js**
   - Replaced LLM-only approach with real data collectors
   - Now calls `collectFromAllSources()` instead of asking LLM
   - Version bumped to 2.0.0
   - Method: "real-data-collection"

5. **.env.example**
   - Added `GOOGLE_MAPS_API_KEY` (required)
   - Added `OPENCORPORATES_API_KEY` (optional)
   - Made LLM keys optional (for future features)

6. **package.json**
   - Added dependencies: `node-fetch`, `dayjs`, `fast-csv`, `libphonenumber-js`, `string-similarity`

## Data Sources

### 1. Google Places API (Primary Source)

**Why:** Most up-to-date, includes operating businesses only

**Data provided:**
- Business name
- Phone number
- Website
- Full address (street, city, state, ZIP)
- Google rating & review count
- Place ID for verification
- Operating status

**Limitations:**
- Requires API key (Google Cloud Platform)
- Rate limits apply
- 20 results per request (max 60 with pagination)

### 2. OpenCorporates (Backup Source)

**Why:** Authoritative registration data, no API key required for basic use

**Data provided:**
- Legal business name
- Registered address
- Company number
- Incorporation date
- Current status (active/dissolved)
- Company type

**Limitations:**
- May include dissolved businesses
- Limited phone/website data
- Rate limits on free tier

### 3. Future Sources (Ready to Add)

The architecture supports adding:
- **SAM.gov** - Federal contractors
- **SBA DSBS** - Small Business Administration data
- **Yelp API** - Reviews and business info
- **Data.com / ZoomInfo** - B2B contact data

## Configuration

### Required: Google Maps API Key

1. Go to https://console.cloud.google.com/
2. Create project or select existing
3. Enable "Places API"
4. Create API key (Credentials → Create Credentials → API Key)
5. Add to Render environment variables:
   ```
   GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
   ```

**Free tier:** 
- $200 monthly credit
- ~28,500 Place Search requests/month free
- ~40,000 Place Details requests/month free

### Optional: OpenCorporates API Key

OpenCorporates works without a key but has strict rate limits. With a key:

1. Register at https://opencorporates.com/api_accounts/new
2. Get API key from dashboard
3. Add to Render:
   ```
   OPENCORPORATES_API_KEY=YOUR_KEY_HERE
   ```

**Free tier:**
- 500 requests/month
- 5 requests/second

## How It Works Now

### Example Request

```bash
POST https://ringlypro-public-business-collector.onrender.com/run
Content-Type: application/json

{
  "category": "Real Estate Agent",
  "geography": "Florida",
  "maxResults": 50
}
```

### Response

```json
{
  "meta": {
    "category": "Real Estate Agent",
    "geography": "Florida",
    "total_found": 50,
    "generated_at": "2025-10-23T22:00:00.000Z",
    "sources_used": ["Google Places", "OpenCorporates"],
    "execution_time_ms": 12500,
    "orchestrator_version": "2.0.0",
    "method": "real-data-collection"
  },
  "rows": [
    {
      "business_name": "ABC Realty Inc",
      "category": "Real Estate Agent",
      "street": "123 Main Street",
      "city": "Tampa",
      "state": "FL",
      "postal_code": "33601",
      "country": "USA",
      "phone": "+18135551234",
      "email": null,
      "website": "https://abcrealty.com",
      "source_url": "https://www.google.com/maps/place/?q=place_id:ChIJ...",
      "confidence": 0.85,
      "notes": "Rating: 4.8 (127 reviews)",
      "google_place_id": "ChIJ...",
      "google_rating": 4.8,
      "google_reviews": 127
    },
    ...
  ]
}
```

## Deployment

### Render Configuration

The Business Collector service will auto-deploy from GitHub. You need to add the Google Maps API key:

1. Go to https://dashboard.render.com
2. Find "ringlypro-public-business-collector" service
3. Go to Environment tab
4. Add environment variable:
   - Key: `GOOGLE_MAPS_API_KEY`
   - Value: Your API key from Google Cloud
5. Click "Save Changes"
6. Service will automatically redeploy

### Verification

After deployment, test the service:

```bash
# Health check
curl https://ringlypro-public-business-collector.onrender.com/health

# Real data test
curl -X POST https://ringlypro-public-business-collector.onrender.com/run \
  -H "Content-Type: application/json" \
  -d '{"category":"Coffee Shop","geography":"Seattle","maxResults":5}'
```

## Benefits of This Approach

### ✅ Real Data
- Actual businesses that exist
- Verified addresses and phone numbers
- Current operating status
- Real customer reviews

### ✅ Multiple Sources
- Google Places (current operating businesses)
- OpenCorporates (registered entities)
- Automatic deduplication
- Cross-validation

### ✅ Confidence Scoring
- Based on data quality indicators
- Rating and review counts
- Operating status
- Address completeness
- Multi-source confirmation

### ✅ Scalable
- Easy to add new data sources
- Fallback mechanisms
- Error handling
- Rate limiting respected

### ✅ Compliant
- Uses public APIs
- Respects rate limits
- Includes source attribution
- No web scraping violations

## What's Next

1. **Add Google Maps API Key to Render** (required for real data)
2. **Test end-to-end** from AI Copilot UI
3. **Monitor usage** (Google Cloud Console)
4. **Add more sources** as needed (Yelp, SAM.gov, etc.)

## Cost Estimate

With Google Places API:
- Free tier: $200/month credit
- Typical cost: $0.017 per Place Search
- 5,000 searches = ~$85/month
- 10,000 searches = ~$170/month

**Recommendation:** Start with free tier, monitor usage in Google Cloud Console.

---

**Status:** ✅ Code deployed to GitHub, awaiting Google Maps API key in Render

**Commit:** `784e399` - Replace LLM hallucination with real data collection APIs
