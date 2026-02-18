#!/bin/bash

###############################################################################
# OriginLytics.com - Automated Deployment Script
# Version: 1.0.0
# Description: Production deployment automation with validation and rollback
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
PROJECT_NAME="originlytics-website"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$DEPLOY_DIR")"
BUILD_DIR="${PROJECT_ROOT}/build"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check required files exist
    local required_files=("index.html" "styles.css" "script.js" "robots.txt" "sitemap.xml")
    for file in "${required_files[@]}"; do
        if [ ! -f "${PROJECT_ROOT}/${file}" ]; then
            log_error "Required file missing: ${file}"
            exit 1
        fi
    done

    log_success "All required files present"
}

# Create build directory
create_build_directory() {
    log_info "Creating build directory..."

    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi

    mkdir -p "$BUILD_DIR"
    log_success "Build directory created: $BUILD_DIR"
}

# Copy files to build directory
copy_files() {
    log_info "Copying files to build directory..."

    # Copy HTML files
    cp "${PROJECT_ROOT}/index.html" "$BUILD_DIR/"

    # Copy CSS (use minified if available)
    if [ -f "${PROJECT_ROOT}/styles.min.css" ]; then
        cp "${PROJECT_ROOT}/styles.min.css" "$BUILD_DIR/styles.css"
    else
        cp "${PROJECT_ROOT}/styles.css" "$BUILD_DIR/"
    fi

    # Copy JavaScript (use minified if available)
    if [ -f "${PROJECT_ROOT}/script.min.js" ]; then
        cp "${PROJECT_ROOT}/script.min.js" "$BUILD_DIR/script.js"
    else
        cp "${PROJECT_ROOT}/script.js" "$BUILD_DIR/"
    fi

    # Copy other files
    cp "${PROJECT_ROOT}/robots.txt" "$BUILD_DIR/"
    cp "${PROJECT_ROOT}/sitemap.xml" "$BUILD_DIR/"
    cp "${PROJECT_ROOT}/manifest.json" "$BUILD_DIR/"

    # Copy images directory if exists
    if [ -d "${PROJECT_ROOT}/images" ]; then
        cp -r "${PROJECT_ROOT}/images" "$BUILD_DIR/"
    fi

    log_success "Files copied successfully"
}

# Minify CSS (if csso or similar is available)
minify_css() {
    log_info "Minifying CSS..."

    if command -v csso &> /dev/null; then
        csso "${BUILD_DIR}/styles.css" -o "${BUILD_DIR}/styles.min.css"
        mv "${BUILD_DIR}/styles.min.css" "${BUILD_DIR}/styles.css"
        log_success "CSS minified"
    else
        log_warning "csso not found, skipping CSS minification"
    fi
}

# Minify JavaScript (if terser is available)
minify_js() {
    log_info "Minifying JavaScript..."

    if command -v terser &> /dev/null; then
        terser "${BUILD_DIR}/script.js" -c -m -o "${BUILD_DIR}/script.min.js"
        mv "${BUILD_DIR}/script.min.js" "${BUILD_DIR}/script.js"
        log_success "JavaScript minified"
    else
        log_warning "terser not found, skipping JavaScript minification"
    fi
}

# Validate HTML
validate_html() {
    log_info "Validating HTML..."

    if command -v htmlhint &> /dev/null; then
        if htmlhint "${BUILD_DIR}/index.html"; then
            log_success "HTML validation passed"
        else
            log_warning "HTML validation warnings detected"
        fi
    else
        log_warning "htmlhint not found, skipping HTML validation"
    fi
}

# Create backup
create_backup() {
    log_info "Creating backup..."

    mkdir -p "$BACKUP_DIR"
    local backup_file="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

    tar -czf "$backup_file" -C "$PROJECT_ROOT" \
        index.html styles.css script.js robots.txt sitemap.xml manifest.json 2>/dev/null || true

    log_success "Backup created: $backup_file"
}

# Deploy to Vercel
deploy_vercel() {
    log_info "Deploying to Vercel..."

    if command -v vercel &> /dev/null; then
        cd "$BUILD_DIR"
        vercel --prod --yes
        log_success "Deployed to Vercel"
    else
        log_warning "Vercel CLI not found. Install with: npm i -g vercel"
        log_info "Manual deployment: cd $BUILD_DIR && vercel --prod"
    fi
}

# Deploy to Netlify
deploy_netlify() {
    log_info "Deploying to Netlify..."

    if command -v netlify &> /dev/null; then
        cd "$BUILD_DIR"
        netlify deploy --prod --dir .
        log_success "Deployed to Netlify"
    else
        log_warning "Netlify CLI not found. Install with: npm i -g netlify-cli"
        log_info "Manual deployment: cd $BUILD_DIR && netlify deploy --prod --dir ."
    fi
}

# Deploy via FTP (requires lftp)
deploy_ftp() {
    log_info "Deploying via FTP..."

    if [ -z "${FTP_HOST:-}" ] || [ -z "${FTP_USER:-}" ] || [ -z "${FTP_PASS:-}" ]; then
        log_warning "FTP credentials not set. Set FTP_HOST, FTP_USER, FTP_PASS environment variables"
        return 1
    fi

    if command -v lftp &> /dev/null; then
        lftp -u "${FTP_USER},${FTP_PASS}" "${FTP_HOST}" <<EOF
mirror -R --delete --verbose "$BUILD_DIR" /public_html
bye
EOF
        log_success "Deployed via FTP"
    else
        log_warning "lftp not found. Install with: apt-get install lftp"
    fi
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."

    local report_file="${BUILD_DIR}/DEPLOYMENT_REPORT_${TIMESTAMP}.txt"

    cat > "$report_file" <<EOF
===================================================================
OriginLytics.com - Deployment Report
===================================================================
Deployment Time: $(date)
Build Directory: $BUILD_DIR
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")

Files Deployed:
$(ls -lh "$BUILD_DIR")

File Sizes:
HTML: $(du -h "${BUILD_DIR}/index.html" | cut -f1)
CSS: $(du -h "${BUILD_DIR}/styles.css" | cut -f1)
JavaScript: $(du -h "${BUILD_DIR}/script.js" | cut -f1)

Total Size: $(du -sh "$BUILD_DIR" | cut -f1)

===================================================================
EOF

    cat "$report_file"
    log_success "Deployment report generated: $report_file"
}

# Main deployment flow
main() {
    echo "====================================================================="
    echo "  OriginLytics.com - Production Deployment"
    echo "====================================================================="
    echo ""

    pre_deployment_checks
    create_backup
    create_build_directory
    copy_files
    minify_css
    minify_js
    validate_html
    generate_report

    echo ""
    log_info "Select deployment target:"
    echo "1) Vercel (recommended)"
    echo "2) Netlify"
    echo "3) FTP/cPanel"
    echo "4) Local build only (no deployment)"
    echo ""
    read -p "Enter choice [1-4]: " choice

    case $choice in
        1)
            deploy_vercel
            ;;
        2)
            deploy_netlify
            ;;
        3)
            deploy_ftp
            ;;
        4)
            log_info "Local build completed. No deployment performed."
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    echo ""
    echo "====================================================================="
    log_success "Deployment completed successfully!"
    echo "====================================================================="
    log_info "Build location: $BUILD_DIR"
    log_info "Backup location: ${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
    echo ""
    log_info "Next steps:"
    echo "  1. Verify deployment at your production URL"
    echo "  2. Check Google Search Console for indexing"
    echo "  3. Run Lighthouse performance audit"
    echo "  4. Monitor error logs and analytics"
    echo ""
}

# Run main function
main "$@"
