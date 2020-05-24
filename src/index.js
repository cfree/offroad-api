require("dotenv").config({ path: "variables.env" });

const express = require("express");
const { ApolloServer, makeExecutableSchema } = require("apollo-server-express");

const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { importSchema } = require("graphql-import");

const db = require("./db");
const Mutation = require("./resolvers/Mutation");
const Query = require("./resolvers/Query");
const Election = require("./resolvers/Election");
const Ballot = require("./resolvers/Ballot");
const Trail = require("./resolvers/Trail");

const corsOptions = {
  credentials: true,
  origin: process.env.FRONTEND_URL
};

// Transactional Emails:

// Post run report:
// - Notify board of report
// - Change Active Guest status to Limited if 3 runs attended, notify board
// - Email all confirmed members a reminder email to submit a review/photos

const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());

// Decode the JWT to get user ID on each request
app.use(async (req, res, next) => {
  const { token } = req.cookies;

  if (token) {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = userId;
  }

  next();
});

// See info about the user if logged in
app.use(async (req, res, next) => {
  if (!req.userId) {
    return next();
  }

  const user = await db.query.user(
    { where: { id: req.userId } },
    "{ id, role, accountType, accountStatus, email, firstName, lastName, username }"
  );
  req.user = user;

  next();
});

const schema = makeExecutableSchema({
  typeDefs: importSchema("src/schema.graphql"),
  resolvers: {
    Mutation,
    Query,
    Trail,
    Election,
    Ballot
  },
  resolverValidationOptions: { requireResolversForResolveType: false }
});

// Create GraphQL server
const server = new ApolloServer({
  schema,
  context: ({ req, res }) => {
    return { req, res, db };
  }
});

server.applyMiddleware({ app, cors: false });

if (process.env.NODE_ENV === "development") {
  app.listen({ port: process.env.PORT }, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
  );
} else {
  app.listen({ port: process.env.PORT }, () =>
    console.log(`🚀 Server ready: ${server.graphqlPath}`)
  );
}
