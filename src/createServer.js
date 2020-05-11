// const { GraphQLServer } = require("graphql-yoga");
const { importSchema } = require("graphql-import");
const {
  ApolloServer,
  gql,
  makeExecutableSchema
} = require("apollo-server-express");
// const { ApolloServer: ApolloLambda } = require("apollo-server-lambda");
const Mutation = require("./resolvers/Mutation");
const Query = require("./resolvers/Query");
const Election = require("./resolvers/Election");
const Ballot = require("./resolvers/Ballot");
const Trail = require("./resolvers/Trail");
const db = require("./db");
const typeDefs = importSchema(`${__dirname}/schema.graphql`);

const schema = makeExecutableSchema({
  typeDefs: gql`
    ${typeDefs}
  `,
  resolvers: {
    Mutation,
    Query,
    Trail,
    Election,
    Ballot
  },
  resolverValidationOptions: { requireResolversForResolveType: false }
});

// Create GraphQL yoga server
const createServer = () => {
  // return new GraphQLServer({
  //   typeDefs: "src/schema.graphql",
  //   resolvers: {
  //     Mutation,
  //     Query,
  //     Trail,
  //     Election,
  //     Ballot
  //   },
  //   resolverValidationOptions: {
  //     requireResolversForResolveType: false
  //   },
  //   context: req => ({ ...req, db })
  // });
  return new ApolloServer({
    schema,
    context: req => ({ ...req, db })
  });
};

// const createHandler = () => {
//   return new ApolloLambda({
//     schema,
//     context: req => ({ ...req, db })
//   });
// };

module.exports = {
  createServer
  // createHandler
};
