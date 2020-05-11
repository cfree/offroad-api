// Connect to remote Prisma DB
const { Prisma } = require("prisma-binding");

const db = new Prisma({
  typeDefs: `${__dirname}/generated/prisma.graphql`,
  endpoint: process.env.PRISMA_ENDPOINT,
  secret: process.env.PRISMA_SECRET,
  debug: process.env.NODE_ENV === "development"
});

module.exports = db;
