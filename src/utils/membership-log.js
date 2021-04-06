const { accountType } = require("../config");

//   GUEST_RESTRICTED           AUTO/TRANSACTIONAL

module.exports.duesPaid = (amt, logger, payerName) => {
  const wasLoggedByAdmin = !!logger;
  const didPayForAnother = !!payerName;

  if (didPayForAnother) {
    // paid by...
    return {
      time: new Date(),
      message: `$${amt} paid for by ${payerName} via website`,
      messageCode: "DUES_PAID"
    };
  }

  if (wasLoggedByAdmin) {
    return {
      time: new Date(),
      message: `Paid $${amt}`,
      messageCode: "DUES_PAID",
      logger: {
        connect: {
          id: logger.userId
        }
      }
    };
  }

  return {
    time: new Date(),
    message: `Paid $${amt} via website`,
    messageCode: "DUES_PAID"
  };
};

module.exports.accountCreated = () => ({
  time: new Date(),
  message: "Account created",
  messageCode: "ACCOUNT_CREATED"
});

module.exports.accountUnlocked = userId => ({
  time: new Date(),
  message: "Account unlocked",
  messageCode: "ACCOUNT_UNLOCKED",
  logger: {
    connect: {
      id: userId
    }
  }
});

module.exports.accountRejected = (userId, note) => ({
  time: new Date(),
  message: `Account rejected: ${note}`,
  messageCode: "ACCOUNT_REJECTED",
  logger: {
    connect: {
      id: userId
    }
  }
});

module.exports.accountChanged = ({ stateName, newState, userId }) => ({
  time: new Date(),
  message: `${stateName} changed to "${newState}"`,
  messageCode: "ACCOUNT_CHANGED",
  ...(userId
    ? {
        logger: {
          connect: {
            id: userId
          }
        }
      }
    : {})
});

module.exports.officeChanged = ({ officeName, userId, add = true }) => {
  const defaultLog = {
    time: new Date(),
    logger: {
      connect: {
        id: userId
      }
    }
  };

  if (add) {
    return {
      message: `${officeName} office added`,
      messageCode: "OFFICE_ADDED",
      ...defaultLog
    };
  }

  return {
    message: `${officeName} office removed`,
    messageCode: "OFFICE_REMOVED",
    ...defaultLog
  };
};

module.exports.titleChanged = ({ titleName, userId, add = true }) => {
  const defaultLog = {
    time: new Date(),
    logger: {
      connect: {
        id: userId
      }
    }
  };

  if (add) {
    return {
      message: `${titleName} title added`,
      messageCode: "TITLE_ADDED",
      ...defaultLog
    };
  }

  return {
    message: `${titleName} title removed`,
    messageCode: "TITLE_REMOVED",
    ...defaultLog
  };
};
