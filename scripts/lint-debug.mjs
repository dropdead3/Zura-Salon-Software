import { ESLint } from 'eslint';
const eslint = new ESLint();
const results = await eslint.lintFiles(['src/test/lint-fixtures/loader2-banned.tsx']);
console.log(JSON.stringify(results.map(r => ({ filePath: r.filePath, messageCount: r.messages.length, messages: r.messages })), null, 2));
