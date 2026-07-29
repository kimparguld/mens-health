/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */

const config = {
  semi: true,
  endOfLine: 'auto',
  singleQuote: true,
  trailingComma: 'es5',
  jsxSingleQuote: true,
  tabWidth: 2,
  printWidth: 80,
  arrowParens: 'always',
  verbatimModuleSyntax: true,
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: ['./**/*.{js,jsx,ts,tsx}'],
      options: {
        semi: true,
        endOfLine: 'auto',
        singleQuote: true,
        trailingComma: 'es5',
        jsxSingleQuote: false,
        tabWidth: 2,
        printWidth: 80,
        arrowParens: 'always',
        removeUnusedImports: true,
      },
    },
    {
      files: ['./**/*.{css,scss}'],
      options: {
        singleQuote: false,
      },
    },
  ],
};

export default config;
