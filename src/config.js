module.exports = {
  // Deprecated in favor of roles
  // 'permissions': [
  //   'DASHBOARD_AREA', // All except locked/inactive/resigned/removed
  //   'ADMIN_AREA', // Board, admin
  //   'VOTE_READ', // Full member
  //   'USER_DELETE', // Admin
  //   'ROSTER_READ', // Full members, emeritus, board, admin
  //   'PERMISSION_UPDATE', // Admin
  // ],
  roles: [
    "ADMIN", // Manage permissions
    "OFFICER", // Administrative area
    "RUN_MASTER", // Able to create events
    "RUN_LEADER", // Able to view extra event details, log run report
    "USER" // DEFAULT
  ],
  accountStatus: [
    "ACTIVE",
    "PAST_DUE", // account overdue - active, must pay
    "DELINQUENT", // account 3 months to 1 year overdue - locked, contact, must pay
    "INACTIVE", // account 1+ year overdue - locked, contact
    "REMOVED", // cannot do anything - locked, contact
    "RESIGNED", // cannot do anything - locked, contact
    "REJECTED", // cannot do anything
    "LIMITED", // attended too many runs - locked, must become member
    "LOCKED", // DEFAULT - must be approved
    "DECEASED"
  ],
  accountType: [
    "FULL",
    "ASSOCIATE", // No voting rights, no member's only events/discussion
    "EMERITUS", // Same as Associate
    "GUEST" // DEFAULT - confirmed user. No roster, no voting rights, no member's only events/discussion
  ],
  offices: {
    PRESIDENT: "President", // unique
    VICE_PRESIDENT: "Vice President", // unique
    SECRETARY: "Secretary", // unique
    TREASURER: "Treasurer" // unique
  },
  titles: {
    WEBMASTER: "Webmaster",
    // RUN_MASTER: "Run Master",
    // RUN_LEADER: "Run Leader",
    HISTORIAN: "Historian",
    CHARTER_MEMBER: "Charter Member"
  },
  emailGroups: [
    "officers",
    "runmaster",
    "webmaster",
    "run_leaders",
    "full_membership", // Membership announcement, membership newsletter
    "all_active", // Events, general announcements
    "guests",
    "all_users" // EVERYONE EVER
  ],
  timezoneOffsetInMs: 25200000,
  defaultPaginationSize: 20,
  guestMaxRuns: 3,
  months: {
    0: "January",
    1: "February",
    2: "March",
    3: "April",
    4: "May",
    5: "June",
    6: "July",
    7: "August",
    8: "September",
    9: "October",
    10: "November",
    11: "December"
  },
  meetingLocation: "Charlie's Denver, 900 E Colfax Ave, Denver, CO 80218",
  meetingStartTime: "19:00", // 7pm
  meetingEndTime: "20:30", // 8:30pm
  clubName: "4-Players of Colorado",
  clubPOBox: "PO Box 300001",
  clubCityStateZip: "Denver, CO 80203",
  clubAddress: "PO Box 300001, Denver, CO 80203"
};

/**
 * Check Logged-in
 * Check Role
 * Check Account Status
 */
