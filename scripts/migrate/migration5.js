const cuid = require("cuid");
const { postgres } = require("./db");
const { readJsonFile } = require("./utils");

/**
 * Create new membership/activity logs for existing users
 *
 * @desc Move old WordPress MySQL database to new app Postgres database
 *
 * Must run all migration scripts first
 *
 * Assumes data in all json files has been massaged
 */

const fn = async () => {
  try {
    const usersMap = readJsonFile("/generated/users.json");
    // const rsvpsMap = readJsonFile("/generated/rsvps.json");
    // const eventsMap = readJsonFile("/generated/events.json");
    // const trailsMap = readJsonFile("/generated/trails.json");

    // Bug fixes

    // 1. Add user meta
    let metaPivot = {};

    await Promise.all(
      usersMap.map(user => {
        const newId = cuid();

        metaPivot = {
          ...metaPivot,
          [user.ID]: newId
        };

        return postgres("UserMeta").insert(
          {
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            emailVerified: false,
            firstLoginComplete: false,
            accountSetupComplete: false,
            oldSiteMigrationComplete: false
            // emailPublicNotifications: true
            // emailMemberNotifications: true
            // emailEventAnnouncements: true
          },
          ["id"]
        );
      })
    );

    console.log("User meta inserted");

    // Connect users to user meta
    await Promise.all(
      usersMap.map(user => {
        return postgres("_UserMeta").insert({
          A: user.newId,
          B: metaPivot[user.ID]
        });
      })
    );

    console.log("User meta data connected to user data");

    /*
    2. Activity Message Code
    JOINED: usersMap.member_since

    Not implementing - just use `user.joined` info
    */
    // await Promise.all(
    //   usersMap.map(user => {
    //     return postgres("ActivityLogItem").insert({
    //       id: cuid(),
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //       time: new Date(user.member_since),
    //       message: "Joined",
    //       messageCode: "JOINED",
    //       user: user.newId
    //     });
    //   })
    // );

    /*
    3. Membership Message Code
    ACCOUNT_CREATED: usersMap.user_registered
    */
    await Promise.all(
      usersMap.map(user => {
        return postgres("MembershipLogItem").insert({
          id: cuid(),
          createdAt: new Date(),
          updatedAt: new Date(),
          time: new Date(user.user_registered),
          message: "Account created",
          messageCode: "ACCOUNT_CREATED",
          user: user.newId
        });
      })
    );

    console.log("Membership Logs added");

    // STOP. You're done.
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

return fn();
