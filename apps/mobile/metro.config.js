const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable watching the entire monorepo root to prevent ENOSPC watcher limit crash in Termux.
// Since we used `pnpm install --ignore-workspace` in apps/mobile, all dependencies are local.
config.watchFolders = [];

module.exports = config;