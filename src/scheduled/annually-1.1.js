// TODO: Automatically change Full Member status to Delinquent
//   if no meetings/runs attended in the last year
//   and send email, tag as 'past due'
//   remove from members mailing list

/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/
require("dotenv").config({ path: "variables.env" });
const { startOfDay, setHours, setMinutes } = require("date-fns");
const { parseFromTimeZone } = require("date-fns-timezone");
const { guestMaxRuns, months } = require("../config");

const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const {
  getNotifyBoardOfInactiveMembersEmail,
  getNotifyUserOfPastDueStatusEmail,
  getNotifyUserOfRestrictedResetEmail,
  getNotifyBoardOfRestrictedResetEmail,
  getNotifyWebmasterOfMeetingEventsGeneration
} = require("../utils/mail-templates");
const membershipLog = require("../utils/membership-log");
const { getSecondMondayInMonth } = require("../utils");
const {
  meetingLocation,
  meetingStartTime,
  meetingEndTime
} = require("../config");

const jan1 = async () => {
  const date = startOfDay(new Date());

  if (date.getMonth() === 0 && date.getDate() === 1) {
    console.log("It is January 1st - game time!");
    return Promise.all([
      deactivate(),
      badger(),
      cleanSlateProtocol(),
      monthlyMeetingRefill()
    ]);
  }

  console.log("Not today, satan");
  return Promise.resolve();
};

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
            AND: [
              { accountStatus: "DELINQUENT" },
              { accountType_in: ["FULL", "ASSOCIATE"] }
            ]
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

// Automatically change Active Full Member status to Past Due
//   if no dues received after 1/1 of each year
//   and send email, tag as 'past due'
//   update ACCOUNT_STATUS
const badger = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const users = await db.query.users(
        {
          where: {
            accountStatus: "ACTIVE",
            accountType_in: ["FULL", "ASSOCIATE"]
          }
        },
        " { id, firstName, lastName, email } "
      );

      if (users && users.length > 0) {
        await Promise.all(
          users.map(async user => {
            await db.mutation.updateUser({
              data: {
                accountStatus: "PAST_DUE",
                membershipLog: {
                  create: membershipLog.accountChanged({
                    stateName: "Status",
                    newState: "PAST_DUE"
                  })
                }
              },
              where: {
                id: user.id
              }
            });

            // @TODO: Update tag in SendGrid members newsletter list

            return sendTransactionalEmail(
              getNotifyUserOfPastDueStatusEmail(
                user.email,
                user.firstName,
                user.lastName
              )
            );
          })
        );

        console.log(`Badgering completed. ${users.length} emails sent.`);
      } else {
        console.log("Badgering completed. No results.");
      }

      return resolve();
    } catch (e) {
      console.log("Badgering report error", e);
      return resolve();
    }
  });

// Change LIMITED GUESTS to ACTIVE, notify
const cleanSlateProtocol = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const users = await db.query.users(
        {
          where: {
            AND: [{ accountStatus: "LIMITED" }, { accountType: "GUEST" }]
          }
        },
        " { id, firstName, lastName, email } "
      );

      if (users && users.length > 0) {
        await Promise.all(
          users.map(async user => {
            await db.mutation.updateUser({
              data: {
                accountStatus: "ACTIVE",
                membershipLog: {
                  create: membershipLog.accountChanged({
                    stateName: "Status",
                    newState: "ACTIVE"
                  })
                }
              },
              where: {
                id: user.id
              }
            });

            return sendTransactionalEmail(
              getNotifyUserOfRestrictedResetEmail(
                user.email,
                user.firstName,
                user.lastName,
                guestMaxRuns
              )
            );
          })
        );

        // Email board
        await sendTransactionalEmail(
          getNotifyBoardOfRestrictedResetEmail(users, guestMaxRuns)
        );

        console.log(`Clean slate completed. ${users.length} emails sent.`);
      } else {
        console.log("Clean slate completed. No results.");
      }

      return resolve();
    } catch (e) {
      console.log("Clean slate report error", e);
      return resolve();
    }
  });

// Generate monthly meetings
const monthlyMeetingRefill = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const currentDate = new Date().toISOString(); // ex: 1/1/20xx UTC
      const events = Object.keys(months).map(async month => {
        const localDate = startOfDay(
          parseFromTimeZone(currentDate, {
            timeZone: "America/Denver"
          })
        ); // local

        const eventDate = getSecondMondayInMonth(month, localDate); // local

        const startTime = setMinutes(
          setHours(
            eventDate,
            meetingStartTime.split(":")[0] // hour,
          ),
          meetingStartTime.split(":")[1] // minutes
        ); // local

        const endTime = setMinutes(
          setHours(
            eventDate,
            meetingEndTime.split(":")[0] // hour
          ),
          meetingEndTime.split(":")[1] // minutes
        ); // local

        const president = {
          connect: {
            office: "PRESIDENT"
          }
        };

        return db.mutation.createEvent({
          data: {
            type: "MEETING",
            title: `${months[month]} Membership Meeting`,
            description: "",
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            address: meetingLocation,
            membersOnly: false,
            creator: president,
            host: president,
            rsvps: {
              create: [
                {
                  member: president,
                  status: "GOING"
                }
              ]
            }
          }
        });
      });

      await sendTransactionalEmail(
        getNotifyWebmasterOfMeetingEventsGeneration()
      );

      console.log(
        `Monthly meeting refill completed. ${events.length} created.`
      );

      return resolve();
    } catch (e) {
      console.log("Monthly meeting refill report error", e);
      return resolve();
    }
  });

(async () => {
  console.log("Running January 1 script");
  await jan1();
  console.log("January 1 script completed");
})();
