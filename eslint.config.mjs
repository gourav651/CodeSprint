/** @type {import('eslint').Linter.Config} */
const config = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Add any custom rules here
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/'],
};

export default config;
