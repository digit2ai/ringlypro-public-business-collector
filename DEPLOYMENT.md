# Deployment Guide

## Prerequisites

1. GitHub account
2. Render account (https://render.com)
3. OpenAI or Anthropic API key

## Step 1: Push to GitHub

```bash
cd ringlypro-public-business-collector

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: RinglyPro Public Business Collector"

# Create GitHub repository (via web or gh CLI)
# Then add remote and push:
git remote add origin https://github.com/YOUR_USERNAME/ringlypro-public-business-collector.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Render

### Option A: Blueprint (Recommended)

1. Log in to Render Dashboard
2. Click **New** → **Blueprint**
3. Connect your GitHub account if not already connected
4. Select the `ringlypro-public-business-collector` repository
5. Render will automatically detect `render.yaml` and configure the service
6. Click **Apply** to create the service

### Option B: Manual

1. Log in to Render Dashboard
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ringlypro-public-business-collector`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (upgrade later if needed)

## Step 3: Add Environment Variables

In the Render Dashboard, add these environment variables:

### Required
- `OPENAI_API_KEY` - Your OpenAI API key
  OR
- `ANTHROPIC_API_KEY` - Your Anthropic API key

### Optional (S3 Storage)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (default: us-east-1)
- `S3_BUCKET`

### Optional (Configuration)
- `MAX_REQUESTS_PER_MINUTE` (default: 10)
- `LOG_LEVEL` (default: info)

Click **Save Changes** - Render will automatically redeploy.

## Step 4: Test Your Deployment

Once deployed, your service will be available at:
```
https://ringlypro-public-business-collector.onrender.com
```

Test it:

```bash
# Health check
curl https://ringlypro-public-business-collector.onrender.com/health

# Small test collection
curl "https://ringlypro-public-business-collector.onrender.com/run?category=Coffee%20Shops&geo=Seattle&max=10"
```

## Step 5: Monitor

In Render Dashboard:
- **Logs** - View real-time logs
- **Metrics** - CPU, Memory, Request volume
- **Events** - Deployment history

## Troubleshooting

### Service Won't Start

Check logs for:
- Missing environment variables (OPENAI_API_KEY or ANTHROPIC_API_KEY)
- npm install errors
- Port binding issues

### API Requests Failing

- Verify API keys are correct
- Check API key quotas/billing
- Review logs for error messages

### Rate Limiting Issues

Adjust `MAX_REQUESTS_PER_MINUTE` in environment variables.

## Upgrading Plans

Free tier limitations:
- Sleeps after 15 minutes of inactivity
- 750 hours/month
- Shared CPU/memory

To upgrade:
1. Go to your service in Render Dashboard
2. Settings → Plan
3. Select a paid plan (Starter: $7/month)

## Custom Domain

To use a custom domain:
1. Settings → Custom Domains
2. Add your domain
3. Configure DNS (CNAME or A record)
4. Render handles SSL automatically

## Auto-Deploy

Auto-deploy is enabled by default. Every push to `main` branch will trigger a new deployment.

To disable:
1. Settings → Auto-Deploy
2. Toggle off

## Scheduled Tasks

To add a cron job (e.g., nightly collection):

1. Edit `render.yaml`:
```yaml
cronJobs:
  - name: nightly-collect
    schedule: "0 4 * * *"  # 04:00 UTC daily
    command: "curl -sS https://$RENDER_SERVICE_HOST/run?category=Dentists&geo=California&max=500 > /tmp/output.json"
```

2. Commit and push to trigger redeployment

## Environment-Specific Configuration

### Development
```bash
npm run dev  # Uses .env file
```

### Production
Uses Render environment variables

## Backup & Disaster Recovery

1. **Code**: Always in GitHub (version controlled)
2. **Configuration**: Document environment variables
3. **Data**: If using S3, enable versioning
4. **Logs**: Render keeps logs for 7 days (Free plan)

## Security Checklist

- [ ] API keys stored as environment variables (not in code)
- [ ] `RESPECT_ROBOTS_TXT` set to `true`
- [ ] Rate limiting enabled
- [ ] HTTPS enabled (automatic on Render)
- [ ] Regular security updates (`npm audit`)

## Performance Optimization

1. **Upgrade Plan** - More CPU/RAM for faster processing
2. **Caching** - Implement result caching if needed
3. **Batch Requests** - Process multiple categories in parallel
4. **Database** - Add PostgreSQL for persistent storage

## Cost Estimation

### Free Tier
- Cost: $0/month
- Limitations: Sleeps after inactivity, 750 hours

### Starter Plan ($7/month)
- Always on
- 2x faster builds
- More concurrent requests

### Standard Plan ($25/month)
- 4x resources
- Priority support
- Advanced metrics

## Support

- Render Status: https://status.render.com
- Documentation: https://render.com/docs
- Community: https://community.render.com
- Project Issues: https://github.com/YOUR_USERNAME/ringlypro-public-business-collector/issues
