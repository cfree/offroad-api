const path = require("path");
const nodeExternals = require("webpack-node-externals");
const WebpackShellPlugin = require("webpack-shell-plugin");

const { NODE_ENV = "production" } = process.env;

const prodConfig = {
  mode: NODE_ENV,
  entry: "./src/graphql.js",
  output: {
    path: path.resolve(__dirname, "functions"),
    filename: "graphql.js"
  }
};

const devConfig = {
  mode: NODE_ENV,
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "index.js"
  }
};

const plugins = [
  ...(NODE_ENV === "development"
    ? [
        new WebpackShellPlugin({
          onBuildEnd: ["nodemon build/index.js --watch build"]
        })
      ]
    : [])
];

module.exports = {
  target: "node",
  externals: [nodeExternals()],
  ...(NODE_ENV === "development" ? devConfig : prodConfig),
  plugins,
  module: {
    rules: [
      {
        test: /index\.js$/,
        loader: "string-replace-loader",
        options: {
          search: "./src",
          replace: "."
        }
      },
      // {
      //   test: /\.ts$/,
      //   use: ["ts-loader"]
      // },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-transform-runtime"]
          }
        }
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto"
      },
      {
        test: /\.(graphql|gql)$/,
        use: ["file-loader"]
      },
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        use: {
          loader: "graphql-tag/loader"
        }
      }
    ]
  }
};
