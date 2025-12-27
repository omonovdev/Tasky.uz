import * as fs from 'fs';
import * as path from 'path';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

// Load the translation file
const uzFilePath = path.join('src', 'i18n', 'locales', 'uz.json');
const uzTranslations: TranslationObject = JSON.parse(
  fs.readFileSync(uzFilePath, 'utf-8')
);

// Check if specific keys exist
const testKeys = [
  'auth.profileRequiredTitle',
  'auth.profileRequiredDesc',
  'common.unknownUser',
  'success'
];

console.log('Verifying missing keys in uz.json:\n');
console.log('='.repeat(70));

for (const key of testKeys) {
  const parts = key.split('.');
  let current: any = uzTranslations;
  let exists = true;
  let location = 'root';

  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = current[part];
      location = part;
    } else {
      exists = false;
      break;
    }
  }

  const status = exists ? 'FOUND' : 'MISSING';
  console.log(`${key.padEnd(40)} [${status}]`);
}

// Show what keys DO exist in 'auth' section
console.log('\n' + '='.repeat(70));
console.log('Keys that DO exist in \'auth\' section:');
console.log('='.repeat(70));
if ('auth' in uzTranslations && typeof uzTranslations.auth === 'object') {
  const authKeys = Object.keys(uzTranslations.auth).sort();
  for (const key of authKeys) {
    console.log(`  - auth.${key}`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('Keys that DO exist in \'common\' section:');
console.log('='.repeat(70));
if ('common' in uzTranslations && typeof uzTranslations.common === 'object') {
  const commonKeys = Object.keys(uzTranslations.common).sort();
  for (const key of commonKeys) {
    console.log(`  - common.${key}`);
  }
}

console.log('\nTop-level keys in uz.json:');
console.log('='.repeat(70));
const topLevelKeys = Object.keys(uzTranslations).sort();
for (const key of topLevelKeys) {
  console.log(`  - ${key}`);
}
