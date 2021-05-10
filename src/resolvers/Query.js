const { addFragmentToInfo } = require("graphql-binding");
const {
  hasRole,
  hasAccountType,
  hasAccountStatus,
  resetTokenTimeoutInMs
} = require("../utils");
const config = require("../config");
const docs = require("./partials/docs");

const Query = {
  myself(parent, args, ctx, info) {
    // Check if there is a current user
    if (!ctx.req.userId) {
      return null;
    }

    return ctx.db.query.user(
      {
        where: { id: ctx.req.userId }
      },
      info
    );
  },
  async users(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }
    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL", "ASSOCIATE", "EMERITUS"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // If they do, query all the users
    const query = {
      orderBy: "lastName_DESC",
      where: {}
    };

    if (args.role && args.role.length) {
      query.where = {
        role_in: args.role
      };
    }
    if (args.accountStatus && args.accountStatus.length) {
      query.where = {
        ...query.where,
        accountStatus_in: args.accountStatus
      };
    }
    if (args.accountType && args.accountType.length) {
      query.where = {
        ...query.where,
        accountType_in: args.accountType
      };
    }
    if (args.office && args.office.length) {
      query.where = {
        ...query.where,
        office_in: args.office
      };
    }
    if (args.title && args.title.length) {
      query.where = {
        ...query.where,
        title_in: args.title
      };
      // query.where = {
      //   AND: [
      //     { accountType_in: args.accountType, },
      //     { accountStatus_in: args.accountStatus, },
      //     { role_in: args.role, },
      //     { office_in: args.office, },
      //     { title_in: args.title, },
      //   ],
      // };
    }

    // Sorting?
    // if (args.orderBy && args.orderBy.length > 0) {
    //   query.orderBy = args.orderBy[0];
    // }

    const results = await ctx.db.query.users(query, info);
    results.sort((a, b) => (a.firstName > b.firstName ? 1 : -1));
    return results;
  },
  async user(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    const username =
      !args.username || args.username === "self"
        ? ctx.req.user.username
        : args.username;

    if (username !== ctx.req.user.username) {
      // Requesting user has proper account type?
      hasAccountType(ctx.req.user, ["FULL", "ASSOCIATE", "EMERITUS"]);

      // Requesting user has proper account status?
      hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);
    }

    // If they do, query the user
    const user = await ctx.db.query.user(
      {
        where: { username }
      },
      info
    );

    if (user) {
      return user;
    } else {
      throw new Error("User cannot be found");
    }
  },
  async getRegistration(parent, args, ctx, info) {
    const registration = await ctx.db.query.registrations(
      {
        where: {
          token: args.token,
          tokenExpiry_gte: new Date(
            Date.now() - resetTokenTimeoutInMs
          ).toISOString()
        },
        first: 1
      },
      info
    );

    if (!registration) {
      throw new Error("Token invalid or expired, please register again.");
    }

    if (registration.length <= 0) {
      throw new Error("Registration invalid, please register again.");
    }

    return registration[0];
  },
  async getDuesLastReceived(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }
    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const userQuery =
      args.username === "self"
        ? { id: ctx.req.userId }
        : { username: args.username };

    // If they do, query the user
    const results = await ctx.db.query.membershipLogItems(
      {
        where: {
          AND: [{ user: userQuery }, { messageCode: "DUES_PAID" }]
        },
        orderBy: "createdAt_DESC",
        first: 1
      },
      info
    );

    return { time: results.length > 0 ? results[0].time : null };
  },
  async getOfficer(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }
    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL", "ASSOCIATE", "EMERITUS"]);

    // // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // If they do, query the officer
    const results = await ctx.db.query.users(
      {
        where: {
          office: args.office
        }
      },
      info
    );

    return results.length > 0 ? results[0] : {};
  },
  async getMembers(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }
    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL", "ASSOCIATE", "EMERITUS"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // If they do, query all the members
    const results = await ctx.db.query.users(
      {
        where: {
          AND: [
            { accountStatus_in: args.accountStatuses || ["ACTIVE"] },
            { accountType_in: args.accountTypes },
            { office: null }, // No officers
            {
              NOT: [{ rig: null }]
            }
          ]
        },
        orderBy: "firstName_ASC"
      },
      info
    );

    // Sort by lastName then firstName
    results.sort((a, b) => (a.lastName > b.lastName ? 1 : -1));

    return results;
  },
  async getRunLeaders(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }
    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Return all run leaders
    const results = await ctx.db.query.users(
      {
        where: {
          AND: [
            { accountStatus: "ACTIVE" },
            { accountType: "FULL" },
            { role_in: ["ADMIN", "OFFICER", "RUN_MASTER", "RUN_LEADER"] }
          ]
        },
        orderBy: "firstName_ASC"
      },
      info
    );

    // Sort by lastName then firstName
    results.sort((a, b) => (a.lastName > b.lastName ? 1 : -1));

    return results;
  },
  async getMessageRecipients(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    const { user } = ctx.req;
    const members = ["FULL", "ASSOCIATE", "EMERITUS"];
    const query = {
      where: {},
      orderBy: "firstName_ASC"
    };

    if (!hasAccountStatus(user, ["ACTIVE"], false)) {
      return [];
    }

    if (hasRole(user, ["ADMIN", "OFFICER"], false)) {
      query.where = { accountType_in: config.accountType };
    } else if (hasAccountType(user, members, false)) {
      query.where = {
        AND: [{ accountStatus: "ACTIVE" }, { accountType_in: members }]
      };
    } else {
      return [];
    }

    const results = await ctx.db.query.users(query, info);

    // Sort by lastName then firstName
    results.sort((a, b) => (a.lastName > b.lastName ? 1 : -1));

    return results;
  },
  async getUpcomingEvents(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const { count, page } = args;
    let pagination = {};

    // No page? Show all
    if (page && page !== null) {
      const skip = (page - 1) * config.defaultPaginationSize;

      pagination = {
        ...(skip <= 0 ? {} : { skip }),
        first: config.defaultPaginationSize
      };
    }

    if (count && count !== null) {
      pagination = {
        ...pagination,
        first: count
      };
    }

    return ctx.db.query.events(
      {
        where: {
          startTime_gte: new Date().toISOString()
        },
        orderBy: "startTime_ASC",
        ...pagination
      },
      info
    );
  },
  async upcomingEventsCount(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const results = await ctx.db.query.events(
      {
        where: {
          startTime_gte: new Date().toISOString()
        },
        orderBy: "startTime_ASC"
      },
      info
    );

    return { count: results.length };
  },
  async getUserEvents(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account type?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const userQuery =
      args.username === "self"
        ? { id: ctx.req.userId }
        : { username: args.username };

    if (args.eventType) {
      return ctx.db.query.events(
        {
          where: {
            AND: [
              { type: args.eventType },
              { startTime_lte: new Date().toISOString() },
              { rsvps_some: { member: userQuery } }
            ]
          },
          orderBy: "startTime_DESC"
        },
        info
      );
    }

    return ctx.db.query.events(
      {
        where: {
          AND: [
            { startTime_lte: new Date().toISOString() },
            { rsvps_some: { member: userQuery } }
          ]
        },
        orderBy: "startTime_DESC"
      },
      info
    );
  },
  async getPastEvents(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    let pagination = {};
    const { count, page } = args;

    // No page? Show all
    if (page && page !== null) {
      const skip = (page - 1) * config.defaultPaginationSize;

      pagination = {
        ...(skip <= 0 ? {} : { skip }),
        first: config.defaultPaginationSize
      };
    }

    if (count && count !== null) {
      pagination = {
        ...pagination,
        first: count
      };
    }

    const query = {
      where: {
        startTime_lte: new Date().toISOString()
      },
      orderBy: "startTime_DESC"
    };

    return ctx.db.query.events(
      {
        ...query,
        ...pagination
      },
      info
    );
  },
  async pastEventsCount(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const results = await ctx.db.query.events(
      {
        where: {
          startTime_lte: new Date().toISOString()
        },
        orderBy: "startTime_DESC"
      },
      info
    );

    return { count: results.length };
  },
  async getEvent(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Get current event for later comparison
    const user = await ctx.db.query.user(
      {
        data: {},
        where: {
          id: ctx.req.userId
        }
      },
      "{ id, accountType }"
    );

    const result = await ctx.db.query.event(
      {
        where: { id: args.eventId }
      },
      info
    );

    if (!result) {
      throw new Error("Event cannot be found");
    }

    if (result.membersOnly && ctx.req.user.accountType === "GUEST") {
      throw new Error("You cheeky bastard! Nice try.");
      // Email webmaster
    }

    return result;
  },
  async getNextEvent(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    try {
      const results = await ctx.db.query.events(
        {
          where: {
            startTime_gte: new Date().toISOString()
          },
          orderBy: "startTime_ASC",
          first: 1
        },
        info
      );

      return results.length > 0 ? results[0] : null;
    } catch (e) {
      throw new Error(e);
    }
  },
  // async getMyNextEvent(parent, args, ctx, info) {
  //   // Logged in?
  //   if (!ctx.req.userId) {
  //     throw new Error("You must be logged in");
  //   }

  //   // Requesting user has proper account status?
  //   hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

  //   try {
  //     // const results = await ctx.db.query.user(
  //     //   {
  //     //     where: {
  //     //       startTime_gte: new Date().toISOString(),
  //     //       rsvps_every: {
  //     //         member: {
  //     //           id: ctx.req.userId
  //     //         }
  //     //       }
  //     //     },
  //     //     orderBy: "startTime_ASC",
  //     //     first: 1,
  //     //   },
  //     //   info
  //     // );

  //     const results = await ctx.db.query

  //     console.log(results);

  //     return results.length > 0 ? results[0]: {};
  //   } catch (e) {
  //     throw new Error(e);
  //   }
  // },
  async getTrails(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // If they do, query all the users
    return ctx.db.query.trails({}, info);
  },
  async getTrail(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account status?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER", "RUN_LEADER"]);
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);
    hasAccountType(ctx.req.user, ["FULL"]);

    // If they do, query all the users
    return ctx.db.query.trail(
      {
        where: {
          slug: args.slug
        }
      },
      info
    );
  },
  async electionCandidates(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // If they do, query all the users
    return ctx.db.query.users(
      {
        where: {
          role_in: args.roles,
          accountStatus: args.accountStatus
        }
      },
      info
    );
  },
  getActiveElections(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    return ctx.db.query.elections(
      {
        where: {
          AND: [
            { startTime_lte: new Date().toISOString() },
            { endTime_gt: new Date().toISOString() }
          ]
        },
        orderBy: "endTime_ASC"
      },
      info
    );
  },
  getActiveElectionsWithResults(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    return ctx.db.query.elections(
      {
        where: {
          AND: [
            { startTime_lte: new Date().toISOString() },
            { endTime_gt: new Date().toISOString() }
          ]
        },
        orderBy: "endTime_ASC"
      },
      info
    );
  },
  getElection(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    return ctx.db.query.election(
      {
        where: {
          id: args.id
        }
      },
      info
    );
  },
  async getUserVote(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const votes = await ctx.db.query.votes(
      {
        where: {
          AND: [
            { ballot: { id: args.ballot } },
            { voter: { id: ctx.req.userId } }
          ]
        },
        first: true
      },
      info
    );

    return votes;
  },
  // async adminStats(parent, args, ctx, info) {
  //   // Logged in?
  //   if (!ctx.req.userId) {
  //     throw new Error("You must be logged in");
  //   }

  //   // Requesting user has proper role?
  //   hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

  //   // Requesting user has proper account type?
  //   hasAccountType(ctx.req.user, ["FULL"]);

  //   // Requesting user has proper account status?
  //   hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

  //   return ctx.db.query.votes(
  //     {
  //       where: {
  //         AND: [
  //           { ballot: { id: args.ballot } },
  //           { voter: { id: ctx.req.userId } }
  //         ]
  //       },
  //       first: true
  //     },
  //     info
  //   );

  //   const [
  //     activeFullMembers,
  //     pastDueFullMembers,
  //     delinquentFullMembers,
  //     removedFullMembers,
  //     resignedFullMembers,
  //     inactiveFullMembers,
  //     limitedGuestMembers,
  //     lockedGuestMembers,

  //     emeritusMembers,
  //     deceasedMembers,
  //     associateMembers,
  //     guestMembers,
  //     charterMembers,

  //     fullMembersLastYear,
  //     newFullMembersThisYear,
  //     neededForQuorum,
  //     neededToPassMotion,
  //     neededToVoteOnNewMember,
  //     newFullMembersAllowed,
  //     fullMembersAllowed
  //   ] = Promise.all([
  //     ctx.db.query.usersConnection(
  //       {
  //         where: {}
  //       },
  //       info
  //     )
  //   ]);

  //   const results = {};

  //   return {
  //     activeFullMembers,
  //     pastDueFullMembers,
  //     delinquentFullMembers,
  //     removedFullMembers,
  //     resignedFullMembers,
  //     inactiveFullMembers,
  //     limitedGuestMembers,
  //     lockedGuestMembers,

  //     emeritusMembers,
  //     deceasedMembers,
  //     associateMembers,
  //     guestMembers,
  //     charterMembers,

  //     fullMembersLastYear,
  //     newFullMembersThisYear,
  //     neededForQuorum,
  //     neededToPassMotion,
  //     neededToVoteOnNewMember,
  //     newFullMembersAllowed,
  //     fullMembersAllowed
  //   };
  // },
  // async activeMembersPerYear(parent, args, ctx, info) {
  //   // Logged in?
  //   if (!ctx.req.userId) {
  //     throw new Error("You must be logged in");
  //   }

  //   hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

  //   // Requesting user has proper account type?
  //   hasAccountType(ctx.req.user, ["FULL"]);

  //   // Requesting user has proper account status?
  //   hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

  //   return ctx.db.query.users(
  //     {
  //       where: {}
  //     },
  //     info
  //   );

  //   return [
  //     {
  //       year,
  //       count
  //     }
  //   ];
  // },
  // async guestsWithLockedAccounts(parent, args, ctx, info) {
  //   // Logged in?
  //   if (!ctx.req.userId) {
  //     throw new Error("You must be logged in");
  //   }

  //   hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

  //   // Requesting user has proper account type?
  //   hasAccountType(ctx.req.user, ["FULL"]);

  //   // Requesting user has proper account status?
  //   hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

  //   return ctx.db.query.users(
  //     {
  //       where: {
  //         AND: [{ accountType: "GUEST" }, { accountStatus: "LOCKED" }]
  //       }
  //     },
  //     info
  //   );
  // },
  // async guestsAskedToJoin(parent, args, ctx, info) {
  //   // Logged in?
  //   if (!ctx.req.userId) {
  //     throw new Error("You must be logged in");
  //   }

  //   hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

  //   // Requesting user has proper account type?
  //   hasAccountType(ctx.req.user, ["FULL"]);

  //   // Requesting user has proper account status?
  //   hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

  //   return ctx.db.query.users(
  //     {
  //       where: {
  //         AND: [{ accountType: "GUEST" }, { accountStatus: "LIMITED" }]
  //       }
  //     },
  //     info
  //   );
  // },
  // async guestsEligibleForMembership(parent, args, ctx, info) {
  //   // Logged in?
  //   if (!ctx.req.userId) {
  //     throw new Error("You must be logged in");
  //   }

  //   hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

  //   // Requesting user has proper account type?
  //   hasAccountType(ctx.req.user, ["FULL"]);

  //   // Requesting user has proper account status?
  //   hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

  //   // TODO: Has attended 1 run
  //   // TODO: Has attended 1 meeting
  //   const results = ctx.db.query.users({
  //     where: {
  //       AND: [
  //         { accountType: "GUEST" },
  //         { accountStatus: "ACTIVE" },
  //         {
  //           eventsRSVPd_some: {
  //             where: {
  //               type: {}
  //             }
  //           }
  //         }
  //       ]
  //     }
  //   });

  //   // Filter over 18
  //   // Filter at least 1 run
  //   // Filter at least 1 meeting
  // }
  async getMembershipLogItems(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper account type?
    if (!hasAccountType(ctx.req.user, ["FULL", "ASSOCIATE"], false)) {
      return [];
    }

    if (args.username.toLowerCase() === "self") {
      return ctx.db.query.membershipLogItems(
        {
          where: {
            AND: [
              { messageCode: args.messageCode },
              {
                user: {
                  id: ctx.req.userId
                }
              }
            ]
          },
          orderBy: "time_DESC"
        },
        info
      );
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    return ctx.db.query.membershipLogItems(
      {
        where: {
          AND: [
            { messageCode: args.messageCode },
            {
              user: {
                username: args.username
              }
            }
          ]
        },
        orderBy: "time_DESC"
      },
      info
    );
  },
  async notifications(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    const results = await ctx.db.query.user(
      { where: { id: ctx.req.userId } },
      "{ id, userMeta { id } }"
    );

    if (results && results.userMeta) {
      const { id } = results.userMeta;

      return ctx.db.query.userMeta(
        {
          where: {
            id
          }
        },
        info
      );
    }

    return null;
  },
  ...docs.queries
};

module.exports = Query;
