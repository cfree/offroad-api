import { config } from "dotenv";
config({ path: "variables.env" });

import express from "express";
import { ApolloServer, gql, makeExecutableSchema } from "apollo-server-express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import cors from "cors";
import { Prisma } from "prisma-binding";
import { importSchema } from "graphql-import";

import Mutation from "./resolvers/Mutation";
import Query from "./resolvers/Query";
import Election from "./resolvers/Election";
import Ballot from "./resolvers/Ballot";
import Trail from "./resolvers/Trail";

// const { typeDefs: prismaTypeDefs } = require("./generated/prisma-schema");

// const isLambda = process.env.LAMBDA_TASK_ROOT;
// const src = isLambda ? `${isLambda}/bundle` : "src";

// const generalTypeDefs = importSchema(require.resolve("./schema.graphql"));
// const prismaTypeDefs = importSchema(require__dirname.concat("/generated/prisma.graphql"));
const generalTypeDefs = importSchema("./src/schema.graphql");
// const generalTypeDefs = importSchema("./src/generated/prisma.graphql");
// import generalTypeDefs from "./src/schema.graphql";
// import prismaTypeDefs from "./generated/prisma.graphql";

const db = new Prisma({
  typeDefs: "./src/generated/prisma.graphql",
  endpoint: process.env.PRISMA_ENDPOINT,
  secret: process.env.PRISMA_SECRET,
  debug: process.env.NODE_ENV === "development"
});

/*
"- /var/task/bundle/index.js",
"- /var/task/graphql.js",
"- /var/runtime/UserFunction.js",
"- /var/runtime/index.js",
*/

const corsOptions = {
  credentials: true,
  origin: process.env.FRONTEND_URL
};

const schema = makeExecutableSchema({
  typeDefs: gql(generalTypeDefs),
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
// const createServer = () => {
//   //   typeDefs: "src/schema.graphql",
//   return new ApolloServer({
//     schema,
//     context: req => ({ ...req, db })
//   });
// };

const app = express();
// const server = createServer();
// Create GraphQL server
const server = new ApolloServer({
  schema,
  context: req => ({ ...req, db })
});

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

if (process.env.NODE_ENV !== "production") {
  app.listen({ port: 4000 }, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
  );
}

export default app;
