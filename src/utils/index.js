const isEqual = require("lodash/isEqual");

const membershipLog = require("../utils/membership-log");

module.exports.hasRole = function hasRole(
  user,
  rolesNeeded,
  shouldThrow = true
) {
  const matchedRoles = rolesNeeded.includes(user.role);

  if (!matchedRoles && shouldThrow) {
    throw new Error(`You do not have the necessary role
      : ${rolesNeeded}
      You Have
      : ${user.role}
    `);
  }

  return matchedRoles;
};

module.exports.hasAccountStatus = function hasAccountStatus(
  user,
  statusNeeded,
  shouldThrow = true
) {
  const matchedStatus = statusNeeded.includes(user.accountStatus);

  if (!matchedStatus && shouldThrow) {
    throw new Error(`You do not have the necessary account status
      : ${statusNeeded}
      You Have
      : ${user.accountStatus}
    `);
  }

  return matchedStatus;
};

module.exports.hasAccountType = function hasAccountType(
  user,
  typeNeeded,
  shouldThrow = true
) {
  const matchedType = typeNeeded.includes(user.accountType);

  if (!matchedType && shouldThrow) {
    throw new Error(`You do not have the necessary account type
      : ${typeNeeded}
      You Have
      : ${user.accountType}
    `);
  }

  return matchedType;
};

module.exports.hasRoleOrIsSelf = function hasRoleOrIsSelf(
  currentUser,
  rolesNeeded,
  idInQuestion,
  shouldThrow = true
) {
  const result =
    hasRole(currentUser, rolesNeeded, false) ||
    isSelf(currentUser.id, idInQuestion, false);

  if (!result && shouldThrow) {
    throw new Error("You must be an admin to do this");
  }
};

module.exports.isSelf = function isSelf(
  currentUser,
  idInQuestion,
  shouldThrow = true
) {
  const result = currentUser.id === idInQuestion;

  // console.log("current user id", currentUser.id);

  if (!result && shouldThrow) {
    throw new Error("You can only update your own information");
  }

  return result;
};

module.exports.yearInMs = 1000 * 60 * 60 * 24 * 365; // 1 year
module.exports.monthInMs = 1000 * 60 * 60 * 24 * 30;
module.exports.resetTokenTimeoutInMs = 3600000; // 1 hour

module.exports.datePrintFormat = "M/D/YYYY hh:mma";

module.exports.getUploadLocation = appendage =>
  process.env.NODE_ENV === "development"
    ? `dev_${appendage}`
    : `prod_${appendage}`;

module.exports.getDuesAmountIncludingFees = (
  fullMemberCount = 1,
  associateMemberCount = 0
) => {
  // Current: Stripe
  // 2.9% + $0.30 per transaction
  const fullMemberDues =
    parseInt(process.env.FULL_MEMBERSHIP_DUES, 10) * fullMemberCount;

  const associateMemberDues =
    parseInt(process.env.ASSOCIATE_MEMBERSHIP_DUES, 10) * associateMemberCount;

  const dues = fullMemberDues + associateMemberDues;

  return ((dues + 0.3) / (1 - 0.029)).toFixed(2);
};

module.exports.convertToCents = dollarAmt => {
  return dollarAmt * 100;
};

module.exports.determineTitleChanges = (
  existingTitles,
  newTitles,
  userId,
  shouldThrow = false
) => {
  const safeExistingTitles = existingTitles ? existingTitles : [];
  const safeNewTitles = newTitles ? newTitles : [];

  // oldList that aren't in newList
  const toRemove = safeExistingTitles.filter(
    item => !safeNewTitles.includes(item)
  );

  // newList that aren't in oldList
  const toAdd = safeNewTitles.filter(
    item => !safeExistingTitles.includes(item)
  );

  if (toRemove.length === 0 && toAdd.length === 0 && shouldThrow) {
    throw new Error("No titles to change");
  }

  if (toRemove.length > 0 && isEqual(toRemove, toAdd) && shouldThrow) {
    throw new Error("Cannot change titles to the same titles");
  }

  const toLog = [
    ...toRemove.map(title =>
      membershipLog.titleChanged({
        titleName: title,
        userId,
        add: false
      })
    ),
    ...toAdd.map(title =>
      membershipLog.titleChanged({
        titleName: title,
        userId,
        add: true
      })
    )
  ];

  return [toRemove, toAdd, toLog];
};

module.exports.determineOfficeChanges = (
  existingOffice,
  newOffice,
  userId,
  shouldThrow = false
) => {
  const toRemove = existingOffice === null ? "" : existingOffice;
  const toAdd = newOffice === null ? "" : newOffice;

  if (!toRemove && !toAdd && shouldThrow) {
    throw new Error("No office to change");
  }

  if (toRemove !== "" && toRemove === toAdd && shouldThrow) {
    throw new Error("Cannot change office to the same office");
  }

  const toLog = [];

  if (toRemove && toRemove !== toAdd) {
    toLog.push(
      membershipLog.officeChanged({
        officeName: toRemove,
        userId,
        add: false
      })
    );
  }

  if (toAdd && toRemove !== toAdd) {
    toLog.push(
      membershipLog.officeChanged({
        officeName: toAdd,
        userId,
        add: true
      })
    );
  }

  return [toRemove, toAdd, toLog];
};
