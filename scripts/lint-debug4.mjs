import { Linter } from 'eslint';
import fs from 'fs';
import tsParser from '@typescript-eslint/parser';

const code = fs.readFileSync('src/test/lint-fixtures/loader2-banned.tsx', 'utf8');
const linter = new Linter();

const selectors = [
  "JSXElement[openingElement.name.name='Loader2']",
  "JSXElement[openingElement.name.name='Loader2']:not(:has(JSXElement))",
  "JSXElement[openingElement.name.name='Loader2']:not(JSXElement[openingElement.name.name='button'] JSXElement[openingElement.name.name='Loader2'])",
  "JSXElement[openingElement.name.name='Loader2']:not(JSXElement[openingElement.name.name=/Button$/] JSXElement[openingElement.name.name='Loader2'])",
];

for (const sel of selectors) {
  const messages = linter.verify(code, {
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-restricted-syntax': ['error', { selector: sel, message: 'hit' }] },
  });
  console.log(`SEL: ${sel.slice(0,80)}... => ${messages.length} hits`);
}
