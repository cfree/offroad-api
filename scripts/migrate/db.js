const knex = require("knex");

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
module.exports.postgres = knex({
  client: "pg",
  connection: "postgres://postgres:password@0.0.0.0:5432/postgres",
  searchPath: ["backend$staging"]
});
