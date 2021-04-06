// Automatically change Active Full Member status to Past Due
//   if no dues received after 1/1 of each year
//   and send email, tag as 'past due'
//   update ACCOUNT_STATUS

// TODO: Automatically change Full Member status to Delinquent
//   if no meetings/runs attended in the last year
//   and send email, tag as 'past due'
//   remove from members mailing list

// Change LIMITED GUESTS to ACTIVE, notify

/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/
require("dotenv").config({ path: "variables.env" });

const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const {
  getNotifyUserOfInactiveStatusEmail,
  getNotifyBoardOfInactiveMembersEmail
} = require("../utils/mail-templates");
const membershipLog = require("../utils/membership-log");

const jan1 = async () => Promise.all([deactivate()]);

// Automatically change Delinquent Full Member status to Inactive
//   if no dues received in the last year
//   send email to board
//   send email to member
//   update ACCOUNT_STATUS
const deactivate = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const users = await db.query.users(
        {
          where: {
            accountStatus: "DELINQUENT"
          }
        },
        " { id, firstName, lastName, email } "
      );

      if (users && users.length > 0) {
        await Promise.all(
          users.map(async user => {
            return db.mutation.updateUser({
              data: {
                accountStatus: "INACTIVE",
                membershipLog: {
                  create: membershipLog.accountChanged({
                    stateName: "Status",
                    newState: "INACTIVE"
                  })
                }
              },
              where: {
                id: user.id
              }
            });
          })
        );

        // Email board
        await sendTransactionalEmail(
          getNotifyBoardOfInactiveMembersEmail(users)
        );

        console.log(`Deactivating completed. ${users.length} emails sent.`);
      } else {
        console.log("Deactivating completed. No results.");
      }

      return resolve();
    } catch (e) {
      console.log("Deactivating report error", e);
      return resolve();
    }
  });

(async () => {
  console.log("Running January 1 script");
  await jan1();
  console.log("January 1 script completed");
})();
