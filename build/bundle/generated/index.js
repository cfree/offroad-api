"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_lib_1 = require("prisma-client-lib");
var typeDefs = require("./prisma-schema").typeDefs;

var models = [
  {
    name: "Role",
    embedded: false
  },
  {
    name: "AccountStatus",
    embedded: false
  },
  {
    name: "AccountType",
    embedded: false
  },
  {
    name: "Office",
    embedded: false
  },
  {
    name: "Title",
    embedded: false
  },
  {
    name: "Poll",
    embedded: false
  },
  {
    name: "TrailDifficulty",
    embedded: false
  },
  {
    name: "MigrationStatus",
    embedded: false
  },
  {
    name: "RSVPStatus",
    embedded: false
  },
  {
    name: "TrailCondition",
    embedded: false
  },
  {
    name: "Gender",
    embedded: false
  },
  {
    name: "OutfitLevel",
    embedded: false
  },
  {
    name: "ActivityMessageCode",
    embedded: false
  },
  {
    name: "MembershipMessageCode",
    embedded: false
  },
  {
    name: "EventType",
    embedded: false
  },
  {
    name: "Registration",
    embedded: false
  },
  {
    name: "User",
    embedded: false
  },
  {
    name: "ContactInfo",
    embedded: false
  },
  {
    name: "Preference",
    embedded: false
  },
  {
    name: "UserMeta",
    embedded: false
  },
  {
    name: "Event",
    embedded: false
  },
  {
    name: "RSVP",
    embedded: false
  },
  {
    name: "Trail",
    embedded: false
  },
  {
    name: "RunReport",
    embedded: false
  },
  {
    name: "Condition",
    embedded: false
  },
  {
    name: "Bandaid",
    embedded: false
  },
  {
    name: "Election",
    embedded: false
  },
  {
    name: "Ballot",
    embedded: false
  },
  {
    name: "Vote",
    embedded: false
  },
  {
    name: "Vehicle",
    embedded: false
  },
  {
    name: "ActivityLogItem",
    embedded: false
  },
  {
    name: "MembershipLogItem",
    embedded: false
  },
  {
    name: "RigImage",
    embedded: false
  },
  {
    name: "CloudinaryImage",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `${process.env["PRISMA_ENDPOINT"]}`
});
exports.prisma = new exports.Prisma();
