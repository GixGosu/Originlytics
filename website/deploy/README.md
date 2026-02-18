# OriginLytics.com - Deployment Package

## Overview

This directory contains all files and documentation needed for production deployment of the OriginLytics.com website.

---

## Directory Contents

### Deployment Scripts
- **`deploy.sh`** - Automated deployment script with support for Vercel, Netlify, and FTP
- **`test-deployment.sh`** - Pre-deployment testing script (validates HTML, CSS, links, etc.)

### Server Configuration Files
- **`nginx.conf`** - Nginx server configuration with security headers and caching
- **`.htaccess`** - Apache server configuration for traditional hosting
- **`vercel.json`** - Vercel deployment configuration (recommended platform)
- **`netlify.toml`** - Netlify deployment configuration (alternative platform)

### Documentation
- **`DEPLOYMENT_GUIDE.md`** - Complete step-by-step deployment guide for all platforms
- **`PERFORMANCE_CHECKLIST.md`** - Performance optimization checklist and Core Web Vitals targets
- **`README.md`** - This file

---

## Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Navigate to website root
cd /path/to/originlytics-website

# Run deployment script
./deploy/deploy.sh
```

The script will:
1. Validate all required files
2. Create backup
3. Build optimized version
4. Prompt for deployment target (Vercel/Netlify/FTP)
5. Deploy to selected platform

### Option 2: Vercel CLI (Fastest)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
cd /path/to/originlytics-website
vercel --prod
```

### Option 3: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to production
cd /path/to/originlytics-website
netlify deploy --prod --dir .
```

---

## Pre-Deployment Testing

**Always run tests before deploying to production:**

```bash
./deploy/test-deployment.sh
```

This script checks:
- Required files present
- HTML/CSS/JavaScript validation
- Broken links
- Meta tags
- Structured data
- Image optimization
- File sizes
- Mobile-friendliness
- Lighthouse scores (if available)

---

## Deployment Platforms

### Vercel (Recommended)
**Best for**: Static websites, automatic deployments, excellent performance

**Pros:**
- Fastest deployment (1 command)
- Global edge CDN (70+ locations)
- Automatic SSL certificates
- Built-in compression (gzip, Brotli)
- Zero configuration
- Free tier sufficient for most sites

**Configuration File**: `vercel.json`

**Deploy Command**:
```bash
vercel --prod
```

**Documentation**: See `DEPLOYMENT_GUIDE.md` → "Option 1: Vercel"

---

### Netlify (Alternative)
**Best for**: Static sites, form handling, A/B testing

**Pros:**
- Excellent developer experience
- Built-in form handling
- Split testing capabilities
- Automatic SSL and CDN
- Free tier available

**Configuration File**: `netlify.toml`

**Deploy Command**:
```bash
netlify deploy --prod --dir .
```

**Documentation**: See `DEPLOYMENT_GUIDE.md` → "Option 2: Netlify"

---

### Traditional Hosting (cPanel/FTP)
**Best for**: Shared hosting, existing infrastructure

**Pros:**
- Works with any web host
- Full server control
- Often includes email hosting

**Configuration File**: `.htaccess`

**Deploy Steps**:
1. Run `./deploy/deploy.sh` (select option 4 for local build)
2. Upload files from `build/` directory via FTP
3. Upload `.htaccess` to root directory

**Documentation**: See `DEPLOYMENT_GUIDE.md` → "Option 3: Traditional Hosting"

---

## Server Configuration

### Nginx
If you're using Nginx, copy the configuration:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/originlytics.com
sudo ln -s /etc/nginx/sites-available/originlytics.com /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

**Features configured:**
- HTTPS redirect
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Compression (gzip, Brotli)
- Caching headers
- SSL/TLS optimization

### Apache
If you're using Apache, upload `.htaccess`:

```bash
cp deploy/.htaccess /path/to/public_html/.htaccess
```

**Features configured:**
- HTTPS redirect
- Security headers
- Compression (gzip, Brotli)
- Caching headers
- Pretty URLs

---

## Performance Optimization

### Before Deployment
- [ ] Run performance tests: `./deploy/test-deployment.sh`
- [ ] Compress all images (TinyPNG, Squoosh)
- [ ] Minify CSS/JavaScript (or use automated build)
- [ ] Test Lighthouse score (target: 90+)

### After Deployment
- [ ] Enable CDN (Cloudflare, or built-in with Vercel/Netlify)
- [ ] Verify compression enabled (gzip/Brotli)
- [ ] Test from multiple locations (GTmetrix, WebPageTest)
- [ ] Monitor Core Web Vitals (Google Search Console)

**Detailed checklist**: See `PERFORMANCE_CHECKLIST.md`

---

## Post-Deployment Steps

### 1. Verify Deployment
```bash
# Check if site is live
curl -I https://originlytics.com

# Test HTTPS redirect
curl -I http://originlytics.com

# Test compression
curl -H "Accept-Encoding: gzip" -I https://originlytics.com
```

### 2. Submit to Search Engines
- **Google Search Console**: Submit sitemap at https://search.google.com/search-console
- **Bing Webmaster Tools**: Submit sitemap at https://www.bing.com/webmasters

### 3. Set Up Monitoring
- **Uptime**: UptimeRobot or Better Uptime
- **Errors**: Sentry (configure in `monitoring.js`)
- **Analytics**: Google Analytics (configure in `analytics.js`)

### 4. Test Everything
- [ ] All pages load correctly
- [ ] All links work (no 404s)
- [ ] Forms submit successfully
- [ ] Mobile menu works
- [ ] Images load properly
- [ ] Analytics tracking works
- [ ] No console errors

**Detailed guide**: See `DEPLOYMENT_GUIDE.md` → "Post-Deployment Verification"

---

## Environment Variables

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required variables:**
- `GOOGLE_ANALYTICS_ID` - GA4 Measurement ID
- `SENTRY_DSN` - Sentry error tracking DSN

**For Vercel/Netlify:** Set environment variables in platform dashboard, not in `.env` file.

---

## Troubleshooting

### Issue: Deployment fails
**Solution:**
- Check internet connection
- Verify CLI is logged in (`vercel whoami` or `netlify status`)
- Check for errors in console output
- Ensure all required files are present

### Issue: Site shows 404
**Solution:**
- Verify DNS is configured correctly
- Check DNS propagation: https://www.whatsmydns.net/
- Ensure domain is added in platform settings
- Wait up to 48 hours for DNS to propagate

### Issue: CSS/JS not loading
**Solution:**
- Check file paths are correct
- Verify files were uploaded
- Clear browser cache
- Check browser console for errors

### Issue: Images not displaying
**Solution:**
- Verify image files uploaded to correct directory
- Check file paths in HTML
- Ensure image filenames match (case-sensitive)

**More troubleshooting**: See `DEPLOYMENT_GUIDE.md` → "Troubleshooting"

---

## Rollback Procedure

If deployment causes issues, you can quickly rollback:

### Vercel/Netlify
1. Go to deployments dashboard
2. Find previous working deployment
3. Click "Promote to Production"
4. Site reverts instantly

### Traditional Hosting
```bash
# Restore from backup
cd /path/to/originlytics-website
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
# Upload restored files via FTP
```

---

## Maintenance

### Regular Tasks
- **Weekly**: Check uptime, review analytics
- **Monthly**: Performance audit, update content
- **Quarterly**: Security audit, dependency updates

### Updating the Site
1. Make changes to files
2. Test locally
3. Run `./deploy/test-deployment.sh`
4. If tests pass, run `./deploy/deploy.sh`
5. Verify changes on production

---

## Security

### Best Practices
- [ ] Always use HTTPS
- [ ] Enable security headers (already configured)
- [ ] Keep software/dependencies updated
- [ ] Use strong passwords for hosting accounts
- [ ] Enable 2FA on all accounts
- [ ] Regularly backup site files
- [ ] Monitor for security vulnerabilities

### Security Headers Configured
- Content-Security-Policy
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HSTS)

---

## Support & Resources

### Documentation
- Full deployment guide: `DEPLOYMENT_GUIDE.md`
- Performance optimization: `PERFORMANCE_CHECKLIST.md`
- Image requirements: `../images/ASSET_REQUIREMENTS.md`

### External Resources
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com/
- Web.dev Performance: https://web.dev/performance/
- MDN Web Docs: https://developer.mozilla.org/

### Tools
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- PageSpeed Insights: https://pagespeed.web.dev/
- GTmetrix: https://gtmetrix.com/
- SSL Test: https://www.ssllabs.com/ssltest/

---

## File Descriptions

### deploy.sh
Automated deployment script that:
- Validates files
- Creates backups
- Builds optimized version
- Deploys to selected platform

**Usage**: `./deploy.sh`

### test-deployment.sh
Pre-deployment testing script that:
- Validates HTML, CSS, JavaScript
- Checks for broken links
- Tests meta tags and structured data
- Runs Lighthouse audit (if available)

**Usage**: `./test-deployment.sh`

### nginx.conf
Production-ready Nginx configuration with:
- HTTPS redirect
- Security headers
- Compression (gzip, Brotli)
- Caching strategy
- SSL/TLS optimization

**Usage**: Copy to `/etc/nginx/sites-available/`

### .htaccess
Apache configuration file with:
- HTTPS redirect
- Security headers
- Compression
- Caching headers
- Pretty URLs

**Usage**: Upload to website root directory

### vercel.json
Vercel platform configuration:
- Build settings
- Routing rules
- Header configuration
- Caching strategy

**Usage**: Automatically used by Vercel

### netlify.toml
Netlify platform configuration:
- Build settings
- Redirects
- Headers
- Plugin configuration

**Usage**: Automatically used by Netlify

---

## Deployment Checklist

### Pre-Deployment
- [ ] All content reviewed and approved
- [ ] All images optimized
- [ ] Analytics configured (GA4 ID added)
- [ ] Error tracking configured (Sentry DSN added)
- [ ] Test script passed (`./deploy/test-deployment.sh`)
- [ ] Lighthouse score ≥ 90

### Deployment
- [ ] Run deployment script or CLI command
- [ ] Configure custom domain
- [ ] Set environment variables
- [ ] Enable auto-deployments (optional)

### Post-Deployment
- [ ] Site accessible at production URL
- [ ] HTTPS working
- [ ] All pages/features tested
- [ ] Search Console configured
- [ ] Sitemap submitted
- [ ] Monitoring enabled
- [ ] Analytics tracking verified

---

## Getting Help

### Issues with Deployment
1. Check the troubleshooting section above
2. Review `DEPLOYMENT_GUIDE.md` for detailed instructions
3. Check platform status pages:
   - Vercel: https://www.vercel-status.com/
   - Netlify: https://www.netlifystatus.com/

### Performance Issues
1. Review `PERFORMANCE_CHECKLIST.md`
2. Run Lighthouse audit for specific recommendations
3. Check Core Web Vitals in Google Search Console

### Technical Support
- Platform documentation (Vercel/Netlify)
- Community forums (Stack Overflow)
- Platform support (for paid plans)

---

## Version Information

**Package Version**: 1.0.0
**Last Updated**: 2025-01-15
**Maintained By**: DevOps Team

---

## License

All deployment scripts and configurations are provided as-is for the OriginLytics.com website.

---

**Ready to deploy? Run: `./deploy.sh`**
