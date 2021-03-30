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
    const usersMap = readJsonFile("./generated/users.json");
    const rsvpsMap = readJsonFile("./generated/rsvps.json");
    const eventsMap = readJsonFile("./generated/events.json");
    const trailsMap = readJsonFile("./generated/trails.json");

    /*
    Activity Message Code

    EVENT_ATTENDED: why?
    RUN_LEAD: rsvpsMap / usersMap
    JOINED: usersMap.member_since
    */

    /*
    Membership Message Code

    ACCOUNT_CREATED: usersMap.user_registered
    MEMBERSHIP_GRANTED: usersMap.member_since
    */

    // STOP. You're done.
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

return fn();
