const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');
const webpack = require("webpack");

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new webpack.DefinePlugin({
      '__VUE_PROD_DEVTOOLS__': JSON.stringify(true),
    })
  ]
});