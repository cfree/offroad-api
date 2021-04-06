const { addFragmentToInfo } = require("graphql-binding");

const User = {
  async runsAttendedCount(parent, args, ctx, info) {
    // Count number of runs attended
    const results = await ctx.db.query.events(
      {
        where: {
          AND: [
            {
              rsvps_every: {
                AND: [
                  {
                    member: {
                      id: parent.id
                    }
                  },
                  { status: "GOING" }
                ]
              }
            },
            { endTime_lte: new Date().toISOString() },
            { type: "RUN" }
          ]
        }
      },
      "{ id }"
    );

    return results.length;
  }
};

module.exports = User;
