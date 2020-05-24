/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/

const { startOfDay, addDays } = require("date-fns");

const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const { getRunReminderEmail } = require("../utils/mail-templates");
const activityLog = require("../utils/activity-log");
const membershipLog = require("../utils/membership-log");

const nightly = async () => {
  console.log("Running nightly script");

  await Promise.all([
    eventReminders,
    runReportReminders,
    guestLockouts,
    lockedAccountReminders
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
            { startTime_lt: startOfDay(addDays(new Date(), 2)) },
            {
              rsvps_some: { status: "GOING" }
            }
          ]
        }
      },
      "{ id, type, title, startTime, rallyTime, rallyAddress, rsvps { id, status, member { id, email, firstName, lastName } } }"
    );

    let emailCount = 0;

    for (let event of events) {
      const { id, title, type, startTime, rallyTime, rallyAddress } = event;

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
              rallyTime,
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

// Post run: Run Report/Bandaid Report to run leader
//    did an Run event end today?
//    send run leader a reminder to submit a run report
const runReportReminders = new Promise((resolve, reject) => resolve());

// Post run: Guest lockout
//    how many guests have attended 3 runs at least 5 days ago or longer
//    and do not have 'LIMITED' status?
//    GUEST_RESTRICTED
//    send guest an email
//    send board an email
const guestLockouts = new Promise((resolve, reject) => resolve());

// Locked accounts reminder to secretary/webmaster
//    has it been 3 days since the user created their account?
//    send email to board
const lockedAccountReminders = new Promise((resolve, reject) => resolve());

module.exports = nightly;
