/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/
require("dotenv").config({ path: "variables.env" });

const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const {
  getNotifyUserOfDelinquentStatusEmail,
  getNotifyBoardOfDelinquentsEmail
} = require("../utils/mail-templates");
const membershipLog = require("../utils/membership-log");

const april1 = async () => Promise.all([delinquentize()]);

// Automatically change Past Due Full Member status to Delinquent
//   if no dues received after 3/31 of each year
//   send email
//   remove from members list
//   remove 'past due' tag
const delinquentize = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const users = await db.query.users(
        {
          where: {
            accountStatus: "PAST_DUE"
          }
        },
        " { id, firstName, lastName, email } "
      );

      if (users && users.length > 0) {
        await Promise.all(
          users.map(async user => {
            await db.mutation.updateUser({
              data: {
                accountStatus: "DELINQUENT",
                membershipLog: {
                  create: membershipLog.accountChanged({
                    stateName: "Status",
                    newState: "DELINQUENT"
                  })
                }
              },
              where: {
                id: user.id
              }
            });

            // @TODO: Remove from SendGrid members newsletter list

            return sendTransactionalEmail(
              getNotifyUserOfDelinquentStatusEmail(
                user.email,
                user.firstName,
                user.lastName
              )
            );
          })
        );

        // Email board
        await sendTransactionalEmail(getNotifyBoardOfDelinquentsEmail(users));

        console.log(`Delinquentizing completed. ${users.length} emails sent.`);
      } else {
        console.log("Delinquentizing completed. No results.");
      }

      return resolve();
    } catch (e) {
      console.log("Delinquent report error", e);
      return resolve();
    }
  });

(async () => {
  console.log("Running April 1 script");
  await april1();
  console.log("April 1 script completed");
})();
