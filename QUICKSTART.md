# Quick Start Guide

Get the RinglyPro Business Collector running in 5 minutes.

## 1. Install Dependencies

```bash
cd /Users/manuelstagg/Documents/GitHub/ringlypro-public-business-collector
npm install
```

## 2. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env and add your API key
nano .env
```

Add ONE of these:
```env
OPENAI_API_KEY=sk-proj-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

## 3. Start the Server

```bash
npm start
```

You should see:
```
🚀 Server running on port 3001
📋 Health check: http://localhost:3001/health
🔍 Collection endpoint: http://localhost:3001/run?category=X&geo=Y&max=500
```

## 4. Test It

### Health Check
```bash
curl http://localhost:3001/health
```

Expected:
```json
{
  "status": "ok",
  "service": "ringlypro-public-business-collector",
  "version": "1.0.0",
  "timestamp": "2025-10-23T..."
}
```

### Small Test Collection
```bash
curl "http://localhost:3001/run?category=Coffee%20Shops&geo=Seattle&max=5"
```

Expected:
```json
{
  "meta": {
    "category": "Coffee Shops",
    "geography": "Seattle",
    "total_found": 5,
    "sources_used": ["..."],
    ...
  },
  "rows": [
    {
      "business_name": "Example Coffee",
      "phone": "+12065551234",
      ...
    }
  ]
}
```

## 5. Try Real Collection

### Real Estate Agents in Florida
```bash
curl "http://localhost:3001/run?category=Real%20Estate%20Agents&geo=Florida&max=100"
```

### Plumbers in Tampa
```bash
curl "http://localhost:3001/run?category=Plumbers&geo=Tampa,%20FL&max=50"
```

### Dentists in Miami
```bash
curl "http://localhost:3001/run?category=Dentists&geo=Miami&max=75"
```

## 6. Use POST for Complex Requests

```bash
curl -X POST http://localhost:3001/run \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Real Estate Agents",
    "geography": "Tampa Bay, FL",
    "maxResults": 200,
    "synonyms": ["Realtor", "Broker", "Real Estate Professional"]
  }'
```

## Common Issues

### "No LLM API key configured"
→ Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`

### "Cannot find module"
→ Run `npm install`

### "Port 3001 already in use"
→ Change `PORT=3002` in `.env`

### "Rate limit exceeded"
→ Increase `MAX_REQUESTS_PER_MINUTE` in `.env`

## Next Steps

1. **Deploy to Render** - See [DEPLOYMENT.md](DEPLOYMENT.md)
2. **Integrate with CRM** - See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
3. **Read Full Docs** - See [README.md](README.md)

## Development Mode

For auto-reload on file changes:
```bash
npm run dev
```

## Project Structure

```
.
├── server.js              ← Main Express server
├── src/
│   ├── orchestrator.js    ← LLM orchestration logic
│   └── utils/
│       ├── logger.js      ← Logging
│       ├── deduplication.js ← Data normalization
│       └── robots.js      ← Compliance checking
└── [documentation files]
```

## Support

- Issues: Create GitHub issue
- Questions: See [README.md](README.md)
- Security: See [SECURITY.md](SECURITY.md)

---

**You're ready!** The collector is now running at http://localhost:3001
