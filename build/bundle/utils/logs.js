module.exports = {
  accountCreated: () => ({
    message: "Account created"
  }),
  accountUnlocked: ({ logger }) => ({
    message: `Account unlocked by ${logger}`
  }),
  accountChanged: ({ property, afterState, logger }) => {
    // logger
    //   ? `${property} changed from "${beforeState}" to "${afterState}" by ${logger}`
    //   : `${property} automatically changed from "${beforeState}" to "${afterState}"`,
    return {
      time: new Date(),
      message: `Account type changed to "${afterState}" by ${logger.firstName} ${logger.lastName}`,
      messageCode: "ACCOUNT_CHANGED",
      logger: {
        connect: {
          id: logger.id
        }
      }
    };
  },
  accountRejected: ({ logger, reason }) =>
    `Account rejected by ${logger}: ${reason}`,
  duesPaid: ({ logger }) =>
    logger ? `Dues received by ${logger}` : `Dues received via website`,
  officeAdded: ({ office, logger }) => `"${office}" office added by ${logger}`,
  officeRemoved: ({ office, logger }) =>
    `"${office}" office removed by ${logger}`,
  titleAdded: ({ title, logger }) => `"${title}" title added by ${logger}`,
  titleRemoved: ({ title, logger }) => `"${title}" title removed by ${logger}`,
  membershipEligible: () => "Eligible for membership",
  guestRestricted: () => "Attended 3 runs"
};
