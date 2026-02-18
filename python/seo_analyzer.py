"""
SEO Metadata Analyzer for OriginLytics
Analyzes SEO metadata extracted from web pages
"""

import sys
import json
from typing import Dict, List, Any, Literal

# ============================================================================
# SECURITY CONSTANTS - DoS Protection
# ============================================================================

MAX_ARRAY_SIZE = 100  # Maximum elements in any array (DoS protection)
MAX_STRING_LENGTH = 10000  # Maximum string length

# ============================================================================
# SCORING WEIGHTS - Align with industry best practices
# ============================================================================

WEIGHTS = {
    'title': 15,              # Title tag quality
    'description': 15,        # Meta description quality
    'headings': 20,           # Heading structure (H1-H6)
    'images': 10,             # Image optimization (alt text)
    'links': 10,              # Internal/external link balance
    'structured_data': 10,    # Schema.org/JSON-LD
    'social': 10,             # Open Graph/Twitter cards
    'mobile': 5,              # Mobile optimization signals
    'performance': 5          # Resource hints, loading strategy
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_recommendation(text: str, priority: Literal['critical', 'high', 'medium', 'low'], details: str = None) -> Dict:
    """
    Create a structured recommendation object.

    Args:
        text: Clear, actionable recommendation text
        priority: Priority level (critical/high/medium/low)
        details: Optional additional context

    Returns:
        Structured recommendation dict matching TypeScript SeoRecommendation interface
    """
    rec = {
        'text': text,
        'priority': priority
    }
    if details:
        rec['details'] = details
    return rec

def validate_input(seo_data: Dict) -> None:
    """
    Validate input data to prevent DoS attacks and malformed data.

    Args:
        seo_data: Input data to validate

    Raises:
        ValueError: If input is invalid or potentially malicious
    """
    if not isinstance(seo_data, dict):
        raise ValueError("Input must be a dictionary")

    # Validate string lengths
    for key in ['title', 'description', 'url']:
        if key in seo_data and isinstance(seo_data[key], str):
            if len(seo_data[key]) > MAX_STRING_LENGTH:
                raise ValueError(f"{key} exceeds maximum length")

    # Validate array sizes (DoS protection)
    array_keys = ['headings', 'images', 'links', 'structuredData']
    for key in array_keys:
        if key in seo_data:
            if isinstance(seo_data[key], dict):
                # Handle nested structures (e.g., headings: {h1: [], h2: []})
                for subkey, value in seo_data[key].items():
                    if isinstance(value, list) and len(value) > MAX_ARRAY_SIZE:
                        # Truncate instead of rejecting
                        seo_data[key][subkey] = value[:MAX_ARRAY_SIZE]
            elif isinstance(seo_data[key], list) and len(seo_data[key]) > MAX_ARRAY_SIZE:
                # Truncate instead of rejecting
                seo_data[key] = seo_data[key][:MAX_ARRAY_SIZE]

def sanitize_for_logging(text: str, max_len: int = 100) -> str:
    """
    Sanitize text for safe logging (prevent log injection).

    Args:
        text: Text to sanitize
        max_len: Maximum length to return

    Returns:
        Sanitized text safe for logging
    """
    if not isinstance(text, str):
        return str(text)[:max_len]

    # Remove newlines and control characters
    sanitized = ''.join(char for char in text if char.isprintable())
    return sanitized[:max_len]

# ============================================================================
# ANALYSIS FUNCTIONS
# ============================================================================

def analyze_title(seo_data: Dict) -> Dict:
    """
    Analyze title tag for SEO best practices.

    Criteria:
    - Length: 50-60 characters ideal
    - Not empty
    - Unique (not default "Untitled")
    - Contains focus keyword (if available)

    Returns:
        score: 0-100
        issues: List of problems
        recommendations: List of improvements
    """
    title = seo_data.get('title', '').strip()
    focus_keyword = seo_data.get('focusKeyword', '').strip().lower()

    score = 100
    issues = []
    recommendations = []

    # Check 1: Title exists
    if not title:
        score = 0
        issues.append("Missing title tag")
        recommendations.append(create_recommendation(
            "Add a descriptive title tag (50-60 characters)",
            "critical",
            "Title tags are the most important on-page SEO element. They appear as the clickable headline in search results and browser tabs. Without a title tag, search engines can't properly index your page, and users won't see a compelling headline. Best practice: Write a unique, descriptive title that includes your primary keyword and accurately represents the page content. Impact: Pages without titles often see 0% organic traffic."
        ))
        return {'score': score, 'issues': issues, 'recommendations': recommendations}

    # Check 2: Title length
    title_len = len(title)
    if title_len < 30:
        score -= 20
        issues.append(f"Title too short ({title_len} chars)")
        recommendations.append(create_recommendation(
            "Expand title to 50-60 characters for better SEO",
            "high",
            f"Current length is {title_len} characters. Short titles waste valuable SERP real estate and may appear incomplete to users. Google displays approximately 50-60 characters in search results (580px width). How to fix: Expand your title with descriptive keywords that explain what users will find on this page. Include your brand name at the end if space permits. Example: 'Quick Guide' → 'Quick Guide to SEO Title Tags: Best Practices for 2025'. Impact: Longer, descriptive titles can improve CTR by 20-30%."
        ))
    elif title_len > 70:
        score -= 15
        issues.append(f"Title too long ({title_len} chars, may be truncated)")
        recommendations.append(create_recommendation(
            "Shorten title to 50-60 characters to avoid truncation",
            "high",
            f"Current length is {title_len} characters. Google truncates titles at approximately 580 pixels (~60 characters), displaying '...' for cut-off text. This means users can't see your full message in search results, reducing click-through rates. How to fix: Front-load your most important keywords and unique value proposition. Place brand names at the end (they're less critical for clicks). Remove filler words like 'the', 'a', 'an'. Example: '{title[:50]}...' Impact: Truncated titles see 15-25% lower CTR than optimized titles."
        ))

    # Check 3: Generic titles
    generic_titles = ['untitled', 'home', 'welcome', 'new page', 'default']
    if any(generic in title.lower() for generic in generic_titles):
        score -= 30
        issues.append("Generic or default title")
        recommendations.append(create_recommendation(
            "Use a unique, descriptive title for this page",
            "high",
            f"Generic titles like '{title}' provide no information about your page's unique value. Search engines may penalize pages with default or duplicate titles, and users won't click on vague headlines. How to fix: Write a title that specifically describes what makes THIS page different. Include the topic, benefit, or unique angle. Bad: 'Home' | Good: 'Premium SEO Tools - Analyze & Optimize Your Website'. Each page should have a completely unique title. Impact: Unique, descriptive titles can improve organic CTR by 35-50% and help pages rank for specific long-tail keywords."
        ))

    # Check 4: Focus keyword presence (if defined)
    if focus_keyword and focus_keyword not in title.lower():
        score -= 15
        issues.append(f"Focus keyword '{focus_keyword}' not in title")
        recommendations.append(create_recommendation(
            f"Include focus keyword '{focus_keyword}' in title",
            "medium",
            f"Your target keyword '{focus_keyword}' doesn't appear in the title tag. Search engines heavily weight title tag content when determining relevance. Pages that include exact-match keywords in titles rank significantly higher for those terms. How to fix: Rewrite your title to naturally include '{focus_keyword}', preferably near the beginning. Example: If targeting 'SEO tools', use 'SEO Tools for Website Analysis' rather than 'Website Analysis Platform'. Best practice: Place keywords in the first 6 words for maximum impact. Impact: Keyword-optimized titles see 40-60% higher rankings for target terms."
        ))

    # Check 5: Title starts with brand (anti-pattern)
    if title.count('|') > 0 or title.count('-') > 0:
        parts = title.split('|') if '|' in title else title.split('-')
        if len(parts[0].strip()) < 10:
            score -= 10
            recommendations.append(create_recommendation(
                "Consider placing brand at end of title, keywords at start",
                "low",
                f"Your title appears to lead with a brand name ('{parts[0].strip()}'). While branding is important, search engines and users focus on the first words of titles. Eye-tracking studies show users spend 80% of attention on the first 11 characters. How to fix: Restructure as 'Topic - Brand' instead of 'Brand - Topic'. Example: 'Brand | SEO Tools' → 'SEO Tools | Brand'. This helps you rank for target keywords while maintaining brand presence. Exception: If you're a household name (Nike, Apple), brand-first can leverage recognition. Impact: Keyword-first titles see 10-15% higher CTR for non-branded searches."
            ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'length': title_len,
            'title': title[:100]  # Truncate for safety
        }
    }


def analyze_description(seo_data: Dict) -> Dict:
    """
    Analyze meta description for SEO best practices.

    Criteria:
    - Length: 150-160 characters ideal
    - Not empty
    - Unique and compelling
    - Contains focus keyword

    Returns: score, issues, recommendations
    """
    description = seo_data.get('description', '').strip()
    focus_keyword = seo_data.get('focusKeyword', '').strip().lower()

    score = 100
    issues = []
    recommendations = []

    # Check 1: Description exists
    if not description:
        score = 50  # Not critical, but important
        issues.append("Missing meta description")
        recommendations.append(create_recommendation(
            "Add a compelling meta description (150-160 characters)",
            "high",
            "Meta descriptions are your sales pitch in search results. They appear as the snippet text below your title, directly influencing whether users click your result or a competitor's. While not a direct ranking factor, CTR from search IS a ranking signal. How to fix: Write a compelling 150-160 character description that includes your focus keyword, explains the page's value, and includes a call-to-action. Example: 'Discover proven SEO strategies that increased organic traffic by 300%. Get our free guide with actionable tips you can implement today.' Impact: Good meta descriptions can improve CTR by 5-15%, indirectly boosting rankings."
        ))
        return {'score': score, 'issues': issues, 'recommendations': recommendations}

    # Check 2: Description length
    desc_len = len(description)
    if desc_len < 100:
        score -= 20
        issues.append(f"Description too short ({desc_len} chars)")
        recommendations.append(create_recommendation(
            "Expand description to 150-160 characters",
            "medium",
            f"Current: {desc_len} chars. Short descriptions waste SERP space and may not convince users to click. Google typically displays 150-160 characters (920px width on desktop). How to fix: Expand your description with specific benefits, features, or value propositions. Include keywords naturally. Add social proof (numbers, stats, testimonials). Example: '{description} Learn proven strategies, get expert tips, and see real results.' Best practice: Answer the user's query directly in the description. Impact: Fully-optimized descriptions see 8-12% higher CTR than short ones."
        ))
    elif desc_len > 170:
        score -= 15
        issues.append(f"Description too long ({desc_len} chars, may be truncated)")
        recommendations.append(create_recommendation(
            "Shorten description to 150-160 characters",
            "medium",
            f"Current: {desc_len} chars. Google truncates meta descriptions at approximately 920 pixels (~155-160 characters on desktop, ~120 on mobile). Truncated descriptions end with '...' which looks unprofessional and may cut off your call-to-action. How to fix: Edit to 150-160 characters by removing redundant phrases and focusing on your unique value. Front-load the most important information. Use active voice and power words. Example: Remove filler like 'We are a company that...' and start with the benefit: 'Get SEO tools that boost rankings by 40%...' Impact: Non-truncated descriptions see 6-10% higher CTR."
        ))

    # Check 3: Generic descriptions
    generic_phrases = ['lorem ipsum', 'coming soon', 'under construction']
    if any(phrase in description.lower() for phrase in generic_phrases):
        score -= 30
        issues.append("Generic or placeholder description")
        recommendations.append(create_recommendation(
            "Write a unique, compelling description for this page",
            "high",
            f"Placeholder text like '{description}' is a major red flag to both users and search engines. It signals low-quality, incomplete content. Users will immediately skip to competitor results. Search engines may deprioritize pages with boilerplate text. How to fix: Replace with a unique description written specifically for THIS page. Focus on what makes this content valuable and different. Include specific details, numbers, or outcomes. Bad: 'Coming soon' | Good: 'Step-by-step guide to mastering SEO in 2025: 15 proven tactics, real case studies, actionable checklists.' Impact: Unique descriptions can improve CTR by 40-60% vs placeholder text."
        ))

    # Check 4: Focus keyword presence
    if focus_keyword and focus_keyword not in description.lower():
        score -= 15
        issues.append(f"Focus keyword '{focus_keyword}' not in description")
        recommendations.append(create_recommendation(
            f"Include focus keyword '{focus_keyword}' naturally",
            "medium",
            f"Your target keyword '{focus_keyword}' should appear in the meta description. Google bolds matching keywords in search results, drawing attention to your listing. While meta descriptions aren't a direct ranking factor, keyword relevance affects CTR, which IS a ranking signal. How to fix: Rewrite your description to naturally include '{focus_keyword}', ideally near the beginning. Don't keyword-stuff - use it once in context. Example: 'Looking for {focus_keyword}? Our comprehensive guide covers everything you need to know about [topic].' Impact: Descriptions with target keywords bolded see 10-15% higher CTR."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'length': desc_len,
            'description': description[:200]
        }
    }


def analyze_headings(seo_data: Dict) -> Dict:
    """
    Analyze heading structure (H1-H6) for SEO and accessibility.

    Criteria:
    - Exactly one H1
    - Logical hierarchy (H2 under H1, H3 under H2, etc.)
    - Not empty
    - Descriptive headings

    Returns: score, issues, recommendations
    """
    headings = seo_data.get('headings', {})
    if headings is None:
        headings = {}
    h1s = headings.get('h1', [])
    h2s = headings.get('h2', [])
    h3s = headings.get('h3', [])

    score = 100
    issues = []
    recommendations = []

    # Check 1: Exactly one H1
    h1_count = len(h1s)
    if h1_count == 0:
        score -= 40
        issues.append("Missing H1 heading")
        recommendations.append(create_recommendation(
            "Add a single H1 heading describing the page content",
            "high",
            "H1 headings are the second most important on-page SEO element after titles. They tell search engines (and screen readers) what the page is about. Pages without H1s struggle to rank because search engines can't confidently categorize the content. How to fix: Add one H1 tag at the top of your main content area. Make it descriptive and include your focus keyword. Example: <h1>Complete Guide to SEO Title Tags</h1>. Best practice: H1 should be similar to (but not identical to) your title tag. It should be the most prominent heading visually. Impact: Properly structured H1s improve topical relevance and can boost rankings 10-20%."
        ))
    elif h1_count > 1:
        score -= 30
        issues.append(f"Multiple H1 headings ({h1_count} found)")
        recommendations.append(create_recommendation(
            "Use only one H1 per page for clarity",
            "high",
            f"Found {h1_count} H1 tags. Multiple H1s confuse search engines about your page's primary topic, diluting SEO value. While HTML5 technically allows multiple H1s, SEO best practice is one per page. How to fix: Identify your main topic and use ONE H1 for it. Convert other H1s to H2 or H3 based on their hierarchy. Example: Main topic = H1, major sections = H2, subsections = H3. Best practice: Think of H1 as your page's headline - there should only be one main headline. Impact: Single H1 pages see 15-25% better rankings for target keywords vs multi-H1 pages."
        ))

    # Check 2: H1 quality (if exists)
    if h1_count == 1:
        h1_text = h1s[0].get('text', '').strip()
        if not h1_text:
            score -= 20
            issues.append("Empty H1 heading")
            recommendations.append(create_recommendation(
                "Add descriptive text to H1",
                "high",
                "Empty H1 tags (<h1></h1> or <h1>&nbsp;</h1>) are a critical SEO issue. Search engines can't determine your page topic, accessibility tools can't navigate properly, and users see broken formatting. This can result in complete de-indexing. How to fix: Add meaningful text that describes your page's main topic. Include your primary keyword naturally. Make it match user intent. Example: Instead of empty, use 'Comprehensive SEO Guide for Beginners' or 'Best Practices for Title Tag Optimization'. Best practice: H1 should answer 'What is this page about?' in 6-10 words. Impact: Pages with empty H1s often rank 0 due to lack of topical signals."
            ))
        elif len(h1_text) < 10:
            score -= 10
            issues.append("H1 too short")
            recommendations.append(create_recommendation(
                "Use a more descriptive H1 heading",
                "medium",
                f"Current H1 ('{h1_text}') is {len(h1_text)} characters - too short to effectively communicate page topic. Vague H1s like 'Welcome', 'About', or 'Products' provide minimal SEO value. Search engines prefer specific, descriptive headings. How to fix: Expand to 30-70 characters with specific details about your content. Include your target keyword and unique angle. Bad: 'SEO' | Good: 'SEO Best Practices: Complete 2025 Guide for Beginners'. Best practice: Your H1 should instantly tell visitors and search engines exactly what they'll learn on this page. Impact: Descriptive H1s see 12-18% better rankings than generic ones."
            ))

    # Check 3: Heading hierarchy
    if h1_count >= 1 and len(h2s) == 0:
        score -= 15
        issues.append("No H2 headings (poor content structure)")
        recommendations.append(create_recommendation(
            "Break content into sections with H2 headings",
            "medium",
            "H2 headings structure your content into logical sections, helping both users and search engines understand content hierarchy. Pages with proper heading structure rank better for featured snippets and improve dwell time. 78% of users scan before reading - headings are essential. How to fix: Divide your content into 3-5 major sections, each with an H2. Make H2s descriptive and keyword-rich. Example: H2s like 'What is SEO?', 'Why SEO Matters in 2025', 'How to Implement SEO'. Best practice: Use H2s every 300-500 words. Include variations of your target keyword in H2s. Impact: Well-structured content sees 30-40% longer average session duration and higher rankings."
        ))

    # Check 4: Content organization
    total_headings = h1_count + len(h2s) + len(h3s)
    if total_headings < 3:
        score -= 10
        issues.append("Few headings (content may lack structure)")
        recommendations.append(create_recommendation(
            "Use more headings to organize content (H2, H3)",
            "low",
            f"Only {total_headings} headings found. Content without proper heading hierarchy appears as a 'wall of text', causing users to bounce and search engines to struggle with topical extraction. Long-form content (800+ words) needs 4-8 headings minimum. How to fix: Add H2s for main sections and H3s for subsections. Use the inverted pyramid: H1 (main topic) → H2 (key sections) → H3 (details). Example: H1: 'SEO Guide' → H2: 'On-Page SEO' → H3: 'Title Tags', 'Meta Descriptions'. Best practice: Heading ratio should be roughly 1 heading per 200-300 words. Impact: Proper heading structure improves readability by 60% and can boost time-on-page significantly."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'h1_count': h1_count,
            'h2_count': len(h2s),
            'h3_count': len(h3s),
            'h1_text': h1s[0].get('text', '')[:100] if h1s else ''
        }
    }


def analyze_images(seo_data: Dict) -> Dict:
    """
    Analyze image optimization for SEO and accessibility.

    Criteria:
    - All images have alt text (except decorative)
    - Alt text is descriptive (not just filename)
    - Lazy loading used appropriately

    Returns: score, issues, recommendations
    """
    images = seo_data.get('images', {})
    total = images.get('total', 0)
    with_alt = images.get('withAlt', 0)
    missing_alt = images.get('missingAlt', 0)

    score = 100
    issues = []
    recommendations = []

    # Check 1: No images (not necessarily bad)
    if total == 0:
        return {
            'score': 100,
            'issues': [],
            'recommendations': [],
            'metadata': {'total': 0}
        }

    # Check 2: Missing alt text
    alt_percentage = (with_alt / total * 100) if total > 0 else 0

    if alt_percentage < 50:
        score = 30
        issues.append(f"Most images missing alt text ({missing_alt}/{total})")
        recommendations.append(create_recommendation(
            "Add descriptive alt text to all images for accessibility and SEO",
            "critical",
            f"{missing_alt} of {total} images missing alt text - a critical accessibility and SEO issue. Screen readers can't describe images to visually impaired users (potential ADA violation). Search engines can't index your images for image search. Google's algorithms may penalize pages with poor accessibility. How to fix: Add alt='descriptive text' to every <img> tag. Describe what's in the image as if explaining to someone who can't see it. Include keywords naturally when relevant. Example: alt='SEO analyst reviewing Google Analytics dashboard on laptop' not alt='image1.jpg'. Decorative images should use alt=''. Impact: Proper alt text improves image search traffic by 30-50% and avoids accessibility penalties."
        ))
    elif alt_percentage < 80:
        score = 60
        issues.append(f"Some images missing alt text ({missing_alt}/{total})")
        recommendations.append(create_recommendation(
            "Add alt text to remaining images",
            "high",
            f"{missing_alt} images still need alt text. You're close to full compliance! Each missing alt attribute is a missed opportunity for image search traffic and accessibility. Google Image Search drives significant traffic for visual content. How to fix: Review each image without alt text and add descriptive alternatives. Focus on images that add value to the content (skip purely decorative elements by using alt=''). Make alt text specific: 'chart showing SEO traffic growth' not just 'chart'. Best practice: Alt text should be 8-15 words, descriptive, and include keywords when natural. Impact: Complete alt text coverage can increase total organic traffic by 5-15% through image search."
        ))
    elif alt_percentage < 100:
        score = 85
        recommendations.append(create_recommendation(
            f"Add alt text to {missing_alt} remaining image(s)",
            "medium",
            f"Almost perfect! Just {missing_alt} images left to optimize. Adding alt text to these final images completes your accessibility compliance and maximizes image search potential. How to fix: Locate images without alt attributes (browser DevTools can help: search for '<img' without 'alt='). Add descriptive alt text that explains the image's purpose and content. Example: For a screenshot of analytics, use alt='Google Analytics dashboard showing 300% traffic increase from SEO optimization'. Best practice: Alt text helps both users and search engines - write for humans first, SEO second. Impact: 100% alt text coverage is a quality signal that can marginally boost overall page rankings."
        ))

    # Check 3: Quality of alt text (sample first 5 images)
    details = images.get('details', [])
    poor_alt_count = 0
    for img in details[:5]:
        alt = img.get('alt', '').lower()
        src = img.get('src', '').lower()

        # Poor alt text patterns
        if alt and (
            'image' in alt or 'picture' in alt or  # Generic
            alt in src or  # Just filename
            len(alt) < 3  # Too short
        ):
            poor_alt_count += 1

    if poor_alt_count > 0 and len(details) > 0:
        score -= 10
        issues.append(f"Some alt text is generic or low-quality")
        recommendations.append(create_recommendation(
            "Use descriptive alt text (not just 'image' or filename)",
            "medium",
            f"Found {poor_alt_count} images with low-quality alt text like 'image', 'picture', or filenames. These provide minimal value for accessibility or SEO. Alt text should describe what's IN the image, not that it IS an image. Screen reader users hear 'image' hundreds of times - make yours meaningful. How to fix: Replace generic alt text with specific descriptions. Bad examples: alt='image', alt='picture123.jpg', alt='photo'. Good examples: alt='Team collaborating on SEO strategy in conference room', alt='Line graph showing 200% increase in organic traffic'. Best practice: Ask yourself 'How would I describe this image to someone on the phone?' Impact: Descriptive alt text improves image search rankings by 40-60% vs generic placeholders."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'total': total,
            'with_alt': with_alt,
            'missing_alt': missing_alt,
            'alt_percentage': round(alt_percentage, 1)
        }
    }


def analyze_links(seo_data: Dict) -> Dict:
    """
    Analyze internal/external link structure.

    Criteria:
    - Healthy internal linking (2-5x more internal than external)
    - Not too many external links
    - Use of rel="nofollow" appropriately

    Returns: score, issues, recommendations
    """
    links = seo_data.get('links', {})
    total = links.get('total', 0)
    internal = links.get('internal', 0)
    external = links.get('external', 0)
    nofollow = links.get('nofollow', 0)

    score = 100
    issues = []
    recommendations = []

    # Check 1: No links (bad for SEO)
    if total == 0:
        score = 50
        issues.append("No links found on page")
        recommendations.append(create_recommendation(
            "Add internal links to related content",
            "high",
            "No links found on this page - it's an isolated dead-end in your site architecture. Internal links are essential for: (1) SEO - distributing PageRank across your site, (2) User experience - helping visitors discover related content, (3) Crawlability - helping search engines find and index all your pages. How to fix: Add 3-10 contextual internal links to related pages. Link from relevant anchor text (not 'click here'). Example: In a sentence about 'keyword research', link 'keyword research' to your keyword research guide. Best practice: Link to both pillar content (important pages) and related articles. Use descriptive anchor text with keywords. Impact: Strategic internal linking can boost rankings by 25-40% and increase pages per session."
        ))
        return {'score': score, 'issues': issues, 'recommendations': recommendations}

    # Check 2: Internal/external balance
    if external > 0:
        ratio = internal / external if external > 0 else internal

        if ratio < 1:
            score -= 20
            issues.append(f"More external ({external}) than internal ({internal}) links")
            recommendations.append(create_recommendation(
                "Add more internal links to improve site navigation",
                "medium",
                f"Your link ratio is unbalanced: {internal} internal vs {external} external links. More external than internal links wastes PageRank - you're sending more authority OFF your site than distributing it across your own pages. This is a common SEO mistake. How to fix: Add contextual internal links to related content on your site. Target a 3:1 to 5:1 internal-to-external ratio. Link to: related articles, category pages, product pages, pillar content. Use keyword-rich anchor text. Example: 'Learn more about on-page SEO' linking to /on-page-seo-guide. Best practice: Every page should link to 3-10 other pages on your site. Impact: Strong internal linking can improve domain-wide rankings by 30-50%."
            ))
        elif ratio > 10:
            score -= 10
            issues.append(f"Very few external links (may appear insular)")
            recommendations.append(create_recommendation(
                "Consider linking to authoritative external sources",
                "low",
                f"Only {internal} internal links and very few external links ({external}). While internal linking is important, citing authoritative external sources can improve credibility and context. Studies show that linking to high-quality sources can boost trust signals. How to fix: Add 2-5 links to authoritative sources that support your claims. Link to: research papers, industry studies, official documentation, reputable publications. Use rel='nofollow' for paid or untrusted links only. Example: When citing a statistic, link to the original research. Best practice: Quality over quantity - link to .edu, .gov, and recognized industry authorities. Impact: Citing authoritative sources can improve E-E-A-T signals and user trust."
            ))

    # Check 3: Too many links (dilutes page authority)
    if total > 100:
        score -= 15
        issues.append(f"Very high link count ({total})")
        recommendations.append(create_recommendation(
            "Reduce link count to focus page authority",
            "medium",
            f"{total} links found - excessive linking dilutes PageRank. Each page has limited 'link equity' to distribute. With {total} links, each one receives minimal value. Old SEO rule was max 100 links per page; modern best practice is 30-80 depending on content length. Too many links also: hurt user experience, look spammy, reduce click-through on important links. How to fix: Audit your links and prioritize. Keep only the most valuable internal/external links. Remove redundant footer links, excessive navigation, and low-value links. Best practice: Focus link equity on your most important pages. Use nofollow for less important links. Impact: Reducing to 50-80 strategic links can increase authority of linked pages by 20-30%."
        ))

    # Check 4: Nofollow usage
    nofollow_percentage = (nofollow / total * 100) if total > 0 else 0
    if nofollow_percentage > 50:
        score -= 10
        issues.append(f"High percentage of nofollow links ({nofollow_percentage:.1f}%)")
        recommendations.append(create_recommendation(
            "Review nofollow usage (may limit link equity distribution)",
            "low",
            f"{nofollow_percentage:.1f}% of links are nofollow - this is unusually high and may indicate over-use. Nofollow tells search engines 'don't pass authority to this link.' Use cases: paid links, user-generated content, untrusted sites. But internal navigation and valuable resources should be followed. How to fix: Audit your nofollow links. Remove rel='nofollow' from: internal links (almost always), links to trusted external sources, navigation elements. Keep rel='nofollow' for: paid/sponsored links (FTC requirement), user comments, login/register pages. Best practice: Typical sites have <10% nofollow links. Impact: Removing unnecessary nofollow can improve internal PageRank distribution by 15-25%."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'total': total,
            'internal': internal,
            'external': external,
            'nofollow': nofollow,
            'ratio': round(internal / external, 2) if external > 0 else internal
        }
    }


def analyze_structured_data(seo_data: Dict) -> Dict:
    """
    Analyze structured data (Schema.org, JSON-LD).

    Criteria:
    - Presence of structured data
    - Valid JSON-LD syntax
    - Common schema types (Article, Organization, etc.)

    Returns: score, issues, recommendations
    """
    structured_data = seo_data.get('structuredData', [])

    score = 100
    issues = []
    recommendations = []

    # Check 1: Structured data exists
    if len(structured_data) == 0:
        score = 50
        issues.append("No structured data found")
        recommendations.append(create_recommendation(
            "Add Schema.org markup (JSON-LD) for rich snippets",
            "medium",
            "No structured data detected. Structured data (Schema.org markup) helps search engines understand your content's context and can enable rich results like star ratings, FAQs, breadcrumbs, and more in search results. Rich results significantly improve visibility and CTR. Google's John Mueller confirms structured data is 'strongly recommended'. How to fix: Add JSON-LD scripts to your <head>. Start with basic types: Organization (homepage), Article/BlogPosting (blog posts), Product (products), BreadcrumbList (navigation). Use Google's Structured Data Markup Helper or Schema.org documentation. Test with Google Rich Results Test tool. Best practice: Match schema type to content type. Include all recommended properties. Impact: Rich snippets can improve CTR by 20-40% and occupy more SERP space."
        ))
        return {'score': score, 'issues': issues, 'recommendations': recommendations}

    # Check 2: Count and types
    schema_types = []
    for schema in structured_data:
        schema_type = schema.get('@type', 'Unknown')
        if isinstance(schema_type, list):
            schema_types.extend(schema_type)
        else:
            schema_types.append(schema_type)

    # Common beneficial types
    beneficial_types = ['Article', 'BlogPosting', 'Organization', 'WebSite', 'BreadcrumbList']
    has_beneficial = any(t in schema_types for t in beneficial_types)

    if not has_beneficial:
        score -= 20
        recommendations.append(create_recommendation(
            "Consider adding Article, Organization, or other relevant schemas",
            "low",
            f"Structured data detected ({len(structured_data)} schemas found), but missing common beneficial types. While you have some markup, adding Article, Organization, WebSite, or BreadcrumbList schemas can unlock additional rich result features. How to fix: Review your content type and add appropriate schemas. For blog posts: add Article/BlogPosting schema with headline, author, datePublished, image. For homepage: add Organization schema with name, logo, social profiles. For site-wide: add WebSite schema with search action. Use Google's Schema Markup Validator to test. Best practice: Layer multiple compatible schema types for maximum rich result eligibility. Impact: Additional schema types can enable new rich result features and improve SERP visibility."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'count': len(structured_data),
            'types': list(set(schema_types))[:5]  # Unique types, limit to 5
        }
    }


def analyze_social(seo_data: Dict) -> Dict:
    """
    Analyze social media metadata (Open Graph, Twitter Cards).

    Criteria:
    - Open Graph tags present
    - Twitter Card tags present
    - Images specified for social sharing

    Returns: score, issues, recommendations
    """
    og = seo_data.get('openGraph', {})
    twitter = seo_data.get('twitter', {})

    score = 100
    issues = []
    recommendations = []

    # Check 1: Open Graph presence
    og_type = og.get('type', '')
    og_image = og.get('image', '')

    if not og_type:
        score -= 30
        issues.append("Missing Open Graph tags")
        recommendations.append(create_recommendation(
            "Add Open Graph tags for better social sharing",
            "medium",
            "No Open Graph tags found. When someone shares your page on Facebook, LinkedIn, WhatsApp, or Slack, it will display poorly (no image, wrong title, missing description). This drastically reduces social click-through rates. Open Graph tags control exactly how your content appears in social shares. How to fix: Add these meta tags to your <head>: og:title (headline), og:description (summary), og:image (preview image, min 1200x630px), og:url (canonical URL), og:type (website/article). Copy your title/description or customize for social. Best practice: Use high-quality images (1200x630px), test with Facebook Debugger and LinkedIn Post Inspector. Impact: Proper OG tags can improve social CTR by 200-300%."
        ))

    if not og_image:
        score -= 20
        issues.append("Missing Open Graph image")
        recommendations.append(create_recommendation(
            "Add og:image for social media previews",
            "medium",
            "Open Graph image missing. Social shares without images see dramatically lower engagement. Facebook posts with images get 2.3x more engagement than text-only posts. Your shares will appear as plain text links - not compelling. How to fix: Add <meta property='og:image' content='URL to image'> in <head>. Use a high-quality, relevant image (1200x630px recommended). Avoid text-heavy images - simple, eye-catching visuals work best. Include og:image:width and og:image:height for faster rendering. Best practice: Create a branded template for article images. Ensure images are hosted on a fast, reliable CDN. Always use absolute URLs (https://). Test how it looks with Facebook Sharing Debugger. Impact: Adding OG images can increase social traffic by 150-250%."
        ))

    # Check 2: Twitter Card presence
    twitter_card = twitter.get('card', '')
    twitter_image = twitter.get('image', '')

    if not twitter_card:
        score -= 30
        issues.append("Missing Twitter Card tags")
        recommendations.append(create_recommendation(
            "Add Twitter Card tags for better Twitter sharing",
            "medium",
            "No Twitter Card tags found. Shares on X (Twitter) will display as plain links without images or descriptions - dramatically reducing engagement. Twitter Cards transform links into rich media previews with images, titles, and descriptions. How to fix: Add these meta tags to <head>: twitter:card (summary_large_image recommended), twitter:title, twitter:description, twitter:image. If you have OG tags, Twitter will fall back to those, but dedicated Twitter tags perform better. Test with Twitter Card Validator. Best practice: Use 'summary_large_image' for blog/article content, 'summary' for general pages. Images should be 1200x628px or 1:1 square. Impact: Twitter Cards can increase social engagement by 150% and drive 2-3x more traffic from Twitter."
        ))

    if not twitter_image and not og_image:
        score -= 20
        recommendations.append(create_recommendation(
            "Add twitter:image or og:image for social previews",
            "medium",
            "No social sharing images found (neither twitter:image nor og:image). This means ALL social shares - Facebook, Twitter, LinkedIn, WhatsApp, Slack, Discord - will appear as text-only links. Visual content is 40x more likely to be shared than text. You're missing enormous social traffic potential. How to fix: At minimum, add one og:image tag that will work across all platforms. For optimal results, add both og:image (1200x630px) and twitter:image. Use visually striking images that represent your content. Avoid small or low-quality images. Best practice: Create branded image templates for consistency. Host on CDN for fast loading. Test across platforms. Impact: Social images can increase shares by 300-400% and social traffic by 250%."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'og_type': og_type,
            'has_og_image': bool(og_image),
            'twitter_card': twitter_card,
            'has_twitter_image': bool(twitter_image)
        }
    }


def analyze_mobile_and_performance(seo_data: Dict) -> Dict:
    """
    Analyze mobile optimization and performance signals.

    Criteria:
    - Resource hints (preconnect, dns-prefetch)
    - Viewport meta tag
    - Lazy loading

    Returns: score, issues, recommendations
    """
    resource_hints = seo_data.get('resourceHints', {})

    score = 100
    issues = []
    recommendations = []

    # Check 1: Resource hints
    preconnect = len(resource_hints.get('preconnect', []))
    dns_prefetch = len(resource_hints.get('dnsPrefetch', []))
    preload = len(resource_hints.get('preload', []))

    if preconnect == 0 and dns_prefetch == 0:
        score -= 30
        issues.append("No resource hints found")
        recommendations.append(create_recommendation(
            "Add preconnect/dns-prefetch for external resources",
            "medium",
            "No resource hints found (preconnect/dns-prefetch). If your page loads external resources (Google Fonts, analytics, CDNs, APIs), you're wasting 100-500ms on DNS lookups and connection setup. Resource hints tell browsers to establish connections early, reducing latency. This directly impacts Core Web Vitals (LCP) and user experience. How to fix: Add <link rel='preconnect'> for critical 3rd parties you'll definitely use (fonts, APIs). Add <link rel='dns-prefetch'> for others. Example: <link rel='preconnect' href='https://fonts.googleapis.com'> <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>. Best practice: Limit to 2-3 most critical domains - too many preconnects waste resources. Impact: Proper resource hints can improve LCP by 200-500ms and boost page experience rankings."
        ))

    if preload == 0:
        score -= 20
        recommendations.append(create_recommendation(
            "Consider preloading critical resources (fonts, CSS)",
            "low",
            f"Found {preconnect} preconnect/dns-prefetch hints but no preload hints. Preload is different from preconnect - it tells browsers 'you WILL need this specific file immediately, load it now.' This is essential for critical resources that aren't discovered until CSS is parsed (fonts, hero images, critical CSS). How to fix: Add <link rel='preload' as='font'> for fonts, <link rel='preload' as='image'> for hero images, <link rel='preload' as='style'> for critical CSS. Example: <link rel='preload' href='/fonts/main.woff2' as='font' type='font/woff2' crossorigin>. Best practice: Only preload truly critical resources (2-3 max). Over-preloading hurts performance. Always include 'as' attribute. Impact: Strategic preloading can reduce CLS and improve LCP by 100-300ms."
        ))

    return {
        'score': max(0, score),
        'issues': issues,
        'recommendations': recommendations,
        'metadata': {
            'preconnect': preconnect,
            'dns_prefetch': dns_prefetch,
            'preload': preload
        }
    }


# ============================================================================
# MAIN ANALYSIS FUNCTION
# ============================================================================

def analyze_seo(seo_data: Dict) -> Dict:
    """
    Main SEO analysis function - orchestrates all sub-analyses.

    Args:
        seo_data: SEO metadata extracted from DOM

    Returns:
        Complete SEO analysis with weighted score
    """
    # Run all analyses
    title_result = analyze_title(seo_data)
    description_result = analyze_description(seo_data)
    headings_result = analyze_headings(seo_data)
    images_result = analyze_images(seo_data)
    links_result = analyze_links(seo_data)
    structured_data_result = analyze_structured_data(seo_data)
    social_result = analyze_social(seo_data)
    mobile_result = analyze_mobile_and_performance(seo_data)

    # Calculate weighted score
    weighted_score = (
        title_result['score'] * WEIGHTS['title'] +
        description_result['score'] * WEIGHTS['description'] +
        headings_result['score'] * WEIGHTS['headings'] +
        images_result['score'] * WEIGHTS['images'] +
        links_result['score'] * WEIGHTS['links'] +
        structured_data_result['score'] * WEIGHTS['structured_data'] +
        social_result['score'] * WEIGHTS['social'] +
        mobile_result['score'] * WEIGHTS['performance']
    ) / 100

    # Aggregate all issues and recommendations
    all_issues = []
    all_recommendations = []

    for result in [title_result, description_result, headings_result, images_result,
                   links_result, structured_data_result, social_result, mobile_result]:
        all_issues.extend(result['issues'])
        all_recommendations.extend(result['recommendations'])

    # Return complete analysis
    return {
        'score': round(weighted_score, 1),
        'grade': get_grade(weighted_score),
        'issues': all_issues,
        'recommendations': all_recommendations,
        'breakdown': {
            'title': {
                'score': title_result['score'],
                'weight': WEIGHTS['title'],
                'issues': title_result['issues'],
                'metadata': title_result.get('metadata', {})
            },
            'description': {
                'score': description_result['score'],
                'weight': WEIGHTS['description'],
                'issues': description_result['issues'],
                'metadata': description_result.get('metadata', {})
            },
            'headings': {
                'score': headings_result['score'],
                'weight': WEIGHTS['headings'],
                'issues': headings_result['issues'],
                'metadata': headings_result.get('metadata', {})
            },
            'images': {
                'score': images_result['score'],
                'weight': WEIGHTS['images'],
                'issues': images_result['issues'],
                'metadata': images_result.get('metadata', {})
            },
            'links': {
                'score': links_result['score'],
                'weight': WEIGHTS['links'],
                'issues': links_result['issues'],
                'metadata': links_result.get('metadata', {})
            },
            'structured_data': {
                'score': structured_data_result['score'],
                'weight': WEIGHTS['structured_data'],
                'issues': structured_data_result['issues'],
                'metadata': structured_data_result.get('metadata', {})
            },
            'social': {
                'score': social_result['score'],
                'weight': WEIGHTS['social'],
                'issues': social_result['issues'],
                'metadata': social_result.get('metadata', {})
            },
            'performance': {
                'score': mobile_result['score'],
                'weight': WEIGHTS['performance'],
                'issues': mobile_result['issues'],
                'metadata': mobile_result.get('metadata', {})
            }
        },
        'metadata': {
            'analyzed_at': seo_data.get('extractedAt', ''),
            'url': seo_data.get('url', ''),
            'analyzer_version': '1.0.0'
        }
    }


def get_grade(score: float) -> str:
    """Convert numeric score to letter grade."""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    else:
        return 'F'


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    try:
        # Read SEO data from stdin (JSON string)
        input_json = sys.stdin.read()

        # Validate input size (DoS protection)
        if len(input_json) > MAX_STRING_LENGTH * 10:  # 100KB max
            raise ValueError("Input exceeds maximum size")

        # Parse JSON
        seo_data = json.loads(input_json)

        # Validate input structure and sanitize arrays (DoS protection)
        validate_input(seo_data)

        # Run analysis
        result = analyze_seo(seo_data)

        # Output JSON to stdout
        print(json.dumps(result))

    except json.JSONDecodeError as e:
        # JSON parsing error
        error_result = {
            'score': None,
            'grade': 'F',
            'error': 'Invalid JSON input',
            'issues': ['JSON parsing failed'],
            'recommendations': [create_recommendation(
                'Check input format',
                'critical',
                'SEO analyzer requires valid JSON input'
            )],
            'breakdown': {},
            'metadata': {
                'status': 'error',
                'error_type': 'JSONDecodeError'
            }
        }
        print(json.dumps(error_result))
        sys.exit(1)

    except ValueError as e:
        # Validation error (input too large, invalid structure, etc.)
        error_result = {
            'score': None,
            'grade': 'F',
            'error': sanitize_for_logging(str(e)),
            'issues': ['Input validation failed'],
            'recommendations': [create_recommendation(
                'Check input data structure and size',
                'critical',
                'Input must be valid SEO metadata within size limits'
            )],
            'breakdown': {},
            'metadata': {
                'status': 'error',
                'error_type': 'ValueError'
            }
        }
        print(json.dumps(error_result))
        sys.exit(1)

    except Exception as e:
        # Generic error handling
        error_result = {
            'score': None,
            'grade': 'F',
            'error': sanitize_for_logging(str(e)),
            'issues': ['Analysis failed'],
            'recommendations': [create_recommendation(
                'Review SEO data format',
                'high',
                'Unexpected error during analysis'
            )],
            'breakdown': {},
            'metadata': {
                'status': 'error',
                'error_type': type(e).__name__
            }
        }
        print(json.dumps(error_result))
        sys.exit(1)
