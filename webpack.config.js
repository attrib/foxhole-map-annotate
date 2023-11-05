const path = require('path');
const miniCssExtractPlugin = require('mini-css-extract-plugin')
const {VueLoaderPlugin} = require('vue-loader')
const webpack = require("webpack");

module.exports = {
  entry: {
    index: ['./frontend/index.js'],
    stats: ['./frontend/stats.js'],
    main: ['./frontend/main.js'],
    admin: ['./frontend/admin.js'],
  },
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
      },
      {
        test: /\.(vue)$/,
        loader: 'vue-loader'
      }
    ],
  },
  plugins: [
    new miniCssExtractPlugin(),
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
      '__VUE_OPTIONS_API__': JSON.stringify(false),
    })
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  }
};