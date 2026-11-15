import js from '@eslint/js';
import globals from 'globals';

// Globais compartilhados entre os scripts clássicos carregados pelas páginas HTML.
const appGlobals = {
  LALA_CONFIG: 'readonly',
  newId: 'readonly',
  I18n: 'readonly',
  MockDB: 'readonly',
  Auth: 'readonly',
  Donations: 'readonly',
  Offers: 'readonly',
  Store: 'readonly',
  Impact: 'readonly',
  Trust: 'readonly',
  Photos: 'readonly',
  LocalAI: 'readonly',
  AI: 'readonly',
  Matching: 'readonly',
  LocalApi: 'readonly',
  Api: 'readonly',
  Remote: 'readonly',
  Privacy: 'readonly',
  Migrations: 'readonly',
  App: 'readonly',
};

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'js/env.js',
      'js/vendor/',
      'supabase/functions/',
    ],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...appGlobals },
    },
    rules: {
      // Cada arquivo declara o próprio global (ex.: `const Auth = {...}`).
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
