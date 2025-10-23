# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Features

### Built-in Protections

1. **Rate Limiting** - Prevents abuse via express-rate-limit
2. **Helmet.js** - HTTP security headers
3. **Input Validation** - Query parameter sanitization
4. **CORS** - Cross-origin resource sharing controls
5. **Environment Variables** - Sensitive data in .env files
6. **Logging** - Winston for audit trails

### Data Security

- No persistent storage of collected data by default
- Optional S3 encryption for stored results
- Source URLs tracked for traceability
- No credentials or authentication tokens stored

### Compliance

- robots.txt checking enabled by default
- Rate limiting to prevent overwhelming sources
- Public data only - no authentication bypass
- CAN-SPAM/GDPR/CASL compliant by design

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **Do NOT** open a public GitHub issue
2. Email security@ringlypro.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. Response timeline:
   - Initial response: 48 hours
   - Status update: 7 days
   - Fix timeline: 30 days for critical issues

## Security Best Practices for Deployment

### Environment Variables

Never commit:
- API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY)
- AWS credentials
- Any sensitive configuration

Use Render's environment variable management for production.

### API Key Rotation

Rotate API keys regularly:
- OpenAI/Anthropic keys: Every 90 days
- AWS credentials: Every 180 days

### Rate Limiting

Adjust `MAX_REQUESTS_PER_MINUTE` based on your use case:
- Development: 10 (default)
- Light production: 30
- Heavy production: 100

### Monitoring

Set up alerts for:
- Unusual traffic patterns
- High error rates
- API key usage spikes
- Failed authentication attempts

### Network Security

On Render:
- Enable HTTPS (automatic)
- Use environment variables for secrets
- Enable web application firewall if available
- Monitor logs for suspicious activity

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. **Report** - Email security@ringlypro.com
2. **Acknowledgment** - We confirm receipt within 48 hours
3. **Assessment** - We evaluate severity and impact
4. **Fix** - We develop and test a fix
5. **Release** - We deploy the fix to production
6. **Disclosure** - We publicly disclose after fix (with credit to reporter)

## Known Limitations

- LLM responses may vary in quality
- Public data sources may become unavailable
- Rate limiting may not prevent all abuse
- robots.txt checking requires network access

## Updates

This security policy is reviewed quarterly. Last update: 2025-10-23

## Contact

- Security issues: security@ringlypro.com
- General support: support@ringlypro.com
- GitHub: https://github.com/ringlypro/ringlypro-public-business-collector
