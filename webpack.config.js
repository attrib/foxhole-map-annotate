const path = require('path');
const webpack = require('webpack')
const miniCssExtractPlugin = require('mini-css-extract-plugin')
require('dotenv').config();
const isDev = (process.argv.NODE_ENV || 'development') === 'development';

module.exports = {
  entry: {
    index: ['./frontend/index.js'], // 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000'
    main: ['./frontend/main.js'],
  },
  devtool: isDev ? 'source-map' : false,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public', 'dist'),
    publicPath: "/dist/",
  },
  module: {
    rules: [
      {
        test: /\.(scss)$/,
        use: [
          {
            // Extracts CSS for each JS file that includes CSS
            loader: miniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: () => [
                  require('autoprefixer')
                ]
              }
            }
          },
          {
            loader: 'sass-loader'
          }
        ]
      }
    ],
  },
  // devtool: 'inline-source-map',
  mode: isDev ? 'development' : 'production',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new miniCssExtractPlugin(),
  ]
};