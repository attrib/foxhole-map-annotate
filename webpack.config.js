import path from "node:path";

import miniCssExtractPlugin from "mini-css-extract-plugin";
import { VueLoaderPlugin } from "vue-loader";
import webpack from "webpack";

export default {
  entry: {
    index: ['./frontend/index.js'],
    stats: ['./frontend/stats.js'],
    main: ['./frontend/main.js'],
    admin: ['./frontend/admin.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve('public', 'dist'),
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