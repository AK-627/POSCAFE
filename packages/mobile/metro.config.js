const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add monorepo support
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Support .tsx, .jsx, .json, and asset extensions
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'svg'];

// Enable symlinks for workspaces
config.resolver.disableHierarchicalLookup = false;

// Support path aliases
config.resolver.extraNodeModules = {
  '@skynether/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};

module.exports = config;