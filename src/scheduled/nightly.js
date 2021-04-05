/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/

const { startOfDay, endOfDay, addDays, subDays } = require("date-fns");

const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const { getRunReminderEmail, getReportReminderEmail } = require("../utils/mail-templates");
const activityLog = require("../utils/activity-log");
const membershipLog = require("../utils/membership-log");

const nightly = async () => {
  console.log("Running nightly script");

  await Promise.all([
    eventReminders,
    // runReportReminders,
    // guestLockouts,
    // lockedAccountReminders
  ]);

  console.log("Nightly script completed");
};

// Send event reminders to attendees if their event is tomorrow
const eventReminders = new Promise(async (resolve, reject) => {
  console.log("Starting event reminders");

  try {
    const events = await db.query.events(
      {
        where: {
          AND: [
            { type: "RUN" },
            { startTime_gte: startOfDay(addDays(new Date(), 1)) },
            { startTime_lt: endOfDay(addDays(new Date(), 1)) },
            {
              rsvps_some: { status: "GOING" }
            }
          ]
        }
      },
      "{ id, type, title, startTime, rallyAddress, rsvps { id, status, member { id, email, firstName, lastName } } }"
    );

    let emailCount = 0;

    for (let event of events) {
      const { id, title, type, startTime, rallyAddress } = event;

      console.log("Composing emails for ", event.title);

      for (let rsvp of event.rsvps) {
        const { member, status } = rsvp;
        const { email, firstName, lastName } = member;

        if (status === "GOING") {
          emailCount++;

          await sendTransactionalEmail(
            getRunReminderEmail(email, firstName, lastName, {
              id,
              title,
              type,
              startTime,
              rallyAddress
            })
          );
        }
      }
    }

    if (events && events.length) {
      console.log(`Event reminders completed. ${emailCount} emails sent.`);
    } else {
      console.log("Event reminders completed. No results.");
    }

    return resolve();
  } catch (e) {
    console.log("Event reminders error", e);
    return resolve();
  }
});

// Remind run leader to submit run report
const runReportReminders = new Promise((resolve, reject) => {
  try {
    const events = await db.query.events(
      {
        where: {
          AND: [
            { 
              OR: [
                { type: "RUN" },
                { type: "CAMPING" }
              ],
            },
            { endTime_gte: startOfDay(new Date()) },
            { endTime_lt: endOfDay(new Date()) },
            {
              rsvps_some: { status: "GOING" }
            }
          ]
        }
      },
      "{ id, title, endTime, host { id, email, firstName, lastName }, rsvps { id, status, member { id, email, firstName, lastName } }"
    );

    await Promise.all(
      events.map(async event => {
        const { id, title, endTime, host } = event;

        return sendTransactionalEmail(
          getReportReminderEmail(host.email, host.firstName, host.lastName, {
            id,
            title,
            endTime
          })
        );
      })
    );

    // TODO: Remind attendees to... submit photos? Fill out survey?

    return resolve();
  } catch (e) {
    console.log("Event report error", e);
    return resolve();
  }
});

// Post run: Guest lockout
const guestLockouts = new Promise((resolve, reject) => {
  const users = await db.query.users(
    {
      where: {
        AND: [
          { accountType: 'GUEST' },
          { accountStatus_not: 'LIMITED' },
          { 
            eventsRSVPd_every: { 
              status: "GOING", 
              event: { 
                AND: [
                  { endTime_lt: endOfDay(new Date()) },
                  { isRider: false }
                ]
              }
            }
          }
        ]
      }
    },
    "{ id, firstName, lastName, eventsRSVPd { event { id, email, firstName, lastName } }"
  );

  // Update records
  await Promise.all(
    users.map(async user => {
      return db.mutation.updateUsers({
        //   Add GUEST_RESTRICTED log
      //   Change status to LIMITED
      });
    })
  );

  // Email users
  await Promise.all(
    users.map(async user => {
      return sendTransactionalEmail(
        // getNotifyUserOfRestrictedStatusEmail(host.email, host.firstName, host.lastName, {
        //   id,
        //   title,
        //   endTime
        // })
      );
    })
  );

  // Email board
  await sendTransactionalEmail(
    // getNotifyBoardOfRestrictedGuestsEmail(host.email, host.firstName, host.lastName, {
    //   id,
    //   title,
    //   endTime
    // });
  );

  return resolve();
});

// @TODO - Locked accounts reminder to secretary/webmaster
//    has it been 3 days since the user created their account?
//    send email to board
const lockedAccountReminders = new Promise((resolve, reject) => resolve());

module.exports = nightly;
