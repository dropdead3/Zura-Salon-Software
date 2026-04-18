import { ESLint } from 'eslint';
const eslint = new ESLint({});
const config = await eslint.calculateConfigForFile('src/test/lint-fixtures/loader2-banned.tsx');
console.log('rule config:', JSON.stringify(config.rules?.['no-restricted-syntax'], null, 2));
