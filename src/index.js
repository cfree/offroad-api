require("dotenv").config({ path: "variables.env" });
const express = require("express");
const {
  ApolloServer,
  gql,
  makeExecutableSchema
} = require("apollo-server-express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Prisma } = require("prisma-binding");
const { importSchema } = require("graphql-import");
// import * as typeDefs from "./schema.graphql";

const Mutation = require("./resolvers/Mutation");
const Query = require("./resolvers/Query");
const Election = require("./resolvers/Election");
const Ballot = require("./resolvers/Ballot");
const Trail = require("./resolvers/Trail");

const isLambda = process.env.LAMBDA_TASK_ROOT;
const src = isLambda ? isLambda : "src";
const typeDefs = importSchema(`${src}/schema.graphql`);
console.log(__dirname);

const db = new Prisma({
  typeDefs: `${src}/generated/prisma.graphql`,
  endpoint: process.env.PRISMA_ENDPOINT,
  secret: process.env.PRISMA_SECRET,
  debug: process.env.NODE_ENV === "development"
});

const corsOptions = {
  credentials: true,
  origin: process.env.FRONTEND_URL
};

const schema = makeExecutableSchema({
  typeDefs,
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
  //   typeDefs: "src/schema.graphql",
  return new ApolloServer({
    schema,
    context: req => ({ ...req, db })
  });
};

const app = express();
const server = createServer();

// Daily Automation:::

// Automatically change Active Full Member status to Past Due
//   if no dues received after 1/1 of each year
//   and send email, tag as 'past due'

// Automatically change Past Due Full Member status to Delinquent
//   if no dues received after 3/31 of each year
//   and send email, remove from members list, remove 'past due' tag

// Automatically change Delinquent Full Member status to Inactive
//   if no dues received in the last year
//   and send email

// Transactional Emails:
// - Event Reminders (if RSVP yes, 1 day in advance) to attendees
// - Post run: Run Report/Bandaid Report to run leader
// - Post run: Review/Photos to attendees
// - Daily: Locked accounts reminder to secretary/webmaster

// Transactional Events:::

// - Post run report: Notify board of report
// - Post run report: Change Active Guest status to Limited if 3 runs attended, notify board

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

server.applyMiddleware({ app, cors: false });

if (process.env.NODE_ENV === "development") {
  app.listen({ port: 4000 }, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
  );
}

exports.app = app;
