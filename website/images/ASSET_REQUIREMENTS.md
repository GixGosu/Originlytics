# OriginLytics.com - Image Asset Requirements

## Required Image Assets for Production

This document outlines all image and media assets required for the OriginLytics.com website to be production-ready.

---

## 1. Favicons & Browser Icons

### Favicon (ICO format)
- **Filename**: `favicon.ico`
- **Sizes**: Multi-size ICO containing 16x16, 32x32, 48x48
- **Format**: ICO
- **Purpose**: Browser tab icon
- **Location**: `/favicon.ico` (root directory)

### PNG Favicons
- **Filename**: `favicon-32x32.png`
- **Size**: 32x32 pixels
- **Format**: PNG-8 or PNG-24 with transparency
- **Purpose**: Modern browser favicon

- **Filename**: `favicon-16x16.png`
- **Size**: 16x16 pixels
- **Format**: PNG-8 or PNG-24 with transparency
- **Purpose**: Browser tab icon

### Apple Touch Icon
- **Filename**: `apple-touch-icon.png`
- **Size**: 180x180 pixels
- **Format**: PNG-24
- **Purpose**: iOS home screen icon
- **Design**: No transparency, solid background color
- **Location**: `/apple-touch-icon.png` (root directory)

---

## 2. Social Media Sharing Images

### Open Graph Image (Facebook, LinkedIn)
- **Filename**: `og-image.png`
- **Size**: 1200x630 pixels
- **Format**: PNG or JPG
- **File size**: < 1MB
- **Purpose**: Social media sharing preview
- **Content**:
  - OriginLytics logo
  - Tagline: "AI Content Authenticity & Verification Platform"
  - Key value proposition
  - Professional background
- **Location**: `/og-image.png` (root directory)
- **Referenced in**: `<meta property="og:image">`

### Twitter Card Image
- **Filename**: `twitter-image.png`
- **Size**: 1200x600 pixels (2:1 aspect ratio)
- **Format**: PNG or JPG
- **File size**: < 5MB
- **Purpose**: Twitter card preview
- **Content**: Similar to OG image, optimized for Twitter
- **Location**: `/twitter-image.png` (root directory)
- **Referenced in**: `<meta property="twitter:image">`

---

## 3. Company Branding

### Logo (SVG)
- **Filename**: `logo.svg`
- **Format**: SVG (scalable vector graphics)
- **Purpose**: Main company logo
- **Variants**:
  - Full color version
  - White version (for dark backgrounds)
  - Icon-only version (square)
- **Location**: `/images/logo.svg`
- **Usage**: Header, footer, structured data

### Logo (PNG - Fallback)
- **Filename**: `logo.png`
- **Size**: 512x512 pixels (square) or appropriate dimensions
- **Format**: PNG-24 with transparency
- **Purpose**: Fallback for older browsers
- **Location**: `/images/logo.png`

---

## 4. Feature Section Icons

While the website currently uses SVG icons inline, you may want to create custom illustrations:

### Feature Icons (Optional Enhancement)
- **Count**: 6 icons (one per feature)
- **Size**: 128x128 pixels
- **Format**: SVG preferred, PNG fallback
- **Style**: Consistent with brand guidelines
- **Features**:
  1. AI Detection Algorithm icon
  2. Provenance Tracking icon
  3. Multi-Modal Verification icon
  4. API Integration icon
  5. Analytics Dashboard icon
  6. Security/Compliance icon
- **Location**: `/images/features/`

---

## 5. Screenshots & Product Images

### Hero Section Screenshot (Optional)
- **Filename**: `hero-screenshot.png`
- **Size**: 1400x900 pixels
- **Format**: PNG or JPG (optimized)
- **Purpose**: Product demonstration in hero section
- **Content**: Dashboard or verification interface
- **Location**: `/images/hero-screenshot.png`

### Feature Screenshots
- **Count**: 3-6 screenshots
- **Size**: 800x600 pixels or 1200x800 pixels
- **Format**: JPG (optimized) or WebP
- **Purpose**: Illustrate features and functionality
- **Filenames**:
  - `screenshot-detection.jpg`
  - `screenshot-dashboard.jpg`
  - `screenshot-api.jpg`
  - `screenshot-reports.jpg`
- **Location**: `/images/screenshots/`

### Use Case Images
- **Count**: 4 images (one per use case)
- **Size**: 600x400 pixels
- **Format**: JPG or PNG
- **Purpose**: Visual representation of use cases
- **Location**: `/images/use-cases/`

---

## 6. Customer Logos (Optional)

### Partner/Customer Logos
- **Count**: 6-12 logos
- **Size**: 200x100 pixels (flexible)
- **Format**: PNG with transparency or SVG
- **Purpose**: Trust signals, customer logos
- **Location**: `/images/customers/`
- **Note**: Get permission from customers before displaying

---

## 7. Background Images & Patterns (Optional)

### Hero Background
- **Filename**: `hero-background.jpg` or `hero-pattern.svg`
- **Size**: 1920x1080 pixels (JPG) or scalable (SVG)
- **Format**: JPG (optimized) or SVG pattern
- **Purpose**: Hero section background
- **Location**: `/images/backgrounds/`

---

## 8. Placeholder Images (For Development)

For development/testing purposes, you can use these placeholder services:

- **Unsplash Source**: `https://source.unsplash.com/1200x630/?technology`
- **Placeholder.com**: `https://via.placeholder.com/1200x630`
- **Picsum Photos**: `https://picsum.photos/1200/630`

---

## Image Optimization Guidelines

### Compression
- **PNG**: Use TinyPNG or ImageOptim (aim for 50-80% file size reduction)
- **JPG**: Quality 80-85, progressive encoding
- **WebP**: Provide WebP versions for modern browsers (30-50% smaller)
- **AVIF**: Consider AVIF for even better compression (optional)

### Responsive Images
Provide multiple sizes for responsive designs:
```html
<picture>
  <source srcset="image-large.webp" media="(min-width: 1200px)" type="image/webp">
  <source srcset="image-medium.webp" media="(min-width: 768px)" type="image/webp">
  <source srcset="image-small.webp" media="(min-width: 320px)" type="image/webp">
  <img src="image-fallback.jpg" alt="Description" loading="lazy">
</picture>
```

### Lazy Loading
- Add `loading="lazy"` attribute to all images below the fold
- Preload critical images (hero, logo): `<link rel="preload" as="image" href="/logo.svg">`

### Alt Text
- All images must have descriptive alt text for accessibility
- Decorative images: `alt=""`
- Informative images: Describe content and purpose

---

## Asset Creation Tools

### Recommended Tools
- **Favicon Generator**: https://realfavicongenerator.net/
- **Social Media Images**: Canva, Figma, Adobe Photoshop
- **Image Optimization**: TinyPNG, Squoosh.app, ImageOptim
- **SVG Creation**: Figma, Adobe Illustrator, Inkscape
- **Icon Libraries**: Heroicons, Feather Icons, Font Awesome

---

## Priority Checklist

### Critical (Must-Have for Launch)
- [ ] favicon.ico (16x16, 32x32)
- [ ] favicon-32x32.png
- [ ] favicon-16x16.png
- [ ] apple-touch-icon.png (180x180)
- [ ] og-image.png (1200x630)
- [ ] twitter-image.png (1200x600)
- [ ] logo.svg

### Important (Recommended for Launch)
- [ ] logo.png (fallback)
- [ ] hero-screenshot.png (product demo)
- [ ] 3-6 feature screenshots
- [ ] WebP versions of all raster images

### Optional (Post-Launch Enhancement)
- [ ] Custom feature icons
- [ ] Use case images
- [ ] Customer logos (with permission)
- [ ] Background patterns
- [ ] AVIF image formats

---

## File Naming Convention

- Use lowercase
- Use hyphens (not underscores)
- Be descriptive but concise
- Include dimensions in filename if multiple sizes exist

**Examples:**
- `logo-dark-512x512.png`
- `screenshot-dashboard-1200x800.jpg`
- `icon-feature-detection.svg`

---

## Accessibility Requirements

1. **Alt Text**: All images must have meaningful alt text
2. **Contrast**: Ensure sufficient contrast for text overlays
3. **Focus States**: Clickable images must have visible focus states
4. **Icon Labels**: Icon-only buttons must have aria-labels

---

## Performance Targets

- **Total image weight**: < 500KB for initial page load
- **Individual images**: < 100KB each (after optimization)
- **Use lazy loading**: Images below the fold
- **CDN delivery**: Serve images from CDN (Cloudflare, Vercel, etc.)

---

## Image CDN Configuration

Consider using an image CDN for automatic optimization:

- **Cloudflare Images**: Automatic resizing and format conversion
- **Vercel Image Optimization**: Built-in with Vercel hosting
- **Cloudinary**: Advanced image transformations
- **imgix**: Real-time image processing

---

## Next Steps

1. Create all critical assets using the specifications above
2. Optimize all images using compression tools
3. Upload to `/images/` directory
4. Update HTML references in `index.html`
5. Test all images across different devices and browsers
6. Verify social media previews using:
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator
   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

---

## Support

For questions about image asset requirements, contact the design team or refer to the brand guidelines document.
