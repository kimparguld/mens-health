import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';

const RAW_PALETTE_HUES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
].join('|');

const RAW_PALETTE_PATTERN = `-(${RAW_PALETTE_HUES})-[0-9]{2,3}\\b`;

// Files migrated to the shared token contract so far (see
// docs/superpowers/specs/2026-08-06-shared-ui-theming-design.md). Widen this
// list as later phases migrate more of packages/ui/src — do not switch it to
// a blanket 'src/**/*.tsx' glob until every file in the package is migrated
// (Phase 4), or this rule will fail on pre-existing, out-of-scope debt.
const TOKENIZED_FILES = [
  'src/ui/BrandLogotype.tsx',
  'src/ui/NewsletterSignupForm.tsx',
  'src/ui/HowWeRateClaims.tsx',
  'src/ui/SiteHeader.tsx',
];

export default defineConfig([
  {
    files: TOKENIZED_FILES,
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${RAW_PALETTE_PATTERN}/]`,
          message:
            'Raw Tailwind palette color classes are banned in this file. Use a --color-* token class (see the shared UI token contract in both apps\' globals.css) instead.',
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_PALETTE_PATTERN}/]`,
          message:
            'Raw Tailwind palette color classes are banned in this file. Use a --color-* token class (see the shared UI token contract in both apps\' globals.css) instead.',
        },
      ],
    },
  },
]);
