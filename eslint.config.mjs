import eslintJS from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import eslintJson from '@eslint/json';
import eslintPrettier from 'eslint-plugin-prettier/recommended';
import eslintTS from 'typescript-eslint';

const eslintConfig = defineConfig([
    {
    ...eslintJS.configs.recommended,
      files: ['**/*.{js,jsx,mjs}'],
    },
    eslintTS.configs.recommended.map((c) => ({
        files: ['**/*.{ts,tsx,mts,cts}'],
        ...c,
    })),
    {

      ...importPlugin.flatConfigs.recommended,
      files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
  },
  {
          files: ['**/*.json'],
          language: 'json/json',
          plugins: {
              json: eslintJson,
          },
          rules: {
              'json/no-duplicate-keys': 'error',
          },
      },
    {
        files: ['**/*.{json,css,js,jsx,mjs,ts,tsx,mts,cts}'],
        ...eslintPrettier,
    },
    {
        files: ['**/*.{json,css,js,jsx,mjs,ts,tsx,mts,cts}'],
        rules: {
            // Windows eol
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                },
            ],
        },
    },
    {
        files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
        rules: {
            'no-console': [
                'error',
                {
                    allow: ['warn', 'error'],
                },
            ],
            camelcase: [
                'error',
                {
                    properties: 'always',
                },
            ],
            'import/newline-after-import': [
                'error',
                {
                    count: 1,
                },
            ],
            'import/order': [
                'error',
                {
                    groups: [
                        ['builtin', 'external', 'internal'],
                        ['parent', 'sibling', 'index'],
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: false,
                    },
                },
            ],
        },
    },
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    disallowTypeAnnotations: false,
                },
            ],
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            '@typescript-eslint/triple-slash-reference': 'off',
        },
    },
    globalIgnores(['.claude/*', '.cursor/*', '.github/*', '.vscode/*', '.zed/*', 'node_modules/*', 'OLD/*']),
]);

export default eslintConfig;
