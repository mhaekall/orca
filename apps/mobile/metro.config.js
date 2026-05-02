const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// STRICTLY limit watch folders to only this mobile app directory
// This prevents Expo from automatically watching the monorepo root which causes ENOSPC crashes.
config.watchFolders = [__dirname];

module.exports = withNativeWind(config, { input: "./global.css" });