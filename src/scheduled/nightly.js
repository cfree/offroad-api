/*
- https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes
- http://www.modeo.co/blog/2015/1/8/heroku-scheduler-with-nodejs-tutorial
- https://stackoverflow.com/questions/13345664/using-heroku-scheduler-with-node-js#answer-49524719
*/
require("dotenv").config({ path: "variables.env" });
const { startOfDay, endOfDay, addDays, subDays } = require("date-fns");

const db = require("../db");
const { sendTransactionalEmail } = require("../mail");
const {
  getRunReminderEmail,
  getReportReminderEmail,
  getNotifyUserOfRestrictedStatusEmail,
  getNotifyBoardOfRestrictedGuestsEmail
} = require("../utils/mail-templates");
const activityLog = require("../utils/activity-log");
const membershipLog = require("../utils/membership-log");

const nightly = async () =>
  Promise.all([
    eventReminders(),
    runReportReminders(),
    guestLockouts()
    // lockedAccountReminders
  ]);

const GUEST_MAX_RUNS = 2;

// Send event reminders to attendees if their event is tomorrow
const eventReminders = async () =>
  new Promise(async (resolve, reject) => {
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
                rsvps_some: {
                  status: "GOING"
                }
              }
            ]
          }
        },
        "{ id type title startTime rallyAddress rsvps { status member { id email firstName lastName } } }"
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
const runReportReminders = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const events = await db.query.events(
        {
          where: {
            AND: [
              {
                OR: [{ type: "RUN" }, { type: "CAMPING" }]
              },
              { endTime_gte: startOfDay(subDays(new Date(), 1)) },
              { endTime_lt: endOfDay(subDays(new Date(), 1)) },
              {
                rsvps_some: { status: "GOING" }
              }
            ]
          }
        },
        "{ id title endTime host { id email firstName lastName } rsvps { id status member { id email firstName lastName } } }"
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
const guestLockouts = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const rsvps = await db.query.rSVPs(
        {
          where: {
            AND: [
              { status: "GOING" },
              {
                event: {
                  endTime_lt: endOfDay(subDays(new Date(), 1))
                }
              },
              {
                member: {
                  AND: [
                    { accountType: "GUEST" },
                    { accountStatus_in: ["ACTIVE", "PAST_DUE"] }
                  ]
                }
              }
            ]
          }
        },
        " { id, isRider, event { id, title, startTime }, member { id, firstName, lastName, email } } "
      );

      const usersToLockOut = rsvps.reduce((memo, rsvp) => {
        if (rsvp.isRider === true) {
          return memo;
        }

        return memo[rsvp.member.id]
          ? {
              ...memo,
              [rsvp.member.id]: {
                id: rsvp.member.id,
                details: {
                  firstName: rsvp.member.firstName,
                  lastName: rsvp.member.lastName,
                  email: rsvp.member.email
                },
                events: {
                  ...memo[rsvp.member.id].events,
                  [rsvp.event.id]: rsvp.event
                }
              }
            }
          : {
              ...memo,
              [rsvp.member.id]: {
                id: rsvp.member.id,
                details: {
                  firstName: rsvp.member.firstName,
                  lastName: rsvp.member.lastName,
                  email: rsvp.member.email
                },
                events: {
                  [rsvp.event.id]: rsvp.event
                }
              }
            };
      }, {});

      const filteredUsers = Object.values(usersToLockOut).reduce(
        (memo, user) => {
          if (Object.values(user.events).length < GUEST_MAX_RUNS) {
            return memo;
          }

          return [...memo, user];
        },
        []
      );

      if (filteredUsers && filteredUsers.length > 0) {
        await Promise.all(
          filteredUsers.map(async user => {
            const events = Object.values(user.events);

            // Update records
            await db.mutation.updateUser({
              data: {
                accountStatus: "LIMITED"
              },
              where: {
                id: user.id
              }
            });

            // Email users
            return sendTransactionalEmail(
              getNotifyUserOfRestrictedStatusEmail(
                user.details.email,
                user.details.firstName,
                user.details.lastName,
                events,
                GUEST_MAX_RUNS
              )
            );
          })
        );

        // Email board
        await sendTransactionalEmail(
          getNotifyBoardOfRestrictedGuestsEmail(filteredUsers, GUEST_MAX_RUNS)
        );
      }

      if (filteredUsers && filteredUsers.length > 0) {
        console.log(
          `Guest lockouts completed. ${filteredUsers.length} emails sent.`
        );
      } else {
        console.log("Guest lockouts completed. No results.");
      }

      return resolve();
    } catch (e) {
      console.log("Event report error", e);
      return resolve();
    }
  });

// @TODO - Locked accounts reminder to secretary/webmaster
//    has it been 3 days since the user created their account?
//    send email to board
const lockedAccountReminders = new Promise((resolve, reject) => resolve());

(async () => {
  console.log("Running nightly script");
  await nightly();
  console.log("Nightly script completed");
})();
