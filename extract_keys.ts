import * as fs from 'fs';
import * as path from 'path';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

// Extract all translation keys from source code
const translationKeys = new Set<string>();

// Pattern to match t('key') or t("key")
const pattern = /t\(["']([a-zA-Z0-9_.]+)["']\)/g;

function walkDir(dir: string): void {
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
        let match;
        while ((match = pattern.exec(content)) !== null) {
          translationKeys.add(match[1]);
        }
      } catch (error) {
        console.error(`Error reading ${filepath}:`, error);
      }
    }
  }
}

walkDir('src');

// Load the translation file
const uzFilePath = path.join('src', 'i18n', 'locales', 'uz.json');
const uzTranslations: TranslationObject = JSON.parse(
  fs.readFileSync(uzFilePath, 'utf-8')
);

// Function to check if key exists in translations
function keyExistsInTranslations(key: string, transDict: TranslationObject): boolean {
  const parts = key.split('.');
  let current: any = transDict;

  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return true;
}

// Find missing keys
const missingKeys: string[] = [];
const foundKeys: string[] = [];

const sortedKeys = Array.from(translationKeys).sort();
for (const key of sortedKeys) {
  if (keyExistsInTranslations(key, uzTranslations)) {
    foundKeys.push(key);
  } else {
    missingKeys.push(key);
  }
}

// Report results
console.log('\n' + '='.repeat(80));
console.log('TRANSLATION KEY ANALYSIS');
console.log('='.repeat(80));
console.log(`\nTotal unique keys found in code: ${translationKeys.size}`);
console.log(`Keys found in uz.json: ${foundKeys.length}`);
console.log(`Missing keys: ${missingKeys.length}`);

if (missingKeys.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('MISSING TRANSLATION KEYS (Not in uz.json):');
  console.log('='.repeat(80));
  for (const key of missingKeys) {
    console.log(`  - ${key}`);
  }
} else {
  console.log('\nAll keys are defined in uz.json!');
}
