const path = require('path');
const webpack = require('webpack')

module.exports = {
  entry: {
    index: ['./frontend/index.js'] // 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000'
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public', 'javascripts'),
    publicPath: "/javascripts",
  },
  // devtool: 'inline-source-map',
  mode: process.argv.NODE_ENV || 'development',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ]
};