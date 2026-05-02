// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Exclude heavy native directories from file watching to stay under the
// container's inotify watcher budget. Without this Metro watches tens of
// thousands of android/ios files inside node_modules and crashes with
// ENOSPC on boot in resource-constrained environments.
config.resolver.blockList = [
  /node_modules\/.+\/(android|ios|windows|macos)\/.*/,
  /node_modules\/.+\/__tests__\/.*/,
];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
