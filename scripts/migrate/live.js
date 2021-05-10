require("dotenv").config({ path: "../../variables.env" });
const { promisify } = require("util");
const { randomBytes } = require("crypto");
const { postgres } = require("./db");
const { format, subYears } = require("date-fns");

const { sendTransactionalEmail } = require("../../src/mail");
const { getMigrationEmail } = require("../../src/utils/mail-templates");
const { resetTokenTimeoutInMs } = require("../../src/utils");

const promisifiedRandomBytes = promisify(randomBytes);

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

    const currentMembers = await postgres("User")
      .select("id", "firstName", "email")
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

    const activeGuests = await postgres("User")
      .select("id", "firstName", "email")
      .where("accountStatus", "=", "ACTIVE")
      .andWhere("accountType", "=", "GUEST")
      .andWhere("lastLogin", ">", dateOneYearAgo);

    const users = [...currentMembers, ...activeGuests];

    await users.map(async user => {
      // Set reset token and expiration
      const resetToken = (await promisifiedRandomBytes(20)).toString("hex");
      const resetTokenExpiry = Date.now() + resetTokenTimeoutInMs;

      // Create password reset token
      try {
        await postgres("User")
          .update({
            resetToken,
            resetTokenExpiry
          })
          .where({ id: user.id });
      } catch (e) {
        console.error(e);
        return Promise.reject(e);
      }

      // Send emails
      try {
        await sendTransactionalEmail(
          getMigrationEmail({
            email: user.email,
            firstName: user.firstName,
            resetToken
          })
        );
      } catch (e) {
        console.error(e);
        return Promise.reject(e);
      }

      console.log(`SUCCESS: Emailed ${user.firstName}`);
      return Promise.resolve();
    });

    // STOP. You're done.
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

return fn();
