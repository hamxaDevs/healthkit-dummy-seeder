const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

if (!config.resolver.assetExts.includes('xml')) {
  config.resolver.assetExts.push('xml')
}
if (!config.resolver.assetExts.includes('hkchunk')) {
  config.resolver.assetExts.push('hkchunk')
}
// Block chunk *.json so a mistaken require() does not inline gigabytes into bundleToString().
const block = config.resolver.blockList
config.resolver.blockList = Array.isArray(block)
  ? [
      ...block,
      /apple_health_import\.generated\.json$/,
      /apple_health_import\.generated\.hki$/,
      /apple_health_import\.chunks\/.+\.json$/,
    ]
  : [
      /apple_health_import\.generated\.json$/,
      /apple_health_import\.generated\.hki$/,
      /apple_health_import\.chunks\/.+\.json$/,
    ]

module.exports = config
