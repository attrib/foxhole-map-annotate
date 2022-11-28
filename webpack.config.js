const path = require('path');
const miniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: {
    index: ['./frontend/index.js'],
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
      }
    ],
  },
  plugins: [
    new miniCssExtractPlugin(),
  ]
};