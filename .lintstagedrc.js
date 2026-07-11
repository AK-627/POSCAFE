module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,mdx,yml,yaml}': ['prettier --write'],
  '*.{css,scss}': ['prettier --write']
};