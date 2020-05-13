const fs = require("fs");
const path = require("path");
const { gql } = require("apollo-server-express");

const generalTypeDefsContents = fs.readFileSync(
  path.resolve(__dirname, "schema.graphql"),
  "utf8"
);
const generalTypeDefs = gql`
  ${generalTypeDefsContents}
`;

const prismaTypeDefsContents = fs.readFileSync(
  path.resolve(__dirname, "./generated/prisma.graphql"),
  "utf8"
);
const prismaTypeDefs = gql`
  ${prismaTypeDefsContents}
`;

module.exports = {
  general: generalTypeDefsContents,
  prisma: prismaTypeDefsContents
};
