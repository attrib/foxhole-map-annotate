const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const webpack = require("webpack");

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimizer: [
      // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
       `...`,
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production'),
      }
    }),
  ]
});