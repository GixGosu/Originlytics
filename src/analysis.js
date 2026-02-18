const axios = require('axios');
// Lazy-load JSDOM to avoid module loading hang in WSL2
let JSDOM = null;
function getJSDOM() {
    if (!JSDOM) {
        JSDOM = require('jsdom').JSDOM;
    }
    return JSDOM;
}
const OpenAI = require('openai');
const { chromium } = require('playwright');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const pRetry = require('p-retry');
const Bottleneck = require('bottleneck');
const { calculateFullEnsemble } = require('./scoring/ensembleScore');
const { analyzeAccessibility } = require('./accessibility/accessibility_analyzer');

// ============================================================================
// PYTHON CONFIGURATION
// ============================================================================

/**
 * Get the Python executable path
 * Checks for venv first, then falls back to system Python
 */
function getPythonPath() {
    const venvPath = path.join(__dirname, '..', 'venv', 'bin', 'python3');

    // Check if venv exists
    if (fs.existsSync(venvPath)) {
        console.log('[Python] Using venv Python:', venvPath);
        return venvPath;
    }

    // Fall back to system Python
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    console.log('[Python] Using system Python:', systemPython);
    return systemPython;
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Sanitize URL for safe logging (prevent log injection attacks)
 * @param {string} url - URL to sanitize
 * @param {number} maxLength - Maximum length to return (default: 100)
 * @returns {string} Sanitized URL safe for logging
 */
function sanitizeForLogging(url, maxLength = 100) {
    if (!url || typeof url !== 'string') {
        return '[invalid-url]';
    }

    // Remove newlines and control characters
    const sanitized = url.replace(/[\n\r\t]/g, '').substring(0, maxLength);

    // Truncate if too long
    return sanitized.length >= maxLength ? sanitized + '...' : sanitized;
}

/**
 * Truncate text to a specific word count for analysis
 * @param {string} text - Text to truncate
 * @param {number} maxWords - Maximum number of words to include
 * @returns {string} Truncated text
 */
function truncateToWords(text, maxWords) {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
        return text;
    }
    return words.slice(0, maxWords).join(' ');
}

// ============================================================================
// OpenAI API Configuration
// ============================================================================

// Get OpenAI API key from environment
// Checks multiple sources: process.env (Linux/Mac), Windows user env via WSL, or fallback
function getOpenAIKey() {
    // 1. Check process.env (works for all platforms, including EB deployment)
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-proj-your-key-here') {
        console.log('[OpenAI] Using API key from process.env');
        return process.env.OPENAI_API_KEY;
    }

    // 2. Check if running in WSL and try to get Windows environment variable
    const { execSync } = require('child_process');
    const fs = require('fs');

    // Detect WSL by checking for /proc/version containing "microsoft"
    let isWSL = false;
    try {
        if (fs.existsSync('/proc/version')) {
            const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
            isWSL = version.includes('microsoft') || version.includes('wsl');
        }
    } catch (e) {
        // Not WSL
    }

    if (isWSL) {
        try {
            console.log('[OpenAI] Running in WSL, trying to get Windows environment variable...');
            // Use full path to powershell.exe (available in WSL) to get Windows user environment variable
            const powershellPath = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
            const result = execSync(`${powershellPath} -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')"`, {
                encoding: 'utf8',
                timeout: 5000
            }).trim();

            if (result && result !== '' && result !== 'null') {
                console.log('[OpenAI] Successfully retrieved API key from Windows user environment');
                return result;
            } else {
                console.log('[OpenAI] No API key found in Windows user environment, trying Machine level...');
                // Try machine-level environment variable
                const machineResult = execSync(`${powershellPath} -Command "[Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'Machine')"`, {
                    encoding: 'utf8',
                    timeout: 5000
                }).trim();

                if (machineResult && machineResult !== '' && machineResult !== 'null') {
                    console.log('[OpenAI] Successfully retrieved API key from Windows machine environment');
                    return machineResult;
                }
            }
        } catch (e) {
            console.warn('[OpenAI] Failed to retrieve Windows environment variable:', e.message);
        }
    }

    // 3. On native Windows, check user-level environment variables
    if (process.platform === 'win32') {
        try {
            // Get user environment variable on Windows
            const result = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'OPENAI_API_KEY\', \'User\')"', {
                encoding: 'utf8',
                timeout: 5000
            }).trim();

            if (result && result !== '' && result !== 'null') {
                console.log('[OpenAI] Using API key from Windows user environment');
                return result;
            }
        } catch (e) {
            // Ignore errors, will fall through to dummy key
        }
    }

    // 4. Fallback for testing without key
    console.warn('[OpenAI] No OpenAI API key found - using dummy key (API calls will fail)');
    return 'dummy-key-for-testing';
}

// Initialize OpenAI client (will be used by gpt4Prompt function)
let openai = null;
function getOpenAIClient() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: getOpenAIKey()
        });
    }
    return openai;
}

// OpenAI Rate Limiter with Bottleneck
// Tier 1: 500 RPM, 200K TPM | Tier 2: 5,000 RPM, 2M TPM
// Configure for Tier 1 (new accounts) - adjust based on your tier
const openaiLimiter = new Bottleneck({
    reservoir: 500, // Max requests per refill period
    reservoirRefreshAmount: 500,
    reservoirRefreshInterval: 60 * 1000, // 1 minute in milliseconds
    maxConcurrent: 10, // Max concurrent requests
    minTime: 120, // Min 120ms between requests (500 RPM = ~120ms)
});

// Monitor rate limiter events
openaiLimiter.on('failed', async (error, jobInfo) => {
    const id = jobInfo.options.id;
    console.warn(`[OpenAI Rate Limiter] Job ${id} failed:`, error.message);

    // If rate limited (429), check for retry-after header
    if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        if (retryAfter) {
            const delayMs = parseInt(retryAfter) * 1000;
            console.log(`[OpenAI Rate Limiter] Waiting ${retryAfter}s before retry (from retry-after header)`);
            return delayMs; // Return delay to reschedule job
        }
        // Default retry after 10 seconds if no retry-after header
        console.log(`[OpenAI Rate Limiter] No retry-after header, waiting 10s`);
        return 10000;
    }

    // For other errors, don't retry via rate limiter (let p-retry handle it)
    return;
});

openaiLimiter.on('depleted', (empty) => {
    console.warn('[OpenAI Rate Limiter] Reservoir depleted, requests will be queued');
});

openaiLimiter.on('debug', (message, data) => {
    // Uncomment for detailed debugging
    // console.log(`[OpenAI Rate Limiter Debug] ${message}`, data);
});

/**
 * Helper function to run Python scripts with robust error handling
 * Uses stdin for text input to avoid command-line length limits
 * Includes timeout handling, retry logic, and better validation
 *
 * @param {string} scriptPath - Path to the Python script
 * @param {string} textInput - Text to pass via stdin
 * @param {Object} envOverrides - Environment variable overrides
 * @param {Object} options - Options for timeout and retries
 * @returns {Promise<Object>} Parsed JSON output from Python script
 */
function runPythonScript(scriptPath, textInput, envOverrides = {}, options = {}) {
    const timeout = options.timeout || 30000; // 30s default timeout
    const maxRetries = options.retries !== undefined ? options.retries : 2; // 2 retries default

    const attemptRun = async (attemptNumber) => {
        return new Promise((resolve, reject) => {
            // Set up Python environment
            const pythonEnv = Object.assign({}, process.env, envOverrides);
            
            // Get Python path (venv or system)
            const pythonCmd = getPythonPath();
            const pythonProcess = spawn(pythonCmd, [scriptPath, '--stdin'], { env: pythonEnv });

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            // Set timeout
            const timeoutId = setTimeout(() => {
                timedOut = true;
                pythonProcess.kill('SIGTERM');
                reject(new Error(`Python script timeout after ${timeout}ms: ${path.basename(scriptPath)}`));
            }, timeout);

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                clearTimeout(timeoutId);

                if (timedOut) return; // Already rejected

                if (code !== 0) {
                    const error = new Error(
                        `Python script failed (code ${code}, attempt ${attemptNumber}/${maxRetries + 1}): ${path.basename(scriptPath)}\n` +
                        `Error: ${stderr || 'No error message'}`
                    );
                    error.code = code;
                    error.stderr = stderr;
                    error.scriptPath = scriptPath;
                    reject(error);
                } else {
                    try {
                        // Validate stdout is not empty
                        if (!stdout || stdout.trim().length === 0) {
                            reject(new Error(
                                `Python script returned empty output: ${path.basename(scriptPath)}\n` +
                                `This may indicate a silent failure. Check stderr: ${stderr.substring(0, 200)}`
                            ));
                            return;
                        }

                        // Parse JSON
                        const result = JSON.parse(stdout);

                        // Validate result structure (basic check)
                        if (typeof result !== 'object' || result === null) {
                            reject(new Error(
                                `Python script returned invalid JSON structure: ${path.basename(scriptPath)}\n` +
                                `Expected object, got ${typeof result}`
                            ));
                            return;
                        }

                        // Success
                        console.log(`[Python] ${path.basename(scriptPath)} completed successfully (attempt ${attemptNumber})`);
                        resolve(result);
                    } catch (e) {
                        reject(new Error(
                            `Failed to parse Python output from ${path.basename(scriptPath)}: ${e.message}\n` +
                            `Output (first 500 chars): ${stdout.substring(0, 500)}\n` +
                            `Stderr: ${stderr.substring(0, 200)}`
                        ));
                    }
                }
            });

            pythonProcess.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(new Error(
                    `Failed to spawn Python process for ${path.basename(scriptPath)}: ${error.message}\n` +
                    `Make sure Python is installed and in PATH`
                ));
            });

            // Write text to stdin and close
            try {
                pythonProcess.stdin.write(textInput);
                pythonProcess.stdin.end();
            } catch (e) {
                clearTimeout(timeoutId);
                pythonProcess.kill();
                reject(new Error(
                    `Failed to write to Python stdin for ${path.basename(scriptPath)}: ${e.message}`
                ));
            }
        });
    };

    // Retry logic with exponential backoff
    return (async () => {
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await attemptRun(i + 1);
            } catch (error) {
                // Last attempt failed
                if (i === maxRetries) {
                    console.error(`[Python] All ${maxRetries + 1} attempts failed for ${path.basename(scriptPath)}`);
                    throw error;
                }

                // Retry after exponential backoff delay
                const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s...
                console.log(`[Python] Retrying ${path.basename(scriptPath)} in ${delay}ms (attempt ${i + 2}/${maxRetries + 1})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    })();
}

function sanitizeInput(input) {
    try {
        // Ensure the URL includes a protocol, default to HTTPS
        let urlString = input;
        if (!/^https?:\/\//i.test(input)) {
            urlString = 'https://' + input;
        }
        
        const url = new URL(urlString);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid protocol');
        }
        // Prevent access to internal resources (SSRF protection)
        const hostname = url.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || 
            hostname === '0.0.0.0' || hostname.startsWith('10.') || 
            hostname.startsWith('192.168.') || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
            throw new Error('Internal resources not allowed');
        }
        // Prevent access to private IP ranges
        const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ipMatch) {
            const [_, a, b, c, d] = ipMatch.map(Number);
            // Check for private IP ranges
            if ((a === 10) || 
                (a === 172 && b >= 16 && b <= 31) || 
                (a === 192 && b === 168)) {
                throw new Error('Private IP addresses not allowed');
            }
        }
        return url.toString();
    } catch (e) {
        throw new Error('Invalid URL format');
    }
}

function sanitizeLanguage(language) {
    // Allow common language codes (2-3 characters, letters only)
    if (!language || typeof language !== 'string') {
        return 'en'; // default to English
    }
    
    const cleanLang = language.toLowerCase().trim();
    if (/^[a-z]{2,3}$/.test(cleanLang)) {
        return cleanLang;
    }
    
    return 'en'; // default to English if invalid
}

function removeNonTextContent(text) {
    // Remove scripts, styles, and other non-content elements
    console.log('[removeNonTextContent] Starting, text length:', text.length);
    console.log('[removeNonTextContent] Getting JSDOM class...');
    const JSDOMClass = getJSDOM();
    console.log('[removeNonTextContent] Creating JSDOM instance...');
    const dom = new JSDOMClass(text);
    console.log('[removeNonTextContent] Getting document...');
    const document = dom.window.document;
    console.log('[removeNonTextContent] Document ready');

    // Remove non-content elements - expanded list
    const selectorsToRemove = [
        'script', 'style', 'noscript', 'iframe', 'svg',
        'nav', 'header', 'footer', 'aside',
        // Common ad/tracking selectors
        '.ad', '.ads', '.advertisement', '.sponsored', '.promo',
        '[class*="ad-"]', '[id*="ad-"]', '[class*="ads-"]',
        // Navigation and menus
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.navigation', '.nav', '.menu', '.sidebar', '.widget',
        // Comments and social
        '.comments', '.comment', '.social', '.share',
        // Cookie notices and popups
        '.cookie', '.modal', '.popup', '.overlay',
        // Forms and interactive elements (usually not main content)
        'form', 'button:not(article button)',
        // Metadata that's visible but not content
        '.metadata', '.meta', '.byline', '.timestamp', '.tags',
        // Common CMS/framework noise
        '.wp-', '.drupal-', '.shopify-'
    ];

    document.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());

    // Try to find main content area using common patterns
    let contentElement =
        document.querySelector('article') ||
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.querySelector('.main-content') ||
        document.querySelector('.content') ||
        document.querySelector('#content') ||
        document.querySelector('.post-content') ||
        document.querySelector('.entry-content') ||
        document.body;

    // Get text content from the most relevant element
    let cleanText = contentElement.textContent || '';

    // Clean up whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    // Remove common boilerplate phrases
    const boilerplatePhrases = [
        /skip to (main )?content/gi,
        /click here to .*/gi,
        /sign up for (our )?newsletter/gi,
        /follow us on/gi,
        /share this (article|story|post)/gi,
        /read more/gi,
        /load more/gi,
        /accept (all )?cookies/gi,
        /privacy policy/gi,
        /terms (of|and) (service|conditions)/gi
    ];

    boilerplatePhrases.forEach(pattern => {
        cleanText = cleanText.replace(pattern, '');
    });

    // Clean up multiple spaces again
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    return cleanText;
}

async function fetchTextFromUrl(url) {
    // URL should already be sanitized and have protocol from sanitizeInput
    console.log('Fetching content from:', sanitizeForLogging(url));

    // Add random delay to avoid rate limiting (2-5 seconds)
    const delay = Math.random() * 3000 + 2000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check if browser is installed, install if needed
    try {
        console.log('Checking Playwright browser installation...');

        // First check if browsers are already installed
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        // Check for common browser installation paths
        const userDataDir = path.join(os.homedir(), '.cache', 'ms-playwright');
        const chromiumPath = path.join(userDataDir, 'chromium_headless_shell-1194');

        if (!fs.existsSync(chromiumPath)) {
            console.log('Browsers not found, installing...');
            // Use synchronous installation to ensure it completes
            const { execSync } = require('child_process');
            try {
                // Try using npm directly instead of npx
                execSync('npm run playwright:install', { stdio: 'inherit', cwd: process.cwd() });
                console.log('Browser installation completed via npm script');
            } catch (npmError) {
                console.warn('NPM script failed, trying direct playwright install:', npmError.message);
                // Fallback to direct API call
                await chromium.install();
                console.log('Chromium browser installation completed via API');
            }
        } else {
            console.log('Browsers already installed, skipping installation');
        }
    } catch (installError) {
        console.warn('Browser installation failed:', installError.message);
        // Continue anyway - the browser launch will fail gracefully
    }

    const maxRetries = 3;
    let browser = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries} for ${sanitizeForLogging(url)}`);

            // Launch browser with enhanced stealth options
            browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-blink-features=AutomationControlled', // Additional stealth
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images', // Speed up loading by disabling images
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            });

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: 'America/New_York'
            });

            // Set extra HTTP headers to mimic a real browser
            await context.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'DNT': '1'
            });

            const page = await context.newPage();

            // Aggressive resource blocking - only allow HTML document, stylesheets, and XHR for text extraction
            // Block: images, fonts, scripts, media to minimize bandwidth usage
            await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();

                // Allow document (HTML), stylesheet (CSS for accessibility), and xhr (AJAX content)
                // Block everything else: images, fonts, scripts, media
                const allowedTypes = ['document', 'stylesheet', 'xhr'];

                if (allowedTypes.includes(resourceType)) {
                    route.continue();
                } else {
                    // Silently block all other resources
                    route.abort();
                }
            });

            // Set a reasonable timeout
            page.setDefaultTimeout(45000); // Increased to 45 seconds

            // Navigate to the page with progressive timeout strategy
            let response;
            try {
                console.log('Attempting to load page with domcontentloaded...');
                response = await page.goto(url, {
                    waitUntil: 'domcontentloaded', // Faster than networkidle
                    timeout: 20000 // 20 second timeout for DOM content
                });
                console.log('Page loaded successfully with domcontentloaded');
            } catch (error) {
                console.log('DOM content loaded failed, trying load event...', error.message);
                try {
                    response = await page.goto(url, {
                        waitUntil: 'load', // Wait for full page load
                        timeout: 30000 // 30 second timeout for full load
                    });
                    console.log('Page loaded successfully with load event');
                } catch (loadError) {
                    console.log('Load event also failed, trying minimal navigation...', loadError.message);
                    // Last resort - just try to navigate without waiting
                    response = await page.goto(url, {
                        waitUntil: 'commit', // Minimal wait
                        timeout: 15000
                    });
                    console.log('Page navigated with minimal wait');
                }
            }

            // Check if we got a valid response
            if (!response) {
                throw new Error('No response received from page navigation');
            }

            // Accept any response that's not clearly an error (some sites return 403 but still have content)
            if (response.status() >= 400 && response.status() !== 403 && response.status() !== 429) {
                throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
            }

            // Log the final response status
            console.log(`Final response status: ${response.status()}`);

            // Wait a bit for dynamic content to load (reduced from 2000ms)
            await page.waitForTimeout(1000);

            // Extract text content and SEO metadata using page evaluation
            let content = '';
            let seoData = {};
            let geoData = {};
            try {
                const pageData = await page.evaluate(() => {
                    // Try to find main content areas
                    const articleSelectors = [
                        'article',
                        'main',
                        '[role="main"]',
                        '.content',
                        '.post',
                        '.entry',
                        '#content',
                        '#main',
                        '.article-content',
                        '.post-content',
                        '.entry-content',
                        '.article-body',
                        '.post-body',
                        '.entry-body'
                    ];

                    let content = '';
                    for (const selector of articleSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent && element.textContent.trim().length > content.length) {
                            content = element.textContent.trim();
                        }
                    }

                    // If no specific content area found, try to get content from body but exclude common non-content elements
                    if (!content || content.length < 200) {
                        // Remove navigation, headers, footers, sidebars, ads, etc.
                        const elementsToRemove = document.querySelectorAll(
                            'nav, header, footer, aside, .sidebar, .navigation, .menu, .advertisement, .ad, .ads, ' +
                            '.social-share, .comments, .related-posts, .newsletter, .cookie-banner, ' +
                            'script, style, noscript, iframe, .popup, .modal, .overlay, .lightbox, ' +
                            '.cookie-notice, .gdpr-banner, .consent-banner'
                        );
                        elementsToRemove.forEach(el => el.remove());

                        // Try to get content from multiple potential containers
                        const bodyContent = document.body ? document.body.textContent.trim() : '';
                        const mainContent = document.querySelector('main')?.textContent?.trim() || '';
                        const articleContent = document.querySelector('article')?.textContent?.trim() || '';

                        // Use the longest content found
                        content = [bodyContent, mainContent, articleContent]
                            .filter(c => c.length > 100)
                            .sort((a, b) => b.length - a.length)[0] || bodyContent;
                    }

                    // ===================================================================
                    // SEO METADATA EXTRACTION
                    // ===================================================================

                    // Helper function to extract schema types
                    function extractSchemaTypes() {
                        const schemas = new Set();
                        // JSON-LD
                        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                            try {
                                const data = JSON.parse(script.textContent);
                                if (data['@type']) {
                                    if (Array.isArray(data['@type'])) {
                                        data['@type'].forEach(t => schemas.add(t));
                                    } else {
                                        schemas.add(data['@type']);
                                    }
                                }
                            } catch (e) {
                                // Invalid JSON, skip
                            }
                        });
                        // Microdata
                        document.querySelectorAll('[itemtype]').forEach(el => {
                            const type = el.getAttribute('itemtype')?.split('/')?.pop();
                            if (type) schemas.add(type);
                        });
                        return Array.from(schemas);
                    }

                    // Helper function to get element position
                    function getElementPosition(element) {
                        const rect = element.getBoundingClientRect();
                        return {
                            top: Math.round(rect.top + window.scrollY),
                            left: Math.round(rect.left + window.scrollX)
                        };
                    }

                    // Core metadata
                    const title =
                        document.querySelector('meta[property="og:title"]')?.content ||
                        document.querySelector('meta[name="twitter:title"]')?.content ||
                        document.querySelector('title')?.textContent ||
                        '';

                    const description =
                        document.querySelector('meta[name="description"]')?.content ||
                        document.querySelector('meta[property="og:description"]')?.content ||
                        document.querySelector('meta[name="twitter:description"]')?.content ||
                        '';

                    const canonical =
                        document.querySelector('link[rel="canonical"]')?.href ||
                        document.querySelector('meta[property="og:url"]')?.content ||
                        window.location.href;

                    // Heading structure
                    const headings = {
                        h1: Array.from(document.querySelectorAll('h1')).map(h => ({
                            text: h.textContent?.trim() || '',
                            position: getElementPosition(h)
                        })),
                        h2: Array.from(document.querySelectorAll('h2')).map(h => ({
                            text: h.textContent?.trim() || '',
                            position: getElementPosition(h)
                        })),
                        h3: Array.from(document.querySelectorAll('h3')).map(h => ({
                            text: h.textContent?.trim() || '',
                            position: getElementPosition(h)
                        }))
                    };

                    // Keywords
                    const keywords =
                        document.querySelector('meta[name="keywords"]')?.content ||
                        document.querySelector('meta[property="article:tag"]')?.content ||
                        '';

                    const focusKeyword =
                        document.querySelector('meta[name="yoast-focus-keyword"]')?.content ||
                        document.querySelector('meta[name="rank_math_focus_keyword"]')?.content ||
                        '';

                    // Open Graph & Social
                    const openGraph = {
                        type: document.querySelector('meta[property="og:type"]')?.content || '',
                        siteName: document.querySelector('meta[property="og:site_name"]')?.content || '',
                        image: document.querySelector('meta[property="og:image"]')?.content || '',
                        locale: document.querySelector('meta[property="og:locale"]')?.content || 'en_US'
                    };

                    const twitter = {
                        card: document.querySelector('meta[name="twitter:card"]')?.content || '',
                        site: document.querySelector('meta[name="twitter:site"]')?.content || '',
                        creator: document.querySelector('meta[name="twitter:creator"]')?.content || '',
                        image: document.querySelector('meta[name="twitter:image"]')?.content || ''
                    };

                    // Images
                    const images = Array.from(document.querySelectorAll('img')).map(img => ({
                        src: img.src || '',
                        alt: img.alt || '',
                        title: img.title || '',
                        width: img.naturalWidth || 0,
                        height: img.naturalHeight || 0,
                        loading: img.loading || '',
                        hasAlt: img.hasAttribute('alt'),
                        isDecorative: img.alt === '' && img.hasAttribute('alt')
                    }));

                    // Links
                    const currentDomain = window.location.hostname;
                    const links = Array.from(document.querySelectorAll('a[href]')).map(link => {
                        const href = link.href || '';
                        const isInternal = href.includes(currentDomain) || href.startsWith('/');

                        return {
                            href,
                            text: link.textContent?.trim() || '',
                            rel: link.rel || '',
                            isInternal,
                            hasNofollow: link.rel.includes('nofollow'),
                            title: link.title || ''
                        };
                    });

                    // Structured Data
                    const structuredData = [];
                    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                    jsonLdScripts.forEach(script => {
                        try {
                            const data = JSON.parse(script.textContent || '{}');
                            structuredData.push(data);
                        } catch (e) {
                            // Invalid JSON-LD, skip
                        }
                    });

                    // Robots & Indexing
                    const robots = {
                        metaRobots: document.querySelector('meta[name="robots"]')?.content || '',
                        googlebot: document.querySelector('meta[name="googlebot"]')?.content || '',
                        noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
                        nofollow: !!document.querySelector('meta[name="robots"][content*="nofollow"]')
                    };

                    // Language
                    const language = {
                        htmlLang: document.documentElement.lang || '',
                        contentLang: document.querySelector('meta[http-equiv="content-language"]')?.content || '',
                        hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(link => ({
                            lang: link.hreflang,
                            href: link.href
                        }))
                    };

                    // Performance hints
                    const resourceHints = {
                        preconnect: Array.from(document.querySelectorAll('link[rel="preconnect"]')).map(l => l.href),
                        dnsPrefetch: Array.from(document.querySelectorAll('link[rel="dns-prefetch"]')).map(l => l.href),
                        preload: Array.from(document.querySelectorAll('link[rel="preload"]')).map(l => ({
                            href: l.href,
                            as: l.as
                        }))
                    };

                    // ===================================================================
                    // GEO METADATA EXTRACTION (for Generative Engine Optimization)
                    // ===================================================================

                    // Author information (multiple detection strategies)
                    const author = {
                        name:
                            document.querySelector('meta[name="author"]')?.content ||
                            document.querySelector('[rel="author"]')?.textContent?.trim() ||
                            document.querySelector('.author-name')?.textContent?.trim() ||
                            document.querySelector('.author')?.textContent?.trim() ||
                            document.querySelector('[itemprop="author"]')?.textContent?.trim() ||
                            '',
                        bio:
                            document.querySelector('.author-bio')?.textContent?.trim() ||
                            document.querySelector('.author-description')?.textContent?.trim() ||
                            document.querySelector('[itemprop="author"] [itemprop="description"]')?.textContent?.trim() ||
                            '',
                        url:
                            document.querySelector('[rel="author"]')?.href ||
                            document.querySelector('.author-link')?.href ||
                            document.querySelector('[itemprop="author"] link')?.href ||
                            '',
                        image:
                            document.querySelector('.author-photo')?.src ||
                            document.querySelector('.author-image')?.src ||
                            document.querySelector('.author img')?.src ||
                            ''
                    };

                    // Publication and modification dates
                    const dates = {
                        published:
                            document.querySelector('meta[property="article:published_time"]')?.content ||
                            document.querySelector('meta[name="date"]')?.content ||
                            document.querySelector('meta[name="publish_date"]')?.content ||
                            document.querySelector('time[datetime]')?.getAttribute('datetime') ||
                            document.querySelector('[itemprop="datePublished"]')?.content ||
                            '',
                        modified:
                            document.querySelector('meta[property="article:modified_time"]')?.content ||
                            document.querySelector('meta[name="last-modified"]')?.content ||
                            document.querySelector('[itemprop="dateModified"]')?.content ||
                            ''
                    };

                    // Content structure analysis
                    const structure = {
                        hasLists: document.querySelectorAll('ul, ol').length > 0,
                        listCount: document.querySelectorAll('ul, ol').length,
                        hasTables: document.querySelectorAll('table').length > 0,
                        tableCount: document.querySelectorAll('table').length,
                        sectionCount: document.querySelectorAll('section, article').length || 1,
                        wordCount: (document.body?.textContent || '').split(/\s+/).filter(w => w.length > 0).length
                    };

                    // Citations and external sources
                    const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
                        .filter(a => !a.href.includes(window.location.hostname))
                        .map(a => ({
                            href: a.href,
                            text: a.textContent?.trim() || '',
                            rel: a.rel || ''
                        }))
                        .slice(0, 50); // Limit to first 50 external links

                    const citations = {
                        externalLinks: externalLinks,
                        citationCount: document.querySelectorAll('cite, [class*="citation"], [class*="reference"]').length,
                        footnotes: document.querySelectorAll('[class*="footnote"], sup a, [role="doc-noteref"]').length
                    };

                    // Data and statistics signals
                    const bodyText = document.body?.textContent || '';
                    const dataSignals = {
                        hasStatistics: /\d+%|\d+\.\d+%/.test(bodyText),
                        numberCount: (bodyText.match(/\d+/g) || []).length,
                        hasCharts: document.querySelectorAll('img[alt*="chart"], img[alt*="graph"], img[alt*="Chart"], img[alt*="Graph"], canvas, svg').length > 0
                    };

                    // Return content, SEO data, and GEO data
                    return {
                        content: content,
                        seoData: {
                            // Core metadata
                            title,
                            description,
                            canonical,

                            // Content structure
                            headings,

                            // Keywords
                            keywords,
                            focusKeyword,

                            // Social media
                            openGraph,
                            twitter,

                            // Media assets
                            images: {
                                total: images.length,
                                withAlt: images.filter(img => img.hasAlt).length,
                                missingAlt: images.filter(img => !img.hasAlt && !img.isDecorative).length,
                                details: images.slice(0, 10) // Limit to first 10 for performance
                            },

                            // Links
                            links: {
                                total: links.length,
                                internal: links.filter(l => l.isInternal).length,
                                external: links.filter(l => !l.isInternal).length,
                                nofollow: links.filter(l => l.hasNofollow).length,
                                details: links.slice(0, 20) // Limit to first 20
                            },

                            // Structured data
                            structuredData,

                            // Robots and indexing
                            robots,

                            // Language
                            language,

                            // Performance
                            resourceHints,

                            // Metadata
                            extractedAt: new Date().toISOString(),
                            url: window.location.href
                        },
                        geoData: {
                            // Author attribution (E-E-A-T)
                            author,

                            // Publication dates (freshness)
                            dates,

                            // Content structure (citation-worthiness)
                            structure,

                            // Citations and sources (credibility)
                            citations,

                            // Data presence (factual content)
                            dataSignals,

                            // Structured data (reuse from SEO for GEO analysis)
                            schemas: structuredData
                        }
                    };
                });

                content = pageData.content;
                seoData = pageData.seoData;
                geoData = pageData.geoData;
            } catch (extractionError) {
                console.warn('Content extraction failed, trying fallback:', extractionError.message);
                // Fallback: try to get any text content from the page
                try {
                    content = await page.evaluate(() => {
                        // Remove scripts and styles first
                        document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
                        return document.body ? document.body.textContent.trim() : '';
                    });
                } catch (fallbackError) {
                    console.warn('Fallback extraction also failed:', fallbackError.message);
                    content = 'Content extraction failed - page may be blocked or have JavaScript issues';
                }
            }

            // Clean and validate the content
            if (!content || content.length < 50) {
                // Even if content is very short, try to return what we have for blocked pages
                const fallbackContent = content || 'Content could not be extracted - page may be blocked or empty';
                console.log('Limited content extracted, but continuing with:', fallbackContent.length, 'characters');
                return fallbackContent;
            }

            console.log('Extracted content length:', content.length);

            // DON'T close browser yet - needed for accessibility analysis
            // Browser will be closed after all analyses are complete
            return { content, seoData, geoData, page, browser, context };

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);

            // Close browser if it exists
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('Error closing browser:', closeError.message);
                }
                browser = null;
            }

            // If this is not the last attempt, wait before retrying
            if (attempt < maxRetries) {
                const backoffDelay = Math.pow(2, attempt) * 2000 + Math.random() * 2000; // Exponential backoff with jitter
                console.log(`Retrying in ${Math.round(backoffDelay/1000)} seconds...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue;
            }

            // If we've exhausted retries, throw the error
            throw new Error(`Failed to fetch content from ${url} after ${maxRetries} attempts: ${error.message}`);
        }
    }
}

/**
 * Call OpenAI API with automatic retry logic for transient failures
 * Implements rate limiting with Bottleneck + exponential backoff with p-retry
 *
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {string} model - The model to use (default: gpt-4o-mini)
 * @returns {Promise<string>} The AI response
 */
async function gpt4Prompt(prompt, model = 'gpt-4o-mini') {
    const apiKey = getOpenAIKey();

    if (!apiKey || apiKey === 'dummy-key-for-testing') {
        console.log('OpenAI API key not configured, returning mock response');
        return 'API key not configured. Please set OPENAI_API_KEY environment variable.';
    }

    // Wrap the API call in rate limiter
    const rateLimitedCall = async () => {
        return openaiLimiter.schedule({ id: `openai-${Date.now()}` }, async () => {
            try {
                const client = getOpenAIClient();
                const response = await client.chat.completions.create({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2000,
                    temperature: 0.3
                });

                // Track token usage for monitoring
                const tokensUsed = response.usage?.total_tokens || 0;
                console.log(`[OpenAI] Tokens used: ${tokensUsed}, Model: ${model}`);

                return response.choices[0].message.content.trim();
            } catch (error) {
                // Log the error for debugging
                console.error(`[OpenAI] API error (${error.status || error.code}):`, error.message);

                // Check if error is retryable
                if (error.status === 429) {
                    // Rate limit - save retry-after header for rate limiter
                    error.headers = error.response?.headers || {};
                    console.log('[OpenAI] Rate limited (429), will be handled by rate limiter + p-retry...');
                    throw error;
                }

                if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                    // Network error - retry
                    console.log('[OpenAI] Network error, will retry...');
                    throw error;
                }

                if (error.status >= 500) {
                    // Server error - retry
                    console.log('[OpenAI] Server error, will retry...');
                    throw error;
                }

                // Don't retry for 4xx errors (except 429) - these are client errors
                if (error.status >= 400 && error.status < 500) {
                    console.error('[OpenAI] Client error, not retrying:', error.status);
                    const abortError = new Error(`AI analysis failed: ${error.message}`);
                    abortError.name = 'AbortError'; // Tell p-retry not to retry
                    throw abortError;
                }

                // Unknown error - don't retry
                console.error('[OpenAI] Unknown error, not retrying:', error);
                const abortError = new Error(`AI analysis failed: ${error.message}`);
                abortError.name = 'AbortError';
                throw abortError;
            }
        });
    };

    // Wrap rate-limited call with p-retry for additional resilience
    return pRetry(rateLimitedCall, {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        onFailedAttempt: error => {
            if (error.name === 'AbortError') {
                throw error; // Stop retrying immediately
            }
            console.log(
                `[OpenAI] Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
        }
    });
}

async function getToxicityScore(text) {
    try {
        console.log('Running Detoxify toxicity analysis...');
        const toxicityDetectorPath = path.join(__dirname, '..', 'python', 'toxicity_detector.py');
        const result = await runPythonScript(toxicityDetectorPath, text, {}, { timeout: 15000, retries: 2 });

        // Detoxify returns scores 0-1, convert to 0-100 scale
        const overallScore = Math.round(result.overall_toxicity * 100);
        console.log('Detoxify toxicity score:', overallScore);
        return overallScore;
    } catch (error) {
        console.error('Toxicity analysis error:', error.message);
        // Fallback: return 0 if Python script fails
        return 0;
    }
}

async function summarizeContent(url, language = null, options = {}) {
    // ============================================================================
    // PERFORMANCE MONITORING - Track timing for all phases
    // ============================================================================
    const perfStart = Date.now();
    const perfMetrics = {
        phases: {},
        costs: {},
        cacheHits: {},
        startTime: new Date().toISOString()
    };

    // Advanced AI detection is OFF by default (must be explicitly enabled for paid tier)
    if (options.allowAdvanced === undefined) {
        options.allowAdvanced = false;
    }

    const isDirectText = options.isDirectText || false;
    const sanitizedUrl = isDirectText ? url : sanitizeInput(url || '');
    const sanitizedLang = language ? sanitizeLanguage(language) : null;

    if (!sanitizedUrl && !isDirectText) {
        throw new Error('URL or text required');
    }

    console.log(`[Performance] Starting analysis... (input type: ${isDirectText ? 'direct text' : 'URL'})`);

    try {
        // Phase 1: Web scraping or use direct text
        let text, seoData, geoData, page, browser, context;
        
        if (isDirectText) {
            text = url; // When isDirectText is true, 'url' parameter contains the text
            seoData = null;
            geoData = null;
            page = null;
            browser = null;
            context = null;
            console.log(`[Performance] Using direct text input: ${text.length} chars`);
        } else {
            const scrapeStart = Date.now();
            const fetchResult = await fetchTextFromUrl(sanitizedUrl);
            text = fetchResult.content;
            seoData = fetchResult.seoData;
            geoData = fetchResult.geoData;
            page = fetchResult.page;
            browser = fetchResult.browser;
            context = fetchResult.context;
            perfMetrics.phases.webScraping = Date.now() - scrapeStart;
            console.log(`[Performance] Web scraping: ${perfMetrics.phases.webScraping}ms`);
        }
        
        const rawTextLength = text.length;
        const rawWordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        console.log(`Text: ${rawTextLength} chars, ${rawWordCount} words`);
        console.log('SEO data extracted:', seoData ? 'Yes' : 'No');

        // Phase 2: Text cleaning (remove navigation, ads, boilerplate) - only for URLs
        const cleanStart = Date.now();
        if (!isDirectText) {
            text = removeNonTextContent(text);
        }
        text = text.replace(/\s+/g, ' ').trim();
        perfMetrics.phases.textCleaning = Date.now() - cleanStart;
        const cleanedWordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        const reductionPercent = isDirectText ? 0 : Math.round((1 - cleanedWordCount / rawWordCount) * 100);
        console.log(`[Performance] Text cleaning: ${perfMetrics.phases.textCleaning}ms`);
        if (!isDirectText) {
            console.log(`Cleaned text: ${text.length} chars, ${cleanedWordCount} words (removed ${reductionPercent}% navigation/boilerplate)`);
        }

        // Check minimum content length
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount < 200) {
            throw new Error('Content too short for analysis (minimum 200 words required)');
        }

        console.log('[Performance] Starting hybrid analysis (parallel execution)...');
        const analysisStart = Date.now();

        // Run all analyses in parallel for speed
        const [summary, keyPointsRaw, estimatedMetricsRaw, metricsResult, aiDetectionResult, toxicityScore, seoAnalysis, geoAnalysis, accessibilityAnalysis] = await Promise.all([
            // GPT-4o-mini for summary (cheap, good quality)
            (async () => {
                const gptStart = Date.now();
                const result = await gpt4Prompt(
                    `Create a natural, flowing 6-sentence summary that captures the essence of this content - what it's about, why it matters, the main themes, and key takeaways.

Write for a general audience using clear, accessible language. Focus on big-picture themes and conclusions, NOT specific numbers or statistics. Each sentence should be 15-25 words for readability.

DO NOT include: specific numbers, dates, percentages, quotes, or phrases like "This article discusses"
DO include: the topic, context/importance, main arguments or themes, and overall significance

Content:\n${text}`,
                    'gpt-4o-mini'
                );
                perfMetrics.phases.gptSummary = Date.now() - gptStart;
                perfMetrics.costs.gptSummary = (text.length + result.length) * 0.15 / 1000000; // Rough estimate
                return result;
            })(),
            
            // GPT-4o-mini for key points (cheap, good quality) - focus on specific details
            (async () => {
                const gptStart = Date.now();
                const result = await gpt4Prompt(
                    `Extract 5-10 key points (based on content richness) that highlight the MOST IMPORTANT specific details, facts, or findings from this content. These should complement (not duplicate) a general summary by providing concrete, actionable information.

PRIORITIZE (in order):
1. CRITICAL data: Numbers, statistics, percentages, research findings, metrics
2. SPECIFIC examples: Named cases, real-world applications, concrete instances
3. ACTIONABLE insights: Recommendations, best practices, practical steps
4. TECHNICAL details: Methods, mechanisms, processes, technical specifications
5. TEMPORAL context: Dates, timelines, historical milestones, future predictions

FORMAT REQUIREMENTS:
- Each point must be 15-25 words (concise but complete)
- Include specific details (names, numbers, dates) whenever possible
- Lead with the most important/surprising information
- Use active voice and strong verbs
- Make each point self-contained and clear
- Extract 5-10 points depending on content depth (don't force 10 if content only warrants 5)

OUTPUT FORMAT (numbered list only, no intro):
1. First key point here
2. Second key point here
... (continue up to 10 if warranted)

QUALITY CHECKS:
- DO NOT repeat information from multiple points
- DO NOT use vague language ("many", "some", "various")
- DO NOT include general themes (those belong in the summary)
- DO include quantifiable data whenever available
- DO make each point distinct and valuable on its own
- DO NOT force additional points if content doesn't warrant them

Content:\n${text}`,
                    'gpt-4o-mini'
                );
                perfMetrics.phases.gptKeyPoints = Date.now() - gptStart;
                perfMetrics.costs.gptKeyPoints = (text.length + result.length) * 0.15 / 1000000;
                return result;
            })(),
            
            // GPT-4o-mini for estimating advanced metrics (cheap, quick estimates)
            (async () => {
                const gptStart = Date.now();
                const result = await gpt4Prompt(
                    `Analyze this text and estimate scores (0-100) for these 12 advanced writing metrics. For each metric, provide a score and brief 1-sentence reasoning.

METRICS TO ESTIMATE:
1. Common Patterns - Frequency of repetitive AI phrases (higher = more AI-like)
2. Semantic Consistency - How consistently topics flow (higher = better flow/LESS AI-like)
3. Paraphrase Robustness - How well meaning survives paraphrasing (higher = more robust/LESS AI-like)
4. Stopword POS Distribution Skew - Unusual distribution of function words (higher = more AI-like)
5. Contradiction Consistency - Logical consistency without contradictions (higher = more consistent/LESS AI-like)
6. Coreference Coherence - Quality of pronoun/reference chains (higher = better coherence/LESS AI-like)
7. Temporal Consistency - Logical flow of time references (higher = better temporal logic/LESS AI-like)
8. Round-Trip Translation Stability - How well meaning survives translation (higher = more stable/LESS AI-like)
9. Order Perturbation Tolerance - Meaning preserved when reordering (higher = more flexible/LESS AI-like)
10. Boilerplate Frequency - Presence of template/formulaic language (higher = more boilerplate/AI-like)
11. Scaffold Likelihood - Evidence of AI writing templates/scaffolds (higher = more template-like/AI-like)
12. Hedging Density - Frequency of uncertain language ("might", "possibly") (higher = more hedging/AI-like)

SCORING GUIDE:
For metrics 1, 4, 10, 11, 12 (higher = more AI-like):
- 0-30: Strongly human-like
- 31-50: Slightly human-leaning
- 51-70: Slightly AI-leaning
- 71-100: Strongly AI-like

For metrics 2, 3, 5, 6, 7, 8, 9 (higher = LESS AI-like / better quality):
- 0-30: Strongly AI-like (poor quality)
- 31-50: Slightly AI-leaning
- 51-70: Slightly human-leaning
- 71-100: Strongly human-like (high quality)

OUTPUT FORMAT (JSON only, no other text):
{
  "Common Patterns": {"score": 45, "reason": "Moderate use of transitional phrases like 'furthermore' and 'moreover'"},
  "Semantic Consistency": {"score": 62, "reason": "Topics flow very smoothly with minimal jumps between concepts"},
  ...
}

Text to analyze:\n${truncateToWords(text, 5000)}`,
                    'gpt-4o-mini'
                );
                perfMetrics.phases.gptMetricsEstimate = Date.now() - gptStart;
                const inputLength = truncateToWords(text, 5000).length;
                perfMetrics.costs.gptMetricsEstimate = (inputLength + result.length) * 0.15 / 1000000;
                return result;
            })(),
            
            // Python statistical metrics (free, fast)
            (async () => {
                const pythonStart = Date.now();
                try {
                    console.log(`[DEBUG] Passing text to metrics.py: ${text.length} chars, ${text.split(/\s+/).length} words`);
                    const result = await runPythonScript(
                        path.join(__dirname, '..', 'python', 'metrics.py'),
                        text,
                        {},
                        { timeout: 15000, retries: 2 }
                    );
                    perfMetrics.phases.pythonMetrics = Date.now() - pythonStart;
                    console.log(`[DEBUG] metrics.py result emotion_details:`, result?.emotion_details);
                    return result;
                } catch (err) {
                    perfMetrics.phases.pythonMetrics = Date.now() - pythonStart;
                    console.error('Metrics calculation failed:', err.message);
                    return null;
                }
            })(),

            // Python AI detection (free, fast)
            // Allow caller to enable/disable advanced model (Binoculars) via options.allowAdvanced
            (async () => {
                const pythonStart = Date.now();
                try {
                    const allowAdvancedValue = options.allowAdvanced ? '1' : '0';
                    console.log(`[DEBUG] Calling ai_detector.py with ALLOW_ADVANCED=${allowAdvancedValue}, options.allowAdvanced=${options.allowAdvanced}`);
                    const result = await runPythonScript(
                        path.join(__dirname, '..', 'python', 'ai_detector.py'),
                        text,
                        { ALLOW_ADVANCED: allowAdvancedValue },
                        { timeout: 180000, retries: 1 } // 3 minutes for model download on first use
                    );
                    perfMetrics.phases.pythonAiDetection = Date.now() - pythonStart;
                    perfMetrics.cacheHits.aiDetection = result.model !== 'statistical_heuristics';
                    return result;
                } catch (err) {
                    perfMetrics.phases.pythonAiDetection = Date.now() - pythonStart;
                    console.error('AI detection failed, using heuristic fallback:', err.message);
                    // Fall back to heuristic detection instead of failing
                    const heuristic = detectAIHeuristic(text);
                    return {
                        ai_likelihood: heuristic.aiLikelihood,
                        confidence: 60,
                        indicators: heuristic.indicators || [],
                        model: 'statistical_heuristics_fallback',
                        error: err.message
                    };
                }
            })(),
            
            // Python toxicity detection (free, accurate)
            (async () => {
                const pythonStart = Date.now();
                const result = await getToxicityScore(text);
                perfMetrics.phases.pythonToxicity = Date.now() - pythonStart;
                return result;
            })(),

            // Python SEO analysis
            (async () => {
                const pythonStart = Date.now();
                try {
                    const result = await runPythonScript(
                        path.join(__dirname, '..', 'python', 'seo_analyzer.py'),
                        JSON.stringify(seoData),
                        {},
                        { timeout: 10000, retries: 2 }
                    );
                    perfMetrics.phases.pythonSeoAnalysis = Date.now() - pythonStart;
                    return result;
                } catch (err) {
                    perfMetrics.phases.pythonSeoAnalysis = Date.now() - pythonStart;
                    console.error('SEO analysis failed:', err.message);
                    return null; // Graceful degradation
                }
            })(),

            // Python GEO analysis (NEW - Generative Engine Optimization)
            (async () => {
                const pythonStart = Date.now();
                try {
                    // Combine content, SEO data, and GEO-specific data for analysis
                    const geoInput = {
                        content: text,
                        seoData: seoData,  // Reuse SEO metadata for headings etc.
                        geoData: geoData,  // GEO-specific metadata (author, dates, etc.)
                        url: sanitizedUrl
                    };

                    const result = await runPythonScript(
                        path.join(__dirname, '..', 'python', 'geo_analyzer.py'),
                        JSON.stringify(geoInput),
                        {},
                        { timeout: 10000, retries: 2 }
                    );
                    perfMetrics.phases.pythonGeoAnalysis = Date.now() - pythonStart;
                    return result;
                } catch (err) {
                    perfMetrics.phases.pythonGeoAnalysis = Date.now() - pythonStart;
                    console.error('GEO analysis failed:', err.message);
                    return null; // Graceful degradation
                }
            })(),

            // Accessibility analysis (Node.js-based with axe-core)
            (async () => {
                const accessStart = Date.now();
                try {
                    // Reuse existing Playwright page from scraping
                    const result = await analyzeAccessibility(page, sanitizedUrl);
                    perfMetrics.phases.accessibilityAnalysis = Date.now() - accessStart;
                    console.log(`[Accessibility] Analysis complete: ${result.overall_accessibility_score}/100 (${result.grade})`);
                    return result;
                } catch (err) {
                    perfMetrics.phases.accessibilityAnalysis = Date.now() - accessStart;
                    console.error('Accessibility analysis failed:', err.message);
                    return null; // Graceful degradation
                }
            })()
        ]);

        perfMetrics.phases.parallelAnalysis = Date.now() - analysisStart;
        console.log(`[Performance] Parallel analysis complete: ${perfMetrics.phases.parallelAnalysis}ms`);
        console.log('Raw AI detection result:', JSON.stringify(aiDetectionResult, null, 2));
        console.log('Raw key points response:', JSON.stringify(keyPointsRaw));
        console.log('Raw estimated metrics response:', estimatedMetricsRaw ? estimatedMetricsRaw.substring(0, 200) : 'null');
        console.log('Raw SEO analysis:', seoAnalysis ? JSON.stringify(seoAnalysis).substring(0, 300) : 'null');
        console.log('Raw GEO analysis:', geoAnalysis ? JSON.stringify(geoAnalysis).substring(0, 300) : 'null');

        // Transform SEO analysis to match TypeScript interface
        let transformedSeoAnalysis = null;
        if (seoAnalysis && seoAnalysis.breakdown) {
            // Convert Python seo_analyzer.py output to expected SeoResult format
            transformedSeoAnalysis = {
                overall_seo_score: seoAnalysis.score || 0,
                grade: seoAnalysis.grade || 'F',
                summary: seoAnalysis.summary || `SEO Score: ${seoAnalysis.score || 0}/100`,
                scores: {},
                recommendations: seoAnalysis.recommendations || [],
                geo_metadata: seoAnalysis.metadata?.geo_metadata || { html_lang: 'en' }
            };

            // Transform breakdown scores to flat scores object
            const breakdown = seoAnalysis.breakdown;
            if (breakdown) {
                transformedSeoAnalysis.scores['Title Tag'] = breakdown.title?.score || 0;
                transformedSeoAnalysis.scores['Meta Description'] = breakdown.description?.score || 0;
                transformedSeoAnalysis.scores['Headings (H1-H6)'] = breakdown.headings?.score || 0;
                transformedSeoAnalysis.scores['Image Alt Text'] = breakdown.images?.score || 0;
                transformedSeoAnalysis.scores['Internal Links'] = breakdown.links?.score || 0;
                transformedSeoAnalysis.scores['Structured Data'] = breakdown.structured_data?.score || 0;
                transformedSeoAnalysis.scores['Social Media'] = breakdown.social?.score || 0;
                transformedSeoAnalysis.scores['Performance'] = breakdown.performance?.score || 0;
            }

            console.log('Transformed SEO scores:', Object.keys(transformedSeoAnalysis.scores).length, 'metrics');
        }

        // Transform GEO analysis to match TypeScript interface
        let transformedGeoAnalysis = null;
        if (geoAnalysis && geoAnalysis.score !== null && geoAnalysis.score !== undefined) {
            // Convert Python geo_analyzer.py output to expected GeoResult format
            transformedGeoAnalysis = {
                overall_geo_score: geoAnalysis.score || 0,
                grade: geoAnalysis.grade || 'F',
                summary: geoAnalysis.summary || `GEO Score: ${geoAnalysis.score || 0}/100`,
                scores: {},
                recommendations: geoAnalysis.recommendations || []
            };

            // Transform breakdown scores to flat scores object
            const breakdown = geoAnalysis.breakdown;
            if (breakdown) {
                transformedGeoAnalysis.scores['Citation Structure'] = breakdown.citation_structure?.score || 0;
                transformedGeoAnalysis.scores['Source Credibility'] = breakdown.source_credibility?.score || 0;
                transformedGeoAnalysis.scores['Structured Data'] = breakdown.structured_data?.score || 0;
                transformedGeoAnalysis.scores['Content Freshness'] = breakdown.content_freshness?.score || 0;
                transformedGeoAnalysis.scores['Author Attribution'] = breakdown.author_attribution?.score || 0;
                transformedGeoAnalysis.scores['Factual Clarity'] = breakdown.factual_clarity?.score || 0;
                transformedGeoAnalysis.scores['Data Presence'] = breakdown.data_presence?.score || 0;
                transformedGeoAnalysis.scores['Content Depth'] = breakdown.content_depth?.score || 0;
            }

            // Add optional metadata if available
            if (geoAnalysis.citation_readiness) {
                transformedGeoAnalysis.citation_readiness = geoAnalysis.citation_readiness;
            }
            if (geoAnalysis.ai_platforms) {
                transformedGeoAnalysis.ai_platforms = geoAnalysis.ai_platforms;
            }
            if (geoAnalysis.content_type) {
                transformedGeoAnalysis.content_type = geoAnalysis.content_type;
            }

            console.log('Transformed GEO scores:', Object.keys(transformedGeoAnalysis.scores).length, 'metrics');
        }

        // Process the key points response
        const keyPoints = keyPointsRaw
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.match(/^\d+\.\s+.+/)) // Only lines that start with number + period + space
            .map(line => line.replace(/^\d+\.\s*/, '')) // Remove the numbering
            .filter(point => point.length > 10) // Filter out very short points
            .slice(0, 10) // Take up to 10 points for premium tier
            .join('\n');

        console.log('Processed key points:', JSON.stringify(keyPoints));

        // Parse GPT-estimated metrics
        let estimatedMetrics = {};
        try {
            console.log('Estimated metrics raw response type:', typeof estimatedMetricsRaw);
            console.log('Estimated metrics raw response (first 500 chars):', estimatedMetricsRaw ? estimatedMetricsRaw.substring(0, 500) : 'null/undefined');
            
            // Try to parse as JSON
            const jsonMatch = estimatedMetricsRaw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                estimatedMetrics = JSON.parse(jsonMatch[0]);
                console.log('Successfully parsed estimated metrics:', Object.keys(estimatedMetrics).length, 'metrics');
            } else {
                console.warn('No JSON found in estimated metrics response');
                console.warn('Full response was:', estimatedMetricsRaw);
            }
        } catch (e) {
            console.error('Failed to parse estimated metrics:', e.message);
            console.error('Raw response was:', estimatedMetricsRaw);
            // Will fall back to using aiLikelihoodPercent for all metrics
        }

        // Build AI likelihood response with real metrics
        // ai_likelihood comes as 0-100 from Python, not 0-1
        const aiLikelihoodPercent = aiDetectionResult.ai_likelihood || 0;
        
        // Build notes showing both model and heuristic scores if available
        let notesText = `AI Detection (${aiDetectionResult.model || 'unknown'}): ${Math.round(aiLikelihoodPercent)}% likelihood`;
        if (aiDetectionResult.indicators && aiDetectionResult.indicators.length > 0) {
            notesText += `. ${aiDetectionResult.indicators.slice(0, 2).join('. ')}`;
        }
        if (aiDetectionResult.heuristic_score !== undefined && aiDetectionResult.heuristic_score !== aiLikelihoodPercent) {
            notesText += ` | Heuristic Score: ${Math.round(aiDetectionResult.heuristic_score)}%`;
            if (aiDetectionResult.heuristic_indicators && aiDetectionResult.heuristic_indicators.length > 0) {
                notesText += ` (${aiDetectionResult.heuristic_indicators.slice(0, 2).join(', ')})`;
            }
        }
        
        const parsedAiLikelihood = {
            scores: {},
            notes: notesText,
            // Pass through RoBERTa/Binoculars scores if available
            ...(aiDetectionResult.roberta_score && { roberta_score: aiDetectionResult.roberta_score }),
            ...(aiDetectionResult.binoculars_score && { binoculars_score: aiDetectionResult.binoculars_score }),
            ...(aiDetectionResult.individual_results && { individual_results: aiDetectionResult.individual_results })
        };

        // Map Python metrics to existing metric names with calculation method
        // All values are already 0-100 from Python, just need rounding for display
        if (metricsResult) {
            parsedAiLikelihood.scores['Burstiness'] = {
                percent: Math.round(metricsResult.burstiness),
                na: false,
                reason: 'Statistical calculation',
                calculationMethod: 'statistical'
            };
            parsedAiLikelihood.scores['Sentence Length Variance'] = {
                percent: Math.round(metricsResult.sentence_variance),
                na: false,
                reason: 'Statistical calculation',
                calculationMethod: 'statistical'
            };
            parsedAiLikelihood.scores['Punctuation Pattern Uniformity'] = {
                percent: Math.round(metricsResult.punctuation_uniformity),
                na: false,
                reason: 'Statistical calculation',
                calculationMethod: 'statistical'
            };
            parsedAiLikelihood.scores['Readability Z-Score'] = {
                percent: Math.round(metricsResult.readability_score),
                na: false,
                reason: 'Statistical calculation',
                calculationMethod: 'statistical'
            };
            parsedAiLikelihood.scores['N-gram Entropy'] = {
                percent: Math.round(metricsResult.ngram_entropy),
                na: false,
                reason: 'Statistical calculation',
                calculationMethod: 'statistical'
            };
            parsedAiLikelihood.scores['Character-Level Irregularities'] = {
                percent: Math.round(metricsResult.character_irregularities),
                na: false,
                reason: 'Statistical calculation',
                calculationMethod: 'statistical'
            };

            // Add emotion metrics
            parsedAiLikelihood.scores['Emotional Variance'] = {
                percent: Math.round((metricsResult.emotional_variance || 0) * 10000),
                na: false,
                reason: 'Emotion lexicon analysis',
                calculationMethod: 'statistical'
            };

            parsedAiLikelihood.scores['Emotional AI Score'] = {
                percent: Math.round(metricsResult.emotional_ai_score || 50),
                na: false,
                reason: 'AI emotional pattern detection',
                calculationMethod: 'statistical'
            };

            parsedAiLikelihood.scores['Dominant Emotion'] = {
                percent: metricsResult.dominant_emotion || 'neutral',
                na: false,
                reason: 'Most prevalent emotion detected',
                calculationMethod: 'statistical'
            };
        }

        // Add GPT-estimated scores for advanced metrics
        const advancedMetrics = [
            'Common Patterns',
            'Semantic Consistency',
            'Paraphrase Robustness',
            'Stopword POS Distribution Skew',
            'Contradiction Consistency',
            'Coreference Coherence',
            'Temporal Consistency',
            'Round-Trip Translation Stability',
            'Order Perturbation Tolerance',
            'Boilerplate Frequency',
            'Scaffold Likelihood',
            'Hedging Density'
        ];

        advancedMetrics.forEach(metric => {
            if (estimatedMetrics[metric]) {
                // Use GPT-estimated values if available
                parsedAiLikelihood.scores[metric] = {
                    percent: Math.round(estimatedMetrics[metric].score || aiLikelihoodPercent),
                    na: false,
                    reason: estimatedMetrics[metric].reason || 'AI-estimated based on text analysis',
                    calculationMethod: 'ai_estimated'
                };
            } else {
                // Fallback to overall AI detection score
                parsedAiLikelihood.scores[metric] = {
                    percent: Math.round(aiLikelihoodPercent),
                    na: false,
                    reason: 'Based on overall AI detection (estimation unavailable)',
                    calculationMethod: 'ai_estimated'
                };
            }
        });

        console.log('Parsed AI likelihood response:', parsedAiLikelihood);
        console.log('Toxicity score:', toxicityScore);

        // Calculate ensemble score from all metrics
        try {
            const textLength = text.split(/\s+/).length;
            const rawMetrics = {
                perplexity: metricsResult?.perplexity,
                burstiness: metricsResult?.burstiness,
                sentence_variance: metricsResult?.sentence_variance,
                punctuation_uniformity: metricsResult?.punctuation_uniformity,
                ngram_entropy: metricsResult?.ngram_entropy,
                character_irregularities: metricsResult?.character_irregularities,
                emotional_variance: metricsResult?.emotional_variance,
                ...estimatedMetrics
            };

            const ensembleResult = calculateFullEnsemble(rawMetrics, textLength);
            parsedAiLikelihood.ensembleScore = ensembleResult;
            console.log('Ensemble score calculated:', ensembleResult.overall_score);
        } catch (err) {
            console.error('Error calculating ensemble score:', err);
        }

        // Phase 3: Response assembly
        const assemblyStart = Date.now();
        // Extract full emotional analysis from metricsResult.emotion_details
        const emotionDetails = metricsResult?.emotion_details || {};
        console.log('[DEBUG] metricsResult.emotion_details:', emotionDetails);
        const emotionalAnalysis = metricsResult ? {
            emotions: emotionDetails.emotions || {},
            sentiment: emotionDetails.sentiment || {},
            emotional_variance: metricsResult.emotional_variance || 0,
            emotional_word_ratio: emotionDetails.emotional_word_ratio || 0,
            dominant_emotion: metricsResult.dominant_emotion || 'neutral',
            ai_indicator_score: metricsResult.emotional_ai_score || emotionDetails.ai_indicator_score || 50,
            ai_indicators: emotionDetails.ai_indicators || [],
            total_emotional_words: emotionDetails.total_emotional_words || 0,
            word_count: emotionDetails.word_count || 0
        } : null;
        console.log('[DEBUG] Assembled emotionalAnalysis:', emotionalAnalysis);

        const result = {
            summary,
            keyPoints,
            aiLikelihood: parsedAiLikelihood,
            toxicityScore,
            seo: transformedSeoAnalysis || null,  // SEO (Search Engine Optimization) - TRANSFORMED
            geo: transformedGeoAnalysis || null,  // GEO (Generative Engine Optimization) - TRANSFORMED
            accessibility: accessibilityAnalysis || null,  // Accessibility (WCAG 2.1 Compliance)
            emotional: emotionalAnalysis  // Emotional Analysis (NRC Emotion Lexicon)
        };
        perfMetrics.phases.responseAssembly = Date.now() - assemblyStart;

        // Calculate totals
        perfMetrics.totalTime = Date.now() - perfStart;
        perfMetrics.totalCost = Object.values(perfMetrics.costs).reduce((a, b) => a + b, 0);
        perfMetrics.endTime = new Date().toISOString();

        // Log performance summary
        console.log('\n========================================');
        console.log('[Performance] ANALYSIS COMPLETE');
        console.log('========================================');
        console.log(`Total Time: ${perfMetrics.totalTime}ms (${(perfMetrics.totalTime / 1000).toFixed(2)}s)`);
        console.log(`Total Cost: $${perfMetrics.totalCost.toFixed(6)}`);
        console.log('\nPhase Breakdown:');
        console.log(`  Web Scraping:       ${perfMetrics.phases.webScraping}ms (${((perfMetrics.phases.webScraping / perfMetrics.totalTime) * 100).toFixed(1)}%)`);
        console.log(`  Text Cleaning:      ${perfMetrics.phases.textCleaning}ms (${((perfMetrics.phases.textCleaning / perfMetrics.totalTime) * 100).toFixed(1)}%)`);
        console.log(`  GPT Summary:        ${perfMetrics.phases.gptSummary}ms`);
        console.log(`  GPT Key Points:     ${perfMetrics.phases.gptKeyPoints}ms`);
        console.log(`  GPT Metrics Est:    ${perfMetrics.phases.gptMetricsEstimate}ms`);
        console.log(`  Python Metrics:     ${perfMetrics.phases.pythonMetrics}ms`);
        console.log(`  Python AI Detect:   ${perfMetrics.phases.pythonAiDetection}ms`);
        console.log(`  Python Toxicity:    ${perfMetrics.phases.pythonToxicity}ms`);
        console.log(`  Python SEO:         ${perfMetrics.phases.pythonSeoAnalysis || 0}ms`);
        console.log(`  Accessibility:      ${perfMetrics.phases.accessibilityAnalysis || 0}ms`);
        console.log(`  Parallel Analysis:  ${perfMetrics.phases.parallelAnalysis}ms (${((perfMetrics.phases.parallelAnalysis / perfMetrics.totalTime) * 100).toFixed(1)}%)`);
        console.log(`  Response Assembly:  ${perfMetrics.phases.responseAssembly}ms`);
        console.log('\nCost Breakdown:');
        console.log(`  GPT Summary:        $${perfMetrics.costs.gptSummary.toFixed(6)}`);
        console.log(`  GPT Key Points:     $${perfMetrics.costs.gptKeyPoints.toFixed(6)}`);
        console.log(`  GPT Metrics Est:    $${perfMetrics.costs.gptMetricsEstimate.toFixed(6)}`);
        console.log('\nCache Status:');
        console.log(`  AI Detection:       ${perfMetrics.cacheHits.aiDetection ? 'HIT (model cached)' : 'MISS (loaded model)'}`);
        console.log('========================================\n');

        // Attach performance metrics to result (optional, for tracking)
        result._performance = perfMetrics;

        // Close browser after all analyses are complete
        if (browser) {
            try {
                await browser.close();
                console.log('[Browser] Closed successfully after all analyses');
            } catch (closeError) {
                console.error('[Browser] Error closing:', closeError.message);
            }
        }

        return result;

    } catch (error) {
        console.error('Analysis error:', error);

        // Close browser on error
        if (browser) {
            try {
                await browser.close();
                console.log('[Browser] Closed after error');
            } catch (closeError) {
                console.error('[Browser] Error closing on error:', closeError.message);
            }
        }

        throw error;
    }
}

/**
 * Deep Analysis with Real Statistical Metrics (Pro Tier)
 * Combines GPT estimates with actual computed metrics from Python
 * 
 * @param {string} url - URL to analyze
 * @param {string} language - Optional language override
 * @returns {Promise<Object>} Analysis with both AI estimates and real metrics
 */
async function deepAnalyze(url, language = null) {
    console.log('Starting DEEP analysis with real statistical metrics...');
    
    try {
        // First, run standard analysis for summary, key points, and AI detection
        const standardResult = await summarizeContent(url, language);
        
        // Fetch text again for Python analysis
        const text = await fetchTextFromUrl(url);
        
        // Run advanced metrics in Python
        console.log('Computing real statistical metrics via Python...');
        const advancedMetrics = await runPythonAdvancedMetrics(text);
        
        // Enhance the result with real metrics
        const deepResult = {
            ...standardResult,
            advancedMetrics,
            analysisType: 'deep',
            metadata: {
                hasRealMetrics: true,
                metricsMethod: 'statistical',
                estimatedCost: 0.0009, // Same GPT cost
                computeTime: advancedMetrics.computeTime || 'N/A'
            }
        };
        
        // Replace AI-estimated scores with real computed values where available
        if (advancedMetrics.commonPatterns !== undefined) {
            deepResult.aiLikelihood.scores['Common Patterns'] = {
                percent: Math.round(advancedMetrics.commonPatterns),
                na: false,
                reason: 'Real statistical analysis using n-gram frequency',
                calculationMethod: 'statistical'
            };
        }
        
        if (advancedMetrics.stopwordPosSkew !== undefined) {
            deepResult.aiLikelihood.scores['Stopword POS Distribution Skew'] = {
                percent: Math.round(advancedMetrics.stopwordPosSkew),
                na: false,
                reason: 'Real POS tagging analysis with skewness calculation',
                calculationMethod: 'statistical'
            };
        }
        
        if (advancedMetrics.boilerplateFrequency !== undefined) {
            deepResult.aiLikelihood.scores['Boilerplate Frequency'] = {
                percent: Math.round(advancedMetrics.boilerplateFrequency),
                na: false,
                reason: 'Real pattern matching for formulaic content',
                calculationMethod: 'statistical'
            };
        }
        
        if (advancedMetrics.hedgingDensity !== undefined) {
            deepResult.aiLikelihood.scores['Hedging Density'] = {
                percent: Math.round(advancedMetrics.hedgingDensity),
                na: false,
                reason: 'Real word frequency analysis for uncertainty language',
                calculationMethod: 'statistical'
            };
        }
        
        console.log('Deep analysis complete with 4 real statistical metrics');
        return deepResult;
        
    } catch (error) {
        console.error('Deep analysis error:', error);
        throw error;
    }
}

/**
 * Run Python advanced metrics calculation
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Advanced metrics results
 */
async function runPythonAdvancedMetrics(text) {
    const startTime = Date.now();
    
    try {
        const tempFile = path.join(__dirname, '..', 'temp_analysis_text.txt');
        
        // Write text to temp file
        fs.writeFileSync(tempFile, text, 'utf-8');
        
        // Run Python script - use forward slashes for cross-platform compatibility
        const pythonCommand = getPythonPath();
        const tempFileForPython = tempFile.replace(/\\/g, '/');  // Convert backslashes to forward slashes
        
        const result = await new Promise((resolve, reject) => {
            exec(
                `${pythonCommand} -c "from python.advanced_metrics import calculate_all_advanced_metrics; text = open(r'${tempFile}', 'r', encoding='utf-8').read(); import json; print(json.dumps(calculate_all_advanced_metrics(text)))"`,
                { cwd: path.join(__dirname, '..'), maxBuffer: 10 * 1024 * 1024 },
                (error, stdout, stderr) => {
                    // Clean up temp file
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    if (error) {
                        console.error('Python advanced metrics error:', error.message);
                        console.error('stderr:', stderr);
                        reject(error);
                        return;
                    }
                    
                    try {
                        const metrics = JSON.parse(stdout.trim());
                        resolve(metrics);
                    } catch (parseError) {
                        console.error('Failed to parse Python output:', stdout);
                        reject(parseError);
                    }
                }
            );
        });
        
        const computeTime = Date.now() - startTime;
        result.computeTime = `${computeTime}ms`;
        
        console.log(`Advanced metrics computed in ${computeTime}ms`);
        return result;
        
    } catch (error) {
        console.error('Error running Python advanced metrics:', error.message);
        // Return fallback values
        return {
            commonPatterns: 50,
            stopwordPosSkew: 50,
            boilerplateFrequency: 50,
            hedgingDensity: 50,
            averageAdvanced: 50,
            metadata: {
                method: 'statistical',
                metricsCount: 4,
                description: 'Real statistical analysis (Pro tier)',
                error: error.message
            },
            computeTime: 'N/A'
        };
    }
}

/**
 * Run Python premium metrics calculation (PAID TIER ONLY)
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Premium metrics results
 */
async function runPythonPremiumMetrics(text) {
    const startTime = Date.now();
    
    try {
        const result = await new Promise((resolve, reject) => {
            const pythonPath = getPythonPath();
            const scriptPath = path.join(__dirname, '..', 'python', 'premium_metrics.py');

            const pythonProcess = spawn(pythonPath, [scriptPath, '--stdin'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Premium metrics script exited with code ${code}: ${stderr}`));
                } else {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (e) {
                        reject(new Error(`Failed to parse premium metrics JSON: ${e.message}`));
                    }
                }
            });
            
            pythonProcess.on('error', (err) => {
                reject(new Error(`Failed to start premium metrics script: ${err.message}`));
            });
            
            // Send text to stdin
            pythonProcess.stdin.write(text);
            pythonProcess.stdin.end();
        });
        
        const computeTime = Date.now() - startTime;
        result.computeTime = `${computeTime}ms`;
        
        console.log(`Premium metrics computed in ${computeTime}ms`);
        return result;
        
    } catch (error) {
        console.error('Error running Python premium metrics:', error.message);
        // Return fallback values
        return {
            perplexity: 50,
            readability: { error: error.message },
            linguistics: { error: error.message },
            statistics: { error: error.message },
            metadata: {
                tier: 'premium',
                status: 'failed',
                error: error.message
            },
            computeTime: 'N/A'
        };
    }
}

/**
 * Tiered Analysis Function
 * Routes to either FREE or PAID analysis based on user tier
 * 
 * @param {string} url - URL to analyze
 * @param {string} language - Optional language override
 * @param {Object} options - Analysis options
 * @param {string} options.tier - 'free' or 'paid' (default: 'free')
 * @param {string} options.userId - User ID for token tracking (optional)
 * @returns {Promise<Object>} Analysis results with tier-specific features
 */
async function analyzeTiered(url, language = null, options = {}) {
    const tier = options.tier || 'free';
    
    console.log(`[Tiered Analysis] Starting ${tier.toUpperCase()} tier analysis for: ${sanitizeForLogging(url)}`);
    
    if (tier === 'free') {
        // ========================================================================
        // FREE TIER - Limited features
        // ========================================================================
        return await analyzeFree(url, language, options);
    } else if (tier === 'paid') {
        // ========================================================================
        // PAID TIER - Full features + premium metrics
        // ========================================================================
        return await analyzePaid(url, language, options);
    } else {
        throw new Error(`Invalid tier: ${tier}. Must be 'free' or 'paid'`);
    }
}

/**
 * Free Tier Analysis (3 per day limit)
 * - Short summary (50 words max)
 * - 6 basic statistical metrics only
 * - AI detection using heuristics (70% accuracy)
 * - 1 basic readability score
 * - NO toxicity analysis
 * - NO premium metrics
 */
async function analyzeFree(url, language = null, options = {}) {
    const perfStart = Date.now();
    const isDirectText = options.isDirectText || false;
    const sanitizedUrl = isDirectText ? url : sanitizeInput(url || '');
    
    if (!sanitizedUrl && !isDirectText) {
        throw new Error('URL or text required');
    }
    
    console.log(`[Free Tier] Starting analysis... (input type: ${isDirectText ? 'direct text' : 'URL'})`);
    
    try {
        // Fetch and clean text
        let text;
        let fetchResult = null; // Track fetch result for browser cleanup
        if (isDirectText) {
            text = url; // When isDirectText is true, 'url' parameter contains the text
            console.log('[analyzeFree] Using direct text input, length:', text.length);
        } else {
            fetchResult = await fetchTextFromUrl(sanitizedUrl);
            text = fetchResult.content;
            console.log('[analyzeFree] Text length before removeNonTextContent:', text ? text.length : 'undefined');
            text = removeNonTextContent(text);
            console.log('[analyzeFree] Text length after removeNonTextContent:', text.length);
        }
        text = text.replace(/\s+/g, ' ').trim();
        console.log('[analyzeFree] Text length after whitespace cleanup:', text.length);

        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        console.log('[analyzeFree] Word count:', wordCount);
        if (wordCount < 200) {
            throw new Error('Content too short for analysis (minimum 200 words required)');
        }
        
        // Run free tier analysis in parallel
        const [summary, keyPointsRaw, metricsResult, aiDetectionResult] = await Promise.all([
            // Short summary only (50 words max)
            (async () => {
                const result = await gpt4Prompt(
                    `Create a 3-sentence summary (maximum 50 words) of this content:\n\n${truncateToWords(text, 3000)}`,
                    'gpt-4o-mini'
                );
                return result;
            })(),

            // Key points (5 for free tier)
            (async () => {
                const result = await gpt4Prompt(
                    `Extract exactly 5 key points from this content. Format as a numbered list:\n\n${truncateToWords(text, 3000)}`,
                    'gpt-4o-mini'
                );
                return result;
            })(),

            // Basic statistical metrics only (6 metrics)
            (async () => {
                const result = await runPythonScript(
                    path.join(__dirname, '..', 'python', 'metrics.py'),
                    text,
                    { FREE_TIER: '1' },  // Enable free tier mode (limited metrics)
                    { timeout: 15000, retries: 2 }
                );
                return result;
            })(),

            // Heuristic AI detection only (no RoBERTa)
            (async () => {
                const result = await runPythonScript(
                    path.join(__dirname, '..', 'python', 'ai_detector.py'),
                    text,
                    { ALLOW_ADVANCED: '0' },  // Disable advanced detection for free tier
                    { timeout: 20000, retries: 2 }
                );
                return result;
            })()
        ]);

        // Process key points (5 for free tier)
        const keyPoints = keyPointsRaw
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.match(/^\d+\.\s+.+/)) // Only lines that start with number + period + space
            .map(line => line.replace(/^\d+\.\s*/, '')) // Remove the numbering
            .filter(point => point.length > 10) // Filter out very short points
            .slice(0, 5) // Take only 5 points for free tier
            .join('\n');
        
        // Build free tier response
        const result = {
            tier: 'free',
            summary: summary,
            keyPoints: keyPoints,
            
            // Only 6 basic metrics
            aiLikelihood: {
                overall: aiDetectionResult?.ai_likelihood || 50,
                scores: {
                    'Burstiness': {
                        percent: metricsResult?.burstiness || 50,
                        na: false,
                        reason: 'Statistical analysis of sentence length variation'
                    },
                    'N-gram Entropy': {
                        percent: metricsResult?.ngram_entropy || 50,
                        na: false,
                        reason: 'Word combination diversity measurement'
                    },
                    'Sentence Length Variance': {
                        percent: metricsResult?.sentence_length_variance || 50,
                        na: false,
                        reason: 'Consistency of sentence lengths'
                    },
                    'Punctuation Pattern Uniformity': {
                        percent: metricsResult?.punctuation_uniformity || 50,
                        na: false,
                        reason: 'Punctuation usage patterns'
                    },
                    'Readability Z-Score': {
                        percent: metricsResult?.readability || 50,
                        na: false,
                        reason: 'Single basic readability metric'
                    },
                    'Character-Level Irregularities': {
                        percent: metricsResult?.character_irregularities || 50,
                        na: false,
                        reason: 'Text character pattern analysis'
                    }
                }
            },
            
            // Basic AI detection
            aiDetection: {
                likelihood: aiDetectionResult?.ai_likelihood || 50,
                confidence: aiDetectionResult?.confidence || 0.7,
                model: 'statistical_heuristics',
                note: 'Free tier uses basic heuristics. Upgrade for 88% accuracy RoBERTa model.'
            },
            
            // No toxicity analysis in free tier
            toxicity: {
                score: null,
                note: 'Upgrade to paid tier for toxicity analysis'
            },
            
            // Metadata
            metadata: {
                tier: 'free',
                url: sanitizedUrl,
                language: language || 'auto',
                wordCount: wordCount,
                estimatedCost: 0.0005,  // Minimal cost for summary only
                processingTime: Date.now() - perfStart,
                limitations: [
                    'Short summary only (50 words)',
                    'Basic heuristic AI detection (70% accuracy)',
                    '5 key points (vs 10 in paid tier)',
                    '6 statistical metrics only',
                    'No toxicity analysis',
                    'No SEO/GEO analysis',
                    'No emotional analysis',
                    'No premium linguistic analysis',
                    'No advanced readability suite'
                ],
                upgradeMessage: 'Upgrade to paid tier for: Full summary + 10 key points, 88% accuracy AI detection, toxicity analysis, SEO/GEO analysis, emotional metrics, 35+ premium metrics'
            },

            // No SEO/GEO Data in free tier (expensive to compute)
            seo: null,
            geo: null,

            // No emotional analysis in free tier (expensive to compute)
            emotional: null
        };

        console.log('[DEBUG] Free tier metricsResult.emotion_details:', metricsResult?.emotion_details);
        console.log('[DEBUG] Free tier emotional analysis assembled:', result.emotional);
        console.log(`[Free Tier] Analysis completed in ${result.metadata.processingTime}ms`);

        // Clean up browser (only if we fetched from URL)
        if (fetchResult && fetchResult.browser) {
            try {
                await fetchResult.browser.close();
                console.log('[Free Tier] Browser closed successfully');
            } catch (closeError) {
                console.error('[Free Tier] Error closing browser:', closeError.message);
            }
        }

        return result;

    } catch (error) {
        console.error('[Free Tier] Analysis failed:', error);
        throw error;
    }
}

/**
 * Paid Tier Analysis (Unlimited)
 * - Full summary + detailed key points
 * - ALL 18 metrics (6 statistical + 12 AI-estimated)
 * - Advanced AI detection (RoBERTa 88% accuracy)
 * - Toxicity analysis
 * - PREMIUM: Perplexity, Advanced Readability (9 scores), Linguistic Complexity, Statistical Fingerprint
 */
async function analyzePaid(url, language = null, options = {}) {
    console.log('[Paid Tier] Starting full analysis with premium metrics...');
    
    const isDirectText = options.isDirectText || false;
    
    // Run full standard analysis
    const standardResult = await summarizeContent(url, language, {
        allowAdvanced: true,  // Enable RoBERTa AI detection
        isDirectText: isDirectText
    });
    
    // Add premium metrics
    try {
        let text;
        if (isDirectText) {
            text = url; // When isDirectText is true, 'url' parameter contains the text
        } else {
            const fetchResult = await fetchTextFromUrl(url);
            text = fetchResult.content || fetchResult;
        }
        const premiumMetrics = await runPythonPremiumMetrics(text);
        
        // Enhance result with premium metrics
        const enhancedResult = {
            ...standardResult,
            tier: 'paid',
            
            // Add premium metrics section
            premiumMetrics: {
                // Perplexity Score (DistilGPT-2)
                perplexity: {
                    score: premiumMetrics.perplexity?.score || premiumMetrics.perplexity || 50,
                    interpretation: premiumMetrics.perplexity > 70
                        ? 'High perplexity - creative/surprising (human-like)'
                        : premiumMetrics.perplexity > 50
                        ? 'Moderate perplexity - somewhat predictable'
                        : 'Low perplexity - highly predictable (AI-like)',
                    note: 'Higher perplexity indicates more surprising, human-like text'
                },
                
                // Advanced Readability Suite (9 metrics)
                readability: {
                    ...premiumMetrics.readability,
                    note: '9 different readability algorithms for comprehensive analysis'
                },
                
                // Linguistic Complexity (NLTK)
                linguistics: {
                    ...premiumMetrics.linguistics,
                    note: 'Part-of-speech tagging, named entities, syntactic complexity'
                },
                
                // Statistical Fingerprint (scipy)
                statistics: {
                    ...premiumMetrics.statistics,
                    note: 'Advanced statistical analysis of writing style patterns'
                },
                
                computeTime: premiumMetrics.computeTime
            },
            
            // Update metadata
            metadata: {
                ...standardResult.metadata,
                tier: 'paid',
                hasPremiumMetrics: true,
                premiumMetricsCount: 4,
                totalMetricsCount: 35,  // 6 statistical + 12 AI-estimated + 1 perplexity + 9 readability + 7 linguistic
                estimatedCost: (standardResult.metadata?.estimatedCost || 0.003) + 0.002  // Add premium compute cost
            }
        };
        
        // Add premium metrics to aiLikelihood.scores for UI display
        if (!enhancedResult.aiLikelihood) {
            enhancedResult.aiLikelihood = { scores: {} };
        }
        if (!enhancedResult.aiLikelihood.scores) {
            enhancedResult.aiLikelihood.scores = {};
        }
        
        // Add Perplexity (already calculated in metrics.py, but premium version is more accurate)
        const perplexityScore = premiumMetrics.perplexity?.score || premiumMetrics.perplexity || 50;
        enhancedResult.aiLikelihood.scores['Perplexity (Premium)'] = {
            percent: Math.round(perplexityScore),
            na: false,
            reason: 'DistilGPT-2 transformer model (82M params)',
            calculationMethod: 'premium'
        };
        
        // Add Readability metrics (9 scores)
        if (premiumMetrics.readability && !premiumMetrics.readability.error) {
            const readabilityMetrics = {
                'Flesch Reading Ease': premiumMetrics.readability.flesch_reading_ease,
                'Flesch-Kincaid Grade': premiumMetrics.readability.flesch_kincaid_grade,
                'Gunning Fog Index': premiumMetrics.readability.gunning_fog,
                'SMOG Index': premiumMetrics.readability.smog_index,
                'Coleman-Liau Index': premiumMetrics.readability.coleman_liau_index,
                'Automated Readability Index': premiumMetrics.readability.automated_readability_index,
                'Dale-Chall Readability': premiumMetrics.readability.dale_chall_readability,
                'Linsear Write Formula': premiumMetrics.readability.linsear_write_formula,
                'Spache Readability': premiumMetrics.readability.spache_readability
            };
            
            Object.entries(readabilityMetrics).forEach(([name, value]) => {
                if (value !== undefined && value !== null) {
                    enhancedResult.aiLikelihood.scores[name] = {
                        percent: Math.round(value),
                        na: false,
                        reason: 'Advanced readability analysis (premium)',
                        calculationMethod: 'premium'
                    };
                }
            });
        }
        
        // Add Linguistic Complexity metrics
        if (premiumMetrics.linguistics && !premiumMetrics.linguistics.error) {
            const linguisticMetrics = {
                'Lexical Diversity': premiumMetrics.linguistics.lexical_diversity,
                'Syntactic Complexity': premiumMetrics.linguistics.syntactic_complexity,
                'POS Tag Distribution': premiumMetrics.linguistics.pos_distribution_entropy,
                'Named Entity Density': premiumMetrics.linguistics.named_entity_density
            };
            
            Object.entries(linguisticMetrics).forEach(([name, value]) => {
                if (value !== undefined && value !== null) {
                    enhancedResult.aiLikelihood.scores[name] = {
                        percent: Math.round(value),
                        na: false,
                        reason: 'NLTK linguistic analysis (premium)',
                        calculationMethod: 'premium'
                    };
                }
            });
        }
        
        // Add Statistical Fingerprint metrics
        if (premiumMetrics.statistics && !premiumMetrics.statistics.error) {
            const statisticalMetrics = {
                'Character-Level Irregularities': premiumMetrics.statistics.character_irregularities,
                'Distribution Skewness': premiumMetrics.statistics.sentence_length_skewness,
                'Distribution Kurtosis': premiumMetrics.statistics.sentence_length_kurtosis,
                'Coefficient of Variation': premiumMetrics.statistics.coefficient_of_variation
            };

            Object.entries(statisticalMetrics).forEach(([name, value]) => {
                if (value !== undefined && value !== null) {
                    enhancedResult.aiLikelihood.scores[name] = {
                        percent: Math.round(value),
                        na: false,
                        reason: 'Statistical distribution analysis (premium)',
                        calculationMethod: 'premium'
                    };
                }
            });
        }

        // ============================================================================
        // RECALCULATE ENSEMBLE SCORE WITH PREMIUM METRICS
        // ============================================================================
        // The standard analysis already calculated ensemble with 7 basic + 12 AI-estimated metrics (19 total)
        // Now we add premium metrics to get the full 20+ metric ensemble for maximum accuracy
        try {
            console.log('[Paid Tier] Recalculating ensemble score with premium metrics...');

            // Get the original metrics from standard analysis
            const originalEnsemble = standardResult.aiLikelihood?.ensembleScore;
            if (!originalEnsemble) {
                console.warn('[Paid Tier] No original ensemble score found, skipping recalculation');
            } else {
                const textLength = text.split(/\s+/).length;

                // Build enhanced raw metrics object combining standard + premium
                const enhancedRawMetrics = {
                    // Basic statistical metrics (from free tier)
                    perplexity: premiumMetrics.perplexity || standardResult.aiLikelihood?.scores?.Perplexity?.percent,
                    burstiness: standardResult.aiLikelihood?.scores?.Burstiness?.percent,
                    sentence_variance: standardResult.aiLikelihood?.scores?.['Sentence Length Variance']?.percent,
                    punctuation_uniformity: standardResult.aiLikelihood?.scores?.['Punctuation Pattern Uniformity']?.percent,
                    ngram_entropy: standardResult.aiLikelihood?.scores?.['N-gram Entropy']?.percent,
                    character_irregularities: standardResult.aiLikelihood?.scores?.['Character-Level Irregularities']?.percent,
                    emotional_variance: standardResult.aiLikelihood?.scores?.['Emotional Variance']?.percent,

                    // Premium linguistic metrics (NLTK)
                    lexical_diversity: premiumMetrics.linguistics?.lexical_diversity ? Math.round(premiumMetrics.linguistics.lexical_diversity * 100) : undefined,
                    noun_verb_ratio: premiumMetrics.linguistics?.noun_verb_ratio ? Math.round(premiumMetrics.linguistics.noun_verb_ratio * 100) : undefined,
                    adj_noun_ratio: premiumMetrics.linguistics?.adj_noun_ratio ? Math.round(premiumMetrics.linguistics.adj_noun_ratio * 100) : undefined,
                    syntactic_complexity: premiumMetrics.linguistics?.syntactic_complexity,

                    // Premium readability metrics (textstat)
                    flesch_reading_ease: premiumMetrics.readability?.flesch_reading_ease,
                    avg_grade_level: premiumMetrics.readability?.consensus_grade_level || premiumMetrics.readability?.average_grade_level,
                    difficult_words_ratio: premiumMetrics.readability?.difficult_words,

                    // Premium statistical metrics (scipy)
                    coefficient_of_variation: premiumMetrics.statistics?.coefficient_of_variation,

                    // AI-estimated metrics (from GPT-4o-mini - already in standard analysis)
                    // These come from the original ensemble calculation
                    'Common Patterns': standardResult.aiLikelihood?.scores?.['Common Patterns']?.percent,
                    'Semantic Consistency': standardResult.aiLikelihood?.scores?.['Semantic Consistency']?.percent,
                    'Paraphrase Robustness': standardResult.aiLikelihood?.scores?.['Paraphrase Robustness']?.percent,
                    'Stopword POS Distribution Skew': standardResult.aiLikelihood?.scores?.['Stopword POS Distribution Skew']?.percent,
                    'Contradiction Consistency': standardResult.aiLikelihood?.scores?.['Contradiction Consistency']?.percent,
                    'Coreference Coherence': standardResult.aiLikelihood?.scores?.['Coreference Coherence']?.percent,
                    'Temporal Consistency': standardResult.aiLikelihood?.scores?.['Temporal Consistency']?.percent,
                    'Round-Trip Translation Stability': standardResult.aiLikelihood?.scores?.['Round-Trip Translation Stability']?.percent,
                    'Order Perturbation Tolerance': standardResult.aiLikelihood?.scores?.['Order Perturbation Tolerance']?.percent,
                    'Boilerplate Frequency': standardResult.aiLikelihood?.scores?.['Boilerplate Frequency']?.percent,
                    'Scaffold Likelihood': standardResult.aiLikelihood?.scores?.['Scaffold Likelihood']?.percent,
                    'Hedging Density': standardResult.aiLikelihood?.scores?.['Hedging Density']?.percent
                };

                // Remove undefined values
                Object.keys(enhancedRawMetrics).forEach(key => {
                    if (enhancedRawMetrics[key] === undefined || enhancedRawMetrics[key] === null) {
                        delete enhancedRawMetrics[key];
                    }
                });

                // Recalculate ensemble with full metrics
                const enhancedEnsembleResult = calculateFullEnsemble(enhancedRawMetrics, textLength);

                console.log(`[Paid Tier] Ensemble recalculated: ${originalEnsemble.metrics_used} metrics → ${enhancedEnsembleResult.metrics_used} metrics`);
                console.log(`[Paid Tier] Ensemble score: ${originalEnsemble.overall_score}% → ${enhancedEnsembleResult.overall_score}%`);

                // Update the ensemble score in the result
                enhancedResult.aiLikelihood.ensembleScore = enhancedEnsembleResult;

                // Add metadata about the enhancement
                enhancedResult.aiLikelihood.ensembleScore.premium_enhancement = {
                    original_metrics_count: originalEnsemble.metrics_used,
                    enhanced_metrics_count: enhancedEnsembleResult.metrics_used,
                    metrics_added: enhancedEnsembleResult.metrics_used - originalEnsemble.metrics_used,
                    original_score: originalEnsemble.overall_score,
                    enhanced_score: enhancedEnsembleResult.overall_score,
                    score_change: enhancedEnsembleResult.overall_score - originalEnsemble.overall_score
                };
            }
        } catch (ensembleError) {
            console.error('[Paid Tier] Failed to recalculate ensemble with premium metrics:', ensembleError);
            // Keep original ensemble score if recalculation fails
        }

        console.log('[Paid Tier] Analysis completed with premium metrics');
        console.log('[Paid Tier] Total metrics in aiLikelihood.scores:', Object.keys(enhancedResult.aiLikelihood.scores).length);
        return enhancedResult;
        
    } catch (error) {
        console.error('[Paid Tier] Premium metrics failed:', error.message);
        
        // Return standard result without premium metrics if they fail
        return {
            ...standardResult,
            tier: 'paid',
            premiumMetrics: {
                error: error.message,
                note: 'Premium metrics calculation failed, returning standard analysis'
            },
            metadata: {
                ...standardResult.metadata,
                tier: 'paid',
                hasPremiumMetrics: false,
                premiumMetricsError: error.message
            }
        };
    }
}

module.exports = {
    summarizeContent,
    deepAnalyze,
    fetchTextFromUrl,
    analyzeTiered,
    analyzeFree,
    analyzePaid,
    gpt4Prompt
};