import webpack from "webpack";
import { merge } from "webpack-merge";

import common from "./webpack.config.js";

export default merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new webpack.DefinePlugin({
      '__VUE_PROD_DEVTOOLS__': JSON.stringify(true),
    })
  ]
});