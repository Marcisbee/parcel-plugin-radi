module.exports = function (bundler) {
  bundler.addAssetType('radi', require.resolve('./src/RadiAsset.js'));
};
