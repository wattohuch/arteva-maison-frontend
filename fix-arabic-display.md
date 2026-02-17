# Arabic Display Issues - Troubleshooting Guide

## ✅ Fixed Issues

1. **Missing Translation**: Added `status_pending` Arabic translation
2. **Translation Sync**: All 312 keys now have both English and Arabic translations

## Common Causes of Blank/White Elements in Arabic

### 1. Elements Without `data-i18n` Attribute

Some elements might have hardcoded English text without translation attributes.

**Check for:**
- Buttons without `data-i18n`
- Labels without `data-i18n`
- Headings without `data-i18n`

**Solution:** Add `data-i18n="key_name"` to all text elements

### 2. Color Inheritance Issues

White text on white background when switching to RTL.

**Check:**
```css
/* Make sure text colors are explicitly set */
[dir="rtl"] .element {
    color: inherit; /* This might cause issues */
}
```

**Solution:** Set explicit colors for RTL elements

### 3. Font Loading Issues

Arabic fonts might not be loading properly.

**Check:** Browser console for font loading errors

**Solution:** Ensure Arabic-compatible fonts are loaded:
```css
font-family: 'Poppins', 'Arial', sans-serif;
```

### 4. JavaScript Timing Issues

Translations might not be applied before elements are rendered.

**Check:** Console for JavaScript errors

**Solution:** Ensure i18n.js loads before other scripts

## How to Debug

### Step 1: Open Browser Console

1. Go to your Arabic website
2. Press F12 to open Developer Tools
3. Go to Console tab

### Step 2: Check for Errors

Look for:
- `translations[lang][key] is undefined`
- Font loading errors
- JavaScript errors

### Step 3: Inspect Blank Elements

1. Right-click on blank element
2. Select "Inspect"
3. Check:
   - Does it have `data-i18n` attribute?
   - What's the computed color? (should not be white on white)
   - Is the text content empty?

### Step 4: Test Translation Function

In browser console, run:
```javascript
// Check current language
console.log(localStorage.getItem('site_lang'));

// Check if translations exist
console.log(window.translations.ar);

// Test specific key
console.log(window.getTranslation('your_key_here'));
```

## Quick Fixes

### Fix 1: Force Re-translation

Add this to your browser console:
```javascript
setLanguage('ar');
```

### Fix 2: Clear Cache

1. Press Ctrl+Shift+Delete
2. Clear cached images and files
3. Reload page

### Fix 3: Check Specific Elements

If you can tell me which specific elements are blank (e.g., "product names", "buttons", "navigation"), I can provide targeted fixes.

## Testing Checklist

After fixes, test these pages in Arabic:

- [ ] Home page (index.html)
- [ ] Collections page
- [ ] Product page
- [ ] Cart page
- [ ] Checkout page
- [ ] Account page
- [ ] Order tracking page
- [ ] Contact page

## Need More Help?

Please provide:
1. Which page has the issue?
2. Which specific elements are blank?
3. Screenshot if possible
4. Browser console errors (if any)

Then I can provide a targeted fix!
