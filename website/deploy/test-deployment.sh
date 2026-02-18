#!/bin/bash

###############################################################################
# OriginLytics.com - Pre-Deployment Testing Script
# Version: 1.0.0
# Description: Comprehensive testing before production deployment
###############################################################################

set -e  # Exit on error

# Configuration
SITE_URL="${SITE_URL:-http://localhost:8080}"
PRODUCTION_URL="https://originlytics.com"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNING=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((TESTS_WARNING++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Test 1: Check required files exist
test_required_files() {
    log_info "Testing required files..."

    local required_files=(
        "index.html"
        "styles.css"
        "script.js"
        "robots.txt"
        "sitemap.xml"
        "manifest.json"
    )

    for file in "${required_files[@]}"; do
        if [ -f "${PROJECT_ROOT}/${file}" ]; then
            log_success "File exists: ${file}"
        else
            log_error "Missing required file: ${file}"
        fi
    done
}

# Test 2: Validate HTML
test_html_validation() {
    log_info "Validating HTML..."

    if command_exists htmlhint; then
        if htmlhint "${PROJECT_ROOT}/index.html"; then
            log_success "HTML validation passed"
        else
            log_warning "HTML validation warnings (non-critical)"
        fi
    else
        log_warning "htmlhint not installed - skipping HTML validation"
        log_info "Install with: npm install -g htmlhint"
    fi
}

# Test 3: Validate CSS
test_css_validation() {
    log_info "Validating CSS..."

    if command_exists stylelint; then
        if stylelint "${PROJECT_ROOT}/styles.css"; then
            log_success "CSS validation passed"
        else
            log_warning "CSS validation warnings (non-critical)"
        fi
    else
        log_warning "stylelint not installed - skipping CSS validation"
        log_info "Install with: npm install -g stylelint"
    fi
}

# Test 4: Validate JavaScript
test_javascript_validation() {
    log_info "Validating JavaScript..."

    if command_exists eslint; then
        if eslint "${PROJECT_ROOT}/script.js" 2>/dev/null; then
            log_success "JavaScript validation passed"
        else
            log_warning "JavaScript validation warnings (non-critical)"
        fi
    else
        log_warning "eslint not installed - skipping JavaScript validation"
        log_info "Install with: npm install -g eslint"
    fi
}

# Test 5: Check for broken links (local)
test_broken_links_local() {
    log_info "Checking for broken internal links..."

    local html_file="${PROJECT_ROOT}/index.html"
    local links=$(grep -o 'href="#[^"]*"' "$html_file" | cut -d'"' -f2 | sort | uniq)

    for link in $links; do
        if [ "$link" = "#" ]; then
            continue
        fi

        local anchor="${link#\#}"
        if grep -q "id=\"$anchor\"" "$html_file"; then
            log_success "Internal link found: $link"
        else
            log_error "Broken internal link: $link"
        fi
    done
}

# Test 6: Test sitemap.xml validity
test_sitemap_validity() {
    log_info "Validating sitemap.xml..."

    local sitemap="${PROJECT_ROOT}/sitemap.xml"

    if [ -f "$sitemap" ]; then
        if xmllint --noout "$sitemap" 2>/dev/null; then
            log_success "sitemap.xml is valid XML"
        else
            log_warning "sitemap.xml validation failed (xmllint not installed or XML invalid)"
        fi

        # Check if URLs are present
        if grep -q "<loc>" "$sitemap"; then
            log_success "sitemap.xml contains URLs"
        else
            log_error "sitemap.xml does not contain any URLs"
        fi
    else
        log_error "sitemap.xml not found"
    fi
}

# Test 7: Test robots.txt
test_robots_txt() {
    log_info "Validating robots.txt..."

    local robots="${PROJECT_ROOT}/robots.txt"

    if [ -f "$robots" ]; then
        log_success "robots.txt exists"

        # Check if it contains required directives
        if grep -q "User-agent:" "$robots"; then
            log_success "robots.txt contains User-agent directive"
        else
            log_warning "robots.txt missing User-agent directive"
        fi

        if grep -q "Sitemap:" "$robots"; then
            log_success "robots.txt contains Sitemap directive"
        else
            log_warning "robots.txt missing Sitemap directive"
        fi
    else
        log_error "robots.txt not found"
    fi
}

# Test 8: Check meta tags
test_meta_tags() {
    log_info "Checking meta tags..."

    local html_file="${PROJECT_ROOT}/index.html"

    # Check title
    if grep -q "<title>.*</title>" "$html_file"; then
        local title=$(grep -o "<title>.*</title>" "$html_file" | sed 's/<[^>]*>//g')
        if [ ${#title} -ge 30 ] && [ ${#title} -le 60 ]; then
            log_success "Title tag length optimal (${#title} chars)"
        else
            log_warning "Title tag length not optimal (${#title} chars, recommended: 30-60)"
        fi
    else
        log_error "Missing title tag"
    fi

    # Check meta description
    if grep -q '<meta name="description"' "$html_file"; then
        local desc_line=$(grep '<meta name="description"' "$html_file")
        local desc_length=$(echo "$desc_line" | grep -o 'content="[^"]*"' | wc -c)
        if [ $desc_length -ge 120 ] && [ $desc_length -le 160 ]; then
            log_success "Meta description length optimal"
        else
            log_warning "Meta description length not optimal (recommended: 120-160 chars)"
        fi
    else
        log_error "Missing meta description"
    fi

    # Check Open Graph tags
    if grep -q '<meta property="og:title"' "$html_file"; then
        log_success "Open Graph title tag present"
    else
        log_warning "Missing Open Graph title tag"
    fi

    if grep -q '<meta property="og:image"' "$html_file"; then
        log_success "Open Graph image tag present"
    else
        log_warning "Missing Open Graph image tag"
    fi

    # Check Twitter Card tags
    if grep -q '<meta property="twitter:card"' "$html_file"; then
        log_success "Twitter Card tag present"
    else
        log_warning "Missing Twitter Card tag"
    fi

    # Check canonical URL
    if grep -q '<link rel="canonical"' "$html_file"; then
        log_success "Canonical URL tag present"
    else
        log_warning "Missing canonical URL tag"
    fi
}

# Test 9: Check structured data
test_structured_data() {
    log_info "Checking structured data..."

    local html_file="${PROJECT_ROOT}/index.html"

    # Check for JSON-LD
    if grep -q '<script type="application/ld+json">' "$html_file"; then
        log_success "Structured data (JSON-LD) present"

        # Count JSON-LD blocks
        local count=$(grep -c '<script type="application/ld+json">' "$html_file")
        log_info "Found $count JSON-LD structured data blocks"
    else
        log_warning "No structured data (JSON-LD) found"
    fi
}

# Test 10: Check for console errors (requires running server)
test_console_errors() {
    log_info "Checking for console errors (requires running server)..."

    if ! command_exists node; then
        log_warning "Node.js not installed - skipping console error check"
        return
    fi

    # Start local server
    log_info "Starting local server on port 8080..."
    cd "$PROJECT_ROOT"
    python3 -m http.server 8080 > /dev/null 2>&1 &
    local server_pid=$!
    sleep 2

    if command_exists npx && command_exists playwright; then
        log_info "Checking for console errors with Playwright..."
        # This would require a separate script
        log_warning "Automated console error check not implemented"
    else
        log_warning "Playwright not available - manual console check required"
        log_info "Open http://localhost:8080 and check browser console"
    fi

    # Kill server
    kill $server_pid 2>/dev/null || true
}

# Test 11: Test image optimization
test_image_optimization() {
    log_info "Checking image optimization..."

    if [ -d "${PROJECT_ROOT}/images" ]; then
        local large_images=$(find "${PROJECT_ROOT}/images" -type f \( -name "*.jpg" -o -name "*.png" \) -size +200k)

        if [ -z "$large_images" ]; then
            log_success "All images are optimally sized (< 200KB)"
        else
            log_warning "Some images are larger than 200KB:"
            echo "$large_images"
            log_warning "Consider compressing with TinyPNG or Squoosh"
        fi
    else
        log_info "No images directory found"
    fi
}

# Test 12: Check file sizes
test_file_sizes() {
    log_info "Checking file sizes..."

    # CSS
    if [ -f "${PROJECT_ROOT}/styles.css" ]; then
        local css_size=$(wc -c < "${PROJECT_ROOT}/styles.css")
        local css_kb=$((css_size / 1024))
        if [ $css_kb -lt 100 ]; then
            log_success "CSS file size: ${css_kb}KB (optimal)"
        else
            log_warning "CSS file size: ${css_kb}KB (consider minification)"
        fi
    fi

    # JavaScript
    if [ -f "${PROJECT_ROOT}/script.js" ]; then
        local js_size=$(wc -c < "${PROJECT_ROOT}/script.js")
        local js_kb=$((js_size / 1024))
        if [ $js_kb -lt 100 ]; then
            log_success "JavaScript file size: ${js_kb}KB (optimal)"
        else
            log_warning "JavaScript file size: ${js_kb}KB (consider minification)"
        fi
    fi

    # HTML
    if [ -f "${PROJECT_ROOT}/index.html" ]; then
        local html_size=$(wc -c < "${PROJECT_ROOT}/index.html")
        local html_kb=$((html_size / 1024))
        if [ $html_kb -lt 100 ]; then
            log_success "HTML file size: ${html_kb}KB (optimal)"
        else
            log_warning "HTML file size: ${html_kb}KB (larger than recommended)"
        fi
    fi
}

# Test 13: Lighthouse audit (if available)
test_lighthouse() {
    log_info "Running Lighthouse audit..."

    if ! command_exists lighthouse; then
        log_warning "Lighthouse not installed"
        log_info "Install with: npm install -g lighthouse"
        return
    fi

    # Start local server
    cd "$PROJECT_ROOT"
    python3 -m http.server 8080 > /dev/null 2>&1 &
    local server_pid=$!
    sleep 2

    log_info "Running Lighthouse on http://localhost:8080..."
    lighthouse http://localhost:8080 \
        --quiet \
        --chrome-flags="--headless" \
        --output=json \
        --output-path=/tmp/lighthouse-report.json 2>/dev/null || true

    if [ -f "/tmp/lighthouse-report.json" ]; then
        local perf_score=$(jq -r '.categories.performance.score' /tmp/lighthouse-report.json 2>/dev/null || echo "0")
        perf_score=$(echo "$perf_score * 100" | bc 2>/dev/null || echo "0")

        if [ "${perf_score%.*}" -ge 90 ]; then
            log_success "Lighthouse Performance Score: ${perf_score%.*}/100"
        elif [ "${perf_score%.*}" -ge 70 ]; then
            log_warning "Lighthouse Performance Score: ${perf_score%.*}/100 (target: 90+)"
        else
            log_error "Lighthouse Performance Score: ${perf_score%.*}/100 (target: 90+)"
        fi

        rm /tmp/lighthouse-report.json
    else
        log_warning "Lighthouse report not generated"
    fi

    # Kill server
    kill $server_pid 2>/dev/null || true
}

# Test 14: Security headers (requires deployed site)
test_security_headers() {
    log_info "Checking security headers (requires deployed site)..."

    if [ -z "$PRODUCTION_URL" ] || [ "$PRODUCTION_URL" = "https://originlytics.com" ]; then
        log_warning "Production URL not set - skipping security header check"
        log_info "Set PRODUCTION_URL environment variable to test deployed site"
        return
    fi

    if ! command_exists curl; then
        log_warning "curl not installed - skipping security header check"
        return
    fi

    local headers=$(curl -s -I "$PRODUCTION_URL" 2>/dev/null)

    # Check security headers
    if echo "$headers" | grep -q "X-Frame-Options"; then
        log_success "X-Frame-Options header present"
    else
        log_warning "X-Frame-Options header missing"
    fi

    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        log_success "X-Content-Type-Options header present"
    else
        log_warning "X-Content-Type-Options header missing"
    fi

    if echo "$headers" | grep -q "Content-Security-Policy"; then
        log_success "Content-Security-Policy header present"
    else
        log_warning "Content-Security-Policy header missing"
    fi

    if echo "$headers" | grep -q "Strict-Transport-Security"; then
        log_success "Strict-Transport-Security header present"
    else
        log_warning "Strict-Transport-Security header missing (HSTS)"
    fi
}

# Test 15: Mobile-friendly test
test_mobile_friendly() {
    log_info "Checking mobile-friendliness..."

    local html_file="${PROJECT_ROOT}/index.html"

    # Check viewport meta tag
    if grep -q '<meta name="viewport"' "$html_file"; then
        log_success "Viewport meta tag present"
    else
        log_error "Missing viewport meta tag"
    fi

    # Check for responsive meta tags
    if grep -q 'content="width=device-width' "$html_file"; then
        log_success "Responsive viewport configuration"
    else
        log_warning "Viewport may not be fully responsive"
    fi
}

# Main test runner
main() {
    echo "====================================================================="
    echo "  OriginLytics.com - Pre-Deployment Testing"
    echo "====================================================================="
    echo ""

    # Run all tests
    test_required_files
    echo ""
    test_html_validation
    echo ""
    test_css_validation
    echo ""
    test_javascript_validation
    echo ""
    test_broken_links_local
    echo ""
    test_sitemap_validity
    echo ""
    test_robots_txt
    echo ""
    test_meta_tags
    echo ""
    test_structured_data
    echo ""
    test_image_optimization
    echo ""
    test_file_sizes
    echo ""
    test_mobile_friendly
    echo ""
    test_lighthouse
    echo ""

    # Summary
    echo "====================================================================="
    echo "  Test Summary"
    echo "====================================================================="
    echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED"
    echo -e "${YELLOW}Warnings:${NC} $TESTS_WARNING"
    echo -e "${RED}Failed:${NC}  $TESTS_FAILED"
    echo "====================================================================="

    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ All critical tests passed! Ready for deployment.${NC}"
        echo ""
        exit 0
    else
        echo ""
        echo -e "${RED}✗ Some tests failed. Please fix issues before deploying.${NC}"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
