require("dotenv").config({ path: "variables.env" });
const serverlessHttp = require("serverless-http");
const express = require("express");
const {
  ApolloServer,
  gql,
  makeExecutableSchema
} = require("apollo-server-express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
// const { Prisma } = require("./generated");
const { Prisma } = require("prisma-binding");
// const { shared, typeDefs } = require("./schema");
const { importSchema } = require("graphql-import");

const Mutation = require("./resolvers/Mutation");
const Query = require("./resolvers/Query");
const Election = require("./resolvers/Election");
const Ballot = require("./resolvers/Ballot");
const Trail = require("./resolvers/Trail");

// const typeDefs = require("./schema");
// const { typeDefs: prismaTypeDefs } = require("./generated/prisma-schema");

// const isLambda = process.env.LAMBDA_TASK_ROOT;
// const src = isLambda ? `${isLambda}/bundle` : "src";

// process.env.PWD
// Get current path
// Find where in the current path process.env.PWD is
// Take everything

// /etc/users/src/file.txt  <- Current path
const currentPath = __dirname;
// /etc/users/              <- Root directory
const rootDirectory = process.env.PWD;
// src/file.txt             <- path from root
const pathFromRoot = "." + currentPath.replace(rootDirectory, "");
console.log("PATG", pathFromRoot);

const generalTypeDefs = importSchema(pathFromRoot + "/schema.graphql");
const prismaTypeDefs = importSchema(pathFromRoot + "/generated/prisma.graphql");

const isDev = process.env.NODE_ENV === "development";
const src = isDev ? "./src" : "./bundle";

// const prismaTypeDefs = `${src}/generated/prisma.graphql`;
// const generalTypeDefs = importSchema(`${src}/schema.graphql`);

// const db = new Prisma({
//   endpoint: process.env.PRISMA_ENDPOINT,
//   secret: process.env.PRISMA_SECRET,
//   debug: process.env.NODE_ENV === "development"
// });

const db = new Prisma({
  typeDefs: prismaTypeDefs,
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

if (process.env.NODE_ENV === "development") {
  app.listen({ port: 4000 }, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
  );
} else {
  app.listen({ port: process.env.PORT }, () =>
    console.log(`🚀 Server ready: ${server.graphqlPath}`)
  );
}

module.exports.app = serverlessHttp(app, {
  /**
   * **** IMPORTANT ****
   * this request() function is important because
   * it adds the lambda's event and context object
   * into the express's req object so you can access
   * inside the resolvers or routes if youre not using apollo
   */
  request(req, event, context) {
    req.event = event;
    req.context = context;
  }
});
