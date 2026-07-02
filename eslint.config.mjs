import { dirname } from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * ESLint 9 flat config para FilmiFy.
 *
 * Usa FlatCompat para reutilizar las configs compartibles clásicas
 * (`next/core-web-vitals`, `@typescript-eslint/recommended`) que aún se
 * distribuyen en formato eslintrc — es la ruta de migración recomendada por
 * Next.js. Los overrides de reglas se mantienen idénticos a los del antiguo
 * `.eslintrc.cjs`: varias se degradan a `warn` para no bloquear el build con
 * deuda preexistente, pero siguen apareciendo en revisión.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'scripts/**',
      'supabase/**',
      'eslint.config.mjs.disabled',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'plugin:@typescript-eslint/recommended'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
];

export default eslintConfig;
