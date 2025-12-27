const fs = require('fs');
const path = require('path');

// Extract all translation keys with context
const translationCalls = [];

// Pattern to match t('key') or t("key")
const pattern = /t\(["']([a-zA-Z0-9_.]+)["']\)/g;

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      // Skip node_modules
      if (file === 'node_modules') continue;
      walkDir(filepath);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
          const linePattern = /t\(["']([a-zA-Z0-9_.]+)["']\)/g;
          let match;
          while ((match = linePattern.exec(line)) !== null) {
            translationCalls.push({
              key: match[1],
              file: filepath,
              line: i + 1,
              context: line.trim()
            });
          }
        });
      } catch (error) {
        // Silently skip files with errors
      }
    }
  }
}

walkDir('src');

// Load the translation file
const uzFilePath = path.join('src', 'i18n', 'locales', 'uz.json');
const uzTranslations = JSON.parse(fs.readFileSync(uzFilePath, 'utf-8'));

// Function to check if key exists in translations
function keyExistsInTranslations(key, transDict) {
  const parts = key.split('.');
  let current = transDict;

  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return true;
}

// Categorize false positives (keys that are obviously not translation keys)
const falsePositivePatterns = [
  /^[a-z]$/,  // Single character
  /^\d+[a-z]?$/,  // Numbers
  /^(id|accessToken|refreshToken|canvas|a|T)$/,  // Common JS variables
  /^\./  // Starts with dot
];

function isFalsePositive(key) {
  return falsePositivePatterns.some(pattern => pattern.test(key));
}

// Find real missing keys
console.log('\nAnalyzing translation keys from source code...\n');
const missingTranslationKeys = {};

for (const call of translationCalls) {
  const key = call.key;

  // Skip false positives
  if (isFalsePositive(key)) {
    continue;
  }

  if (!keyExistsInTranslations(key, uzTranslations)) {
    if (!(key in missingTranslationKeys)) {
      missingTranslationKeys[key] = [];
    }
    missingTranslationKeys[key].push(call);
  }
}

// Report
console.log('='.repeat(100));
console.log('LEGITIMATE MISSING TRANSLATION KEYS');
console.log('='.repeat(100));

const sortedMissingKeys = Object.keys(missingTranslationKeys).sort();
if (sortedMissingKeys.length > 0) {
  for (const key of sortedMissingKeys) {
    const locations = missingTranslationKeys[key];
    console.log(`\nKey: ${key}`);
    console.log(`Used in ${locations.length} location(s):`);

    // Show first 3 locations
    for (let i = 0; i < Math.min(3, locations.length); i++) {
      const loc = locations[i];
      console.log(`  - ${loc.file}:${loc.line}`);
      console.log(`    Context: ${loc.context.substring(0, 80)}`);
    }

    if (locations.length > 3) {
      console.log(`  ... and ${locations.length - 3} more locations`);
    }
  }
} else {
  console.log('\nAll translation keys are defined!');
}

console.log('\n' + '='.repeat(100));
console.log(`SUMMARY: ${sortedMissingKeys.length} unique translation keys missing from uz.json`);
console.log('='.repeat(100));
