import webpack from "webpack";
import { merge } from "webpack-merge";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";

import common from "./webpack.config.js";

export default merge(common, {
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
        '__VUE_PROD_DEVTOOLS__': JSON.stringify(false),
      }
    }),
  ]
});