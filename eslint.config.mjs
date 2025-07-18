import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';


export default defineConfig([
  {
    ignores: ['.vscode-test/**/*', 'webview/**/*', 'out/**/*'],
  },
  {
    files: ['src/**/*.{js,mjs,cjs,ts,mts,cts}', '*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended']
  },
  { files: ['src/**/*.js', '*.{js,mjs,cjs,ts,mts,cts}'], languageOptions: { sourceType: 'commonjs' } },
  {
    files: ['src/**/*.{js,mjs,cjs,ts,mts,cts}', '*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { globals: globals.node }
  },
  tseslint.configs.recommended
]);
