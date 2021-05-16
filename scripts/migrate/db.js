require("dotenv").config({ path: "../../variables.env" });
const knex = require("knex");

var pg = require("pg");
// pg.defaults.ssl = true;

const devSettings = {
  client: "pg",
  connection: "postgres://postgres:password@0.0.0.0:5432/postgres",
  searchPath: ["backend$dev"]
};

const stagingSettings = {
  client: "pg",
  connection: "postgres://postgres:password@0.0.0.0:5432/postgres",
  searchPath: ["backend$staging"]
};

const prodSettings = {
  client: "pg",
  connection: {
    // connectionString: process.env.LOCAL_LIVE_DB_CONNECTION,
    connectionString:
      "postgres://kwbzwfwuvihljv:a423b793916423a21739af59994a27912010b7e02119a3c93a3958f7418f1326@ec2-54-160-7-200.compute-1.amazonaws.com:5432/d3lk7ccrdt462o",
    // ssl: true
    ssl: { rejectUnauthorized: false }
  },
  searchPath: ["default$default"]
};

// Connect to MySQL - old WP site
module.exports.mysql = knex({
  client: "mysql",
  version: "5.6",
  connection: {
    host: "127.0.0.1",
    user: "sqlpro",
    password: "password",
    database: "wp-4players"
  }
});

// Connect to Postgres - local app staging
module.exports.postgres = knex(
  // process.env.NODE_ENV === "production" && process.env.ACK === true
  //   ? prodSettings
  //   : stagingSettings
  devSettings
);
