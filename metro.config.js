// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Add support for SQL files
config.resolver.sourceExts.push('sql');

config.resolver.assetExts.push('bin'); // whisper.rn: ggml model binary
config.resolver.assetExts.push('mil'); // whisper.rn: CoreML model asset

module.exports = config;
