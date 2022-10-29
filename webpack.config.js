const path = require('path');
const webpack = require('webpack')
require('dotenv').config();
const isDev = (process.argv.NODE_ENV || 'development') === 'development';

module.exports = {
  entry: {
    index: ['./frontend/index.js'] // 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000'
  },
  devtool: isDev ? 'source-map' : false,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public', 'javascripts'),
    publicPath: "/javascripts/",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  // devtool: 'inline-source-map',
  mode: isDev ? 'development' : 'production',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      WEBSOCKET_URL: JSON.stringify(process.env.ORIGIN.replace('http', 'ws'))
    }),
  ]
};