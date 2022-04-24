/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/
require("dotenv").config({ path: "variables.env" });
const { startOfDay } = require("date-fns");
const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const {
  getRemindUserOfPastDueStatusEmail
} = require("../utils/mail-templates");
const membershipLog = require("../utils/membership-log");

const march1 = async () => {
  const date = startOfDay(new Date());

  if (date.getMonth() === 2 && date.getDate() === 1) {
    console.log("It is March 1st - game time!");
    return Promise.all([remindOfDues()]);
  }

  console.log("Not yet.");
  return Promise.resolve();
};

// Send reminders for dues if not paid yet
const remindOfDues = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const users = await db.query.users(
        {
          where: {
            AND: [
              { accountStatus: "PAST_DUE" },
              { accountType_in: ["FULL", "ASSOCIATE"] }
            ]
          }
        },
        " { id, firstName, lastName, email } "
      );

      if (users && users.length > 0) {
        await Promise.all(
          users.map(async user => {
            return sendTransactionalEmail(
              getRemindUserOfPastDueStatusEmail(
                user.email,
                user.firstName,
                user.lastName
              )
            );
          })
        );

        console.log(`Reminding completed. ${users.length} emails sent.`);
      } else {
        console.log("Reminding completed. No results.");
      }

      return resolve();
    } catch (e) {
      console.log("Reminder report error", e);
      return resolve();
    }
  });

(async () => {
  console.log("Running March 1 script");
  await march1();
  console.log("March 1 script completed");
})();
