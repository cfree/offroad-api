export const hasRole = function hasRole(user, rolesNeeded, shouldThrow = true) {
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

export const hasAccountStatus = function hasAccountStatus(
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

export const hasAccountType = function hasAccountType(
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

export const hasRoleOrIsSelf = function hasRoleOrIsSelf(
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

export const isSelf = function isSelf(
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

export const yearInMs = 1000 * 60 * 60 * 24 * 365; // 1 year
export const monthInMs = 1000 * 60 * 60 * 24 * 30;
export const resetTokenTimeoutInMs = 3600000; // 1 hour

export const getUploadLocation = appendage =>
  process.env.NODE_ENV === "development"
    ? `dev_${appendage}`
    : `prod_${appendage}`;
