const fs = require('fs');

// Read the i18n file
const content = fs.readFileSync('assets/js/i18n.js', 'utf8');

// Extract translations object
const translationsMatch = content.match(/const translations = ({[\s\S]*?});/);
if (!translationsMatch) {
    console.error('Could not find translations object');
    process.exit(1);
}

// Parse the translations
const translations = eval('(' + translationsMatch[1] + ')');

const enKeys = Object.keys(translations.en).sort();
const arKeys = Object.keys(translations.ar).sort();

console.log('Total English keys:', enKeys.length);
console.log('Total Arabic keys:', arKeys.length);
console.log('');

// Find missing Arabic translations
const missing = enKeys.filter(k => !arKeys.includes(k));
if (missing.length > 0) {
    console.log('❌ Missing Arabic translations (' + missing.length + '):');
    missing.forEach(key => {
        console.log('  -', key, ':', translations.en[key]);
    });
} else {
    console.log('✅ All English keys have Arabic translations');
}

console.log('');

// Find extra Arabic keys (not in English)
const extra = arKeys.filter(k => !enKeys.includes(k));
if (extra.length > 0) {
    console.log('⚠️  Extra Arabic keys not in English (' + extra.length + '):');
    extra.forEach(key => {
        console.log('  -', key);
    });
}

// Check for empty values
console.log('');
console.log('Checking for empty values...');
const emptyAr = arKeys.filter(k => !translations.ar[k] || translations.ar[k].trim() === '');
if (emptyAr.length > 0) {
    console.log('❌ Empty Arabic values (' + emptyAr.length + '):');
    emptyAr.forEach(key => {
        console.log('  -', key);
    });
} else {
    console.log('✅ No empty Arabic values');
}
