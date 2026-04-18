import { ESLint } from 'eslint';
const eslint = new ESLint({
  overrideConfig: {
    files: ['**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "JSXElement[openingElement.name.name='Loader2']",
        message: 'Loader2 detected'
      }]
    }
  },
  overrideConfigFile: true,
});
const results = await eslint.lintFiles(['src/test/lint-fixtures/loader2-banned.tsx']);
console.log(JSON.stringify(results.map(r => ({ filePath: r.filePath, messages: r.messages })), null, 2));
