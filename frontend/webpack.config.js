const config = {
  entry: ['./src/index.ts'],
  resolve: {
    extensions: ['.ts'],
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: [{
        loader: 'ts-loader',
      }, {
        loader: "ifdef-loader",
        options: {
          RELEASE: true,
          "ifdef-verbose": true,
        }
      }],
    }],
  },
  output: {
    path: __dirname + '/build',
    filename: 'offworker.bundle.js',
  },
}
module.exports = config;