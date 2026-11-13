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
  Privacy: 'readonly',
  Migrations: 'readonly',
  App: 'readonly',
};

export default [
  { ignores: ['node_modules/', 'dist/', 'coverage/'] },
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
    files: ['tests/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
