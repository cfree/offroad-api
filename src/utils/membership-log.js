const { accountType } = require("../config");

//   DUES_PAID                  TODO/TRANSACTIONAL
//   GUEST_RESTRICTED           AUTO/TRANSACTIONAL

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
  logger: {
    connect: {
      id: userId
    }
  }
});

module.exports.officeChanged = ({ officeName, userId, added = true }) => {
  const defaultLog = {
    time: new Date(),
    logger: {
      connect: {
        id: userId
      }
    }
  };

  if (added) {
    return {
      message: `"${officeName}" office added`,
      messageCode: "OFFICE_ADDED",
      ...defaultLog
    };
  }

  return {
    message: `"${officeName}" office removed`,
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
      message: `"${titleName}" title added`,
      messageCode: "TITLE_ADDED",
      ...defaultLog
    };
  }

  return {
    message: `"${titleName}" title removed`,
    messageCode: "TITLE_REMOVED",
    ...defaultLog
  };
};

module.exports.membershipGranted = ({ userId, type = full }) => {
  const accountType =
    type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);

  return {
    time: new Date(),
    message: `Became a ${accountType} Member`,
    messageCode: "MEMBERSHIP_GRANTED",
    logger: {
      connect: {
        id: userId
      }
    }
  };
};
