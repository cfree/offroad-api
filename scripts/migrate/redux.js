require("dotenv").config({ path: "../../variables.env" });
const { postgres } = require("./db");
const { format, subYears } = require("date-fns");

const { sendTransactionalEmail } = require("../../src/mail");
const { getMigrationFollowupEmail } = require("../../src/utils/mail-templates");

/**
 * Notify users of new site and procedure
 *
 * Must run all migration scripts first
 *
 * Assumes data in all json files has been massaged and site is live
 */

const fn = async () => {
  try {
    /**
     * Site is live, send out migration emails
     */
    const dateOneYearAgo = format(subYears(new Date(), 1), "YYYY-MM-DD");
    let currentMembers, activeGuests;

    try {
      currentMembers = await postgres("User")
        .select("id", "firstName", "email", "resetToken")
        .where(function() {
          this.where({ accountStatus: "ACTIVE" }).orWhere({
            accountStatus: "PAST_DUE"
          });
        })
        .andWhere(function() {
          this.where({ accountType: "FULL" })
            .orWhere({ accountType: "ASSOCIATE" })
            .orWhere({ accountType: "EMERITUS" });
        });

      activeGuests = await postgres("User")
        .select("id", "firstName", "email", "resetToken")
        .where("accountStatus", "=", "ACTIVE")
        .andWhere("accountType", "=", "GUEST")
        .andWhere("lastLogin", ">", dateOneYearAgo);

      const users = [...currentMembers, ...activeGuests];

      await users.map(async user => {
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            // Send emails
            try {
              await sendTransactionalEmail(
                getMigrationFollowupEmail({
                  email: user.email,
                  firstName: user.firstName,
                  resetToken: user.resetToken
                })
              );
            } catch (e) {
              console.error(e);
              reject(e);
            }

            console.log(`SUCCESS: Emailed ${user.email}`);
            resolve();
          }, 1000);
        });
      });
    } catch (e) {
      console.error(e);
    }

    // STOP. You're done.
    console.log(`DONE`);
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

return fn();
