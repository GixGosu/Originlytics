# OriginLytics.com - Complete Deployment Guide

## Production Deployment Guide

This comprehensive guide covers all steps required to deploy the OriginLytics.com website to production, from initial setup to post-deployment monitoring.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Option 1: Vercel (Recommended)](#option-1-vercel-recommended)
4. [Deployment Option 2: Netlify](#option-2-netlify-alternative)
5. [Deployment Option 3: Traditional Hosting (cPanel/FTP)](#option-3-traditional-hosting-cpanel-ftp)
6. [DNS Configuration](#dns-configuration)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Google Search Console Setup](#google-search-console-setup)
9. [Bing Webmaster Tools Setup](#bing-webmaster-tools-setup)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Monitoring Setup](#monitoring-setup)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Domain name purchased (e.g., originlytics.com)
- [ ] All required image assets created (see `images/ASSET_REQUIREMENTS.md`)
- [ ] Google Analytics account and Measurement ID
- [ ] Sentry account and DSN (for error tracking)
- [ ] Git repository (GitHub, GitLab, or Bitbucket)
- [ ] Content reviewed and approved
- [ ] Performance audit completed (Lighthouse score ≥ 90)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All files validated (HTML, CSS, JavaScript)
- [ ] No console errors or warnings
- [ ] All links tested (no 404s)
- [ ] Forms tested and working
- [ ] Mobile responsive design verified
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)

### Content
- [ ] All text proofread
- [ ] All images optimized and compressed
- [ ] All meta tags updated with correct content
- [ ] Structured data validated (https://search.google.com/test/rich-results)
- [ ] sitemap.xml updated
- [ ] robots.txt configured correctly

### Configuration
- [ ] Update Google Analytics ID in `analytics.js`
- [ ] Update Sentry DSN in `monitoring.js`
- [ ] Update domain references in HTML meta tags
- [ ] Update canonical URLs
- [ ] Update Open Graph and Twitter Card images

### Security
- [ ] Security headers configured
- [ ] SSL/HTTPS enforced
- [ ] No sensitive data exposed (API keys, credentials)
- [ ] .env.example created (no actual secrets)

---

## Option 1: Vercel (Recommended)

Vercel provides the best developer experience with automatic deployments, edge caching, and excellent performance.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
# or
yarn global add vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

### Step 3: Configure Deployment

Copy the Vercel configuration:

```bash
cp deploy/vercel.json .
```

Edit `vercel.json` if needed (usually no changes required).

### Step 4: Deploy to Production

```bash
cd /path/to/originlytics-website
vercel --prod
```

Or use the automated deployment script:

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
# Select option 1 (Vercel)
```

### Step 5: Configure Custom Domain

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Settings" → "Domains"
4. Add your custom domain: `originlytics.com`
5. Follow DNS configuration instructions

### Step 6: Set Environment Variables

1. Go to project Settings → Environment Variables
2. Add:
   - `GOOGLE_ANALYTICS_ID`: Your GA4 Measurement ID
   - `SENTRY_DSN`: Your Sentry DSN
   - `NODE_ENV`: `production`

### Step 7: Enable Auto-Deployments (Optional)

1. Connect your GitHub repository
2. Enable "Production Branch" deployments
3. Set branch to `main` or `master`
4. Every push to main will auto-deploy

**Vercel Deployment Time**: 1-3 minutes

**Advantages:**
- Automatic HTTPS with SSL certificate
- Global edge CDN (70+ locations)
- Automatic compression (gzip, Brotli)
- Zero-downtime deployments
- Instant rollbacks
- Built-in analytics
- Free tier available

---

## Option 2: Netlify (Alternative)

Netlify is another excellent hosting platform with similar features to Vercel.

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
# or
yarn global add netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Configure Deployment

Copy the Netlify configuration:

```bash
cp deploy/netlify.toml .
```

### Step 4: Initialize Netlify Project

```bash
cd /path/to/originlytics-website
netlify init
```

Follow the prompts:
- Create new site or link existing
- Choose team
- Set site name

### Step 5: Deploy to Production

```bash
netlify deploy --prod --dir .
```

Or use the automated deployment script:

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
# Select option 2 (Netlify)
```

### Step 6: Configure Custom Domain

1. Go to https://app.netlify.com/
2. Select your site
3. Click "Domain settings"
4. Add custom domain: `originlytics.com`
5. Follow DNS configuration instructions

### Step 7: Set Environment Variables

1. Go to Site settings → Environment
2. Add environment variables:
   - `GOOGLE_ANALYTICS_ID`
   - `SENTRY_DSN`
   - `NODE_ENV`: `production`

### Step 8: Enable Auto-Deployments (Optional)

1. Connect your Git repository
2. Set production branch
3. Enable auto-deploy on push

**Netlify Deployment Time**: 1-3 minutes

**Advantages:**
- Automatic HTTPS with SSL certificate
- Global CDN
- Automatic compression
- Form handling (built-in)
- Split testing (A/B testing)
- Free tier available

---

## Option 3: Traditional Hosting (cPanel/FTP)

For traditional web hosting (GoDaddy, Bluehost, HostGator, etc.).

### Step 1: Prepare Files

Run the build script:

```bash
cd /path/to/originlytics-website
chmod +x deploy/deploy.sh
./deploy/deploy.sh
# Select option 4 (Local build only)
```

Files will be in `build/` directory.

### Step 2: Upload via FTP

**Option A: Using FTP Client (FileZilla)**

1. Download FileZilla: https://filezilla-project.org/
2. Connect to your hosting:
   - Host: `ftp.yourhosting.com`
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (or 22 for SFTP)
3. Navigate to `public_html` or `www` directory
4. Upload all files from `build/` directory
5. Upload `.htaccess` from `deploy/.htaccess`

**Option B: Using Command Line (lftp)**

```bash
# Install lftp
# Ubuntu/Debian: sudo apt-get install lftp
# macOS: brew install lftp

# Upload files
lftp -u username,password ftp.yourhosting.com <<EOF
cd public_html
mirror -R --delete build/ .
put deploy/.htaccess
bye
EOF
```

**Option C: Using cPanel File Manager**

1. Login to cPanel
2. Open File Manager
3. Navigate to `public_html`
4. Click "Upload"
5. Upload all files from `build/` directory
6. Upload `.htaccess` file

### Step 3: Configure Apache

Upload the `.htaccess` file:

```bash
cp deploy/.htaccess build/.htaccess
# Upload via FTP
```

### Step 4: Test Deployment

Visit your domain: `https://originlytics.com`

**Traditional Hosting Deployment Time**: 5-15 minutes (depends on upload speed)

**Advantages:**
- Full control over server
- Supports PHP, databases (for future features)
- Often includes email hosting

**Disadvantages:**
- Manual SSL certificate setup
- No automatic CDN
- Slower deployment process
- Manual compression configuration

---

## DNS Configuration

### Option A: Vercel/Netlify (CNAME)

1. Login to your domain registrar (GoDaddy, Namecheap, etc.)
2. Navigate to DNS settings
3. Add CNAME record:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com (or your-site.netlify.app)
   TTL: 3600
   ```
4. Add A record for root domain:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel) or 75.2.60.5 (Netlify)
   TTL: 3600
   ```

### Option B: Traditional Hosting (A Record)

1. Login to your domain registrar
2. Navigate to DNS settings
3. Add A record:
   ```
   Type: A
   Name: @
   Value: Your server IP address
   TTL: 3600
   ```
4. Add CNAME for www:
   ```
   Type: CNAME
   Name: www
   Value: originlytics.com
   TTL: 3600
   ```

### DNS Propagation

- DNS changes can take 1-48 hours to propagate globally
- Check propagation: https://www.whatsmydns.net/
- Test locally: `nslookup originlytics.com`

---

## SSL Certificate Setup

### Vercel/Netlify (Automatic)

SSL certificates are automatically provisioned and renewed. No action required.

### Traditional Hosting

**Option A: Let's Encrypt (Free)**

Most modern hosting providers offer free Let's Encrypt SSL certificates:

1. Login to cPanel
2. Navigate to "SSL/TLS Status" or "Let's Encrypt"
3. Click "Issue" next to your domain
4. Wait 1-5 minutes for certificate to be issued

**Option B: Manual Let's Encrypt (SSH Access)**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-apache

# Obtain certificate
sudo certbot --apache -d originlytics.com -d www.originlytics.com

# Auto-renewal (cron job)
sudo certbot renew --dry-run
```

**Option C: Cloudflare SSL (Free)**

1. Sign up at https://www.cloudflare.com/
2. Add your domain
3. Update nameservers at your registrar
4. Enable "Flexible" or "Full" SSL in Cloudflare

### Force HTTPS Redirect

Ensure `.htaccess` or `nginx.conf` includes HTTPS redirect (already configured in deploy files).

### Test SSL

- https://www.ssllabs.com/ssltest/
- Target: A+ rating
- Verify HTTPS works: https://originlytics.com

---

## Google Search Console Setup

### Step 1: Verify Ownership

1. Go to https://search.google.com/search-console
2. Click "Add Property"
3. Enter: `https://originlytics.com`
4. Choose verification method:

**Option A: HTML File Upload**
- Download verification file
- Upload to root directory
- Click "Verify"

**Option B: HTML Meta Tag**
- Copy meta tag
- Add to `<head>` section of index.html
- Deploy updated file
- Click "Verify"

**Option C: DNS Record (Recommended)**
- Add TXT record to DNS:
  ```
  Type: TXT
  Name: @
  Value: google-site-verification=xxxxxxxxxxxxx
  ```
- Wait for DNS propagation
- Click "Verify"

### Step 2: Submit Sitemap

1. In Search Console, go to "Sitemaps"
2. Enter: `https://originlytics.com/sitemap.xml`
3. Click "Submit"
4. Verify sitemap is successfully parsed

### Step 3: Enable Features

- Enable Email notifications for critical issues
- Enable URL Inspection
- Monitor Core Web Vitals (after 28 days of data)

### Step 4: Request Indexing (Optional)

1. Use URL Inspection tool
2. Enter: `https://originlytics.com`
3. Click "Request Indexing"
4. Repeat for important pages

**Indexing Timeline**: 1-7 days for first indexing

---

## Bing Webmaster Tools Setup

### Step 1: Sign Up

1. Go to https://www.bing.com/webmasters
2. Sign in with Microsoft account
3. Add site: `https://originlytics.com`

### Step 2: Verify Ownership

**Option A: Import from Google Search Console**
- Click "Import from Google Search Console"
- Authorize connection
- Sites are automatically verified

**Option B: HTML Meta Tag**
- Copy meta tag
- Add to `<head>` section
- Click "Verify"

**Option C: XML File Upload**
- Download XML file
- Upload to root directory
- Click "Verify"

### Step 3: Submit Sitemap

1. Go to "Sitemaps"
2. Enter: `https://originlytics.com/sitemap.xml`
3. Click "Submit"

### Step 4: Configure Settings

- Enable email notifications
- Set geographic targeting (if applicable)
- Enable Crawl Control

---

## Post-Deployment Verification

### Functional Testing

- [ ] Homepage loads correctly
- [ ] All navigation links work
- [ ] All section anchors work (#features, #pricing, etc.)
- [ ] All forms work (demo, contact)
- [ ] Mobile menu works
- [ ] FAQ accordion works
- [ ] All images load
- [ ] No console errors
- [ ] No 404 errors

### Performance Testing

- [ ] Run Lighthouse audit (target: 90+)
  ```bash
  lighthouse https://originlytics.com --view
  ```
- [ ] Test PageSpeed Insights: https://pagespeed.web.dev/
- [ ] Test GTmetrix: https://gtmetrix.com/
- [ ] Test WebPageTest: https://www.webpagetest.org/

### SEO Testing

- [ ] Verify structured data: https://search.google.com/test/rich-results
- [ ] Check meta tags: View page source
- [ ] Test mobile-friendly: https://search.google.com/test/mobile-friendly
- [ ] Test sitemap: https://www.xml-sitemaps.com/validate-xml-sitemap.html
- [ ] Verify robots.txt: https://originlytics.com/robots.txt

### Social Media Testing

- [ ] Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- [ ] Twitter Card Validator: https://cards-dev.twitter.com/validator
- [ ] LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- [ ] Verify OG image displays correctly

### Security Testing

- [ ] SSL test: https://www.ssllabs.com/ssltest/
- [ ] Security headers: https://securityheaders.com/
- [ ] Mixed content check: No HTTP resources on HTTPS page
- [ ] HTTPS redirect working

### Cross-Browser Testing

- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)
- [ ] Test on real devices if possible

### Analytics Verification

- [ ] Google Analytics tracking working
  - Visit site in incognito mode
  - Check Real-Time reports in GA
- [ ] Event tracking working (test CTA clicks)
- [ ] Error tracking working (check Sentry)

---

## Monitoring Setup

### 1. Uptime Monitoring

**UptimeRobot (Recommended - Free)**

1. Sign up: https://uptimerobot.com/
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: https://originlytics.com
   - Interval: 5 minutes
3. Add alert contacts (email, Slack)
4. Create status page: `status.originlytics.com`

**Configuration in `uptime-monitor.js` has full details**

### 2. Error Tracking (Sentry)

1. Sign up: https://sentry.io/
2. Create new project (JavaScript)
3. Copy DSN
4. Update `monitoring.js` with your DSN
5. Trigger test error to verify

### 3. Analytics (Google Analytics 4)

1. Create GA4 property: https://analytics.google.com/
2. Copy Measurement ID (G-XXXXXXXXXX)
3. Update `analytics.js` with your ID
4. Verify tracking in Real-Time reports

### 4. Performance Monitoring

Set up continuous monitoring:

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run regular audits
lhci autorun --collect.url=https://originlytics.com
```

Or use third-party services:
- SpeedCurve
- Calibre
- DebugBear

### 5. Status Page

Create a status page to communicate uptime:

1. Use UptimeRobot status page (free)
2. Or Better Uptime status page
3. Add link to footer: `https://status.originlytics.com`

---

## Troubleshooting

### Issue: Site Not Loading

**Possible Causes:**
- DNS not propagated
- SSL certificate issue
- Server configuration error

**Solutions:**
- Check DNS propagation: https://www.whatsmydns.net/
- Verify SSL certificate: `openssl s_client -connect originlytics.com:443`
- Check server logs
- Try accessing via IP address

### Issue: Images Not Displaying

**Possible Causes:**
- Incorrect file paths
- Files not uploaded
- CORS issues

**Solutions:**
- Verify image paths in HTML
- Check images uploaded to correct directory
- Check browser console for errors
- Verify image URLs are absolute

### Issue: Mixed Content Warnings

**Cause:** Loading HTTP resources on HTTPS page

**Solution:**
- Change all URLs to HTTPS or relative paths
- Check: Images, scripts, stylesheets, iframes

### Issue: Slow Page Load

**Possible Causes:**
- Images not optimized
- Compression not enabled
- CDN not configured

**Solutions:**
- Compress images (TinyPNG)
- Enable gzip/Brotli compression
- Set up CDN (Cloudflare)
- Run Lighthouse audit for specific recommendations

### Issue: Forms Not Submitting

**Possible Causes:**
- JavaScript errors
- Missing form handler
- CORS issues

**Solutions:**
- Check browser console for errors
- Verify JavaScript loaded correctly
- Update form action URL
- Implement backend form handler (or use Netlify Forms)

### Issue: Analytics Not Tracking

**Possible Causes:**
- Incorrect Measurement ID
- Ad blocker blocking scripts
- Script not loaded

**Solutions:**
- Verify GA4 Measurement ID
- Test in incognito mode
- Check browser console for errors
- Verify gtag.js script loaded

---

## Maintenance Schedule

### Daily
- [ ] Check uptime monitoring (automated alerts)
- [ ] Monitor error tracking (Sentry)

### Weekly
- [ ] Review Google Analytics
- [ ] Check Search Console for issues
- [ ] Review performance metrics (Lighthouse)

### Monthly
- [ ] Full performance audit
- [ ] Update content (blog, features)
- [ ] Review and respond to user feedback
- [ ] Check for broken links
- [ ] Update dependencies

### Quarterly
- [ ] Security audit
- [ ] SEO audit
- [ ] Competitor analysis
- [ ] A/B testing results review

---

## Rollback Procedure

If deployment causes issues:

### Vercel/Netlify
1. Go to deployments page
2. Find previous working deployment
3. Click "Promote to Production"
4. Instant rollback (< 1 minute)

### Traditional Hosting
1. Restore from backup:
   ```bash
   tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
   ```
2. Upload restored files via FTP
3. Verify site working

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] All assets created and optimized
- [ ] Content reviewed and approved
- [ ] Code tested locally
- [ ] Performance audit passed (Lighthouse ≥ 90)

### Deployment
- [ ] Choose hosting platform (Vercel recommended)
- [ ] Deploy using automated script or CLI
- [ ] Configure custom domain
- [ ] Set environment variables
- [ ] Verify SSL certificate

### Post-Deployment
- [ ] Functional testing completed
- [ ] Performance testing passed
- [ ] SEO verification done
- [ ] Social media previews working
- [ ] Analytics tracking verified
- [ ] Monitoring configured

### Submission
- [ ] Google Search Console verified and sitemap submitted
- [ ] Bing Webmaster Tools configured
- [ ] Uptime monitoring enabled
- [ ] Status page created

---

## Recommended Deployment: Vercel

**Why Vercel?**
- Fastest deployment (1 command)
- Best performance (global edge CDN)
- Automatic SSL and compression
- Zero configuration required
- Free tier sufficient for most sites
- Excellent developer experience

**Command:**
```bash
cd originlytics-website
vercel --prod
```

**Total Deployment Time**: 5-10 minutes (including domain setup)

---

## Support & Resources

### Documentation
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com/
- MDN Web Docs: https://developer.mozilla.org/

### Performance Tools
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- PageSpeed Insights: https://pagespeed.web.dev/
- GTmetrix: https://gtmetrix.com/

### SEO Tools
- Google Search Console: https://search.google.com/search-console
- Bing Webmaster Tools: https://www.bing.com/webmasters
- Structured Data Testing: https://search.google.com/test/rich-results

### Monitoring Tools
- UptimeRobot: https://uptimerobot.com/
- Sentry: https://sentry.io/
- Google Analytics: https://analytics.google.com/

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: 2025-01-15
**Maintained by**: DevOps Team

**Questions or Issues?**
Contact: devops@originlytics.com

---

**Good luck with your deployment! 🚀**
