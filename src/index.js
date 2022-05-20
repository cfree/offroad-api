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
const User = require("./resolvers/User");

const backblaze = require("./routes/backblaze");
const calendar = require("./routes/calendar");

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

if (process.env.NODE_ENV !== "production") {
  app.get("/backblaze", backblaze.getDocs);
}

function requireHTTPS(req, res, next) {
  // The 'x-forwarded-proto' check is for Heroku
  if (
    !req.secure &&
    req.get("x-forwarded-proto") !== "https" &&
    process.env.NODE_ENV !== "development"
  ) {
    return res.redirect("https://" + req.get("host") + req.url);
  }
  next();
}

app.use(requireHTTPS);

// TODO
app.get("/calendar/upcoming/:count", calendar.getUpcoming); // Public events, now to end of the year
// app.get("/calendar", () => {});  // All events ever
// app.get("gcal", () => {}); // GCAL feed
// Ability to add to calendar

app.use(cors(corsOptions));
app.use(cookieParser());

// Decode the JWT to get user ID on each request
app.use(async (req, res, next) => {
  const { token } = req.cookies;

  if (token) {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = userId;
    // console.log("userId", userId);
  }

  next();
});

// See info about the user if logged in
app.use(async (req, res, next) => {
  if (!req.userId) {
    // console.log("no req.userId");
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
    Ballot,
    User
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
