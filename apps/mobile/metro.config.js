const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable watching the entire monorepo root to prevent ENOSPC watcher limit crash in Termux.
config.watchFolders = [];

module.exports = config;