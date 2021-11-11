/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');

const scirptFileName = 'main';


module.exports = ({ mode = 'development' } = {}) => ({   
  output: {
    filename: `${scirptFileName}.js`,
  },
  mode,
  watch: true,
  devtool: "source-map",
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
    new ESLintPlugin({
      extensions: ['ts', 'js'],
    })
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', {
              debug: true,
              corejs: 3,
              useBuiltIns: "usage"
            }]]
          }
        }
      }
    ]
  }
});