// Connect to remote Prisma DB
const { Prisma } = require("prisma-binding");
const { importSchema } = require("graphql-import");
const { gql } = require("apollo-server-express");

const prismaTypeDefs = importSchema(`${__dirname}/generated/prisma.graphql`);

const db = new Prisma({
  typeDefs: prismaTypeDefs,
  endpoint: process.env.PRISMA_ENDPOINT,
  secret: process.env.PRISMA_SECRET,
  debug: process.env.NODE_ENV === "development"
});

module.exports = db;
