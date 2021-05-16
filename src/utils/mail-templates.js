const { format } = require("date-fns");

const { datePrintFormat } = require("./index");

const isStaging =
  process.env.STAGING_ENV && process.env.STAGING_ENV === "staging";

const noReplyAddress =
  "4-Players of Colorado <no-reply@4-playersofcolorado.org>";
const webmasterAddress =
  "4-Players Webmaster <webmaster@4-playersofcolorado.org>";
const secretaryAddress = isStaging
  ? webmasterAddress
  : "4-Players Secretary <secretary@4-playersofcolorado.org>";
const vpAddress = isStaging
  ? webmasterAddress
  : "4-Players Vice President <vicepresident@4-playersofcolorado.org>";

const getUserAddress = (firstName, lastName, email) =>
  `${firstName} ${lastName} <${email}>`;

module.exports.getSecretaryNewUserEmail = username => ({
  to: secretaryAddress,
  from: noReplyAddress,
  subject: "New Account Registration",
  preheader: "A new guest account has been created",
  text: `
    A new guest account has been created:
    ${process.env.FRONTEND_URL}/profile/${username}

    This email has been automatically generated.
  `,
  html: `
    <p>A new guest account has been created: <a href="${
      process.env.FRONTEND_URL
    }/profile/${username}">${username}</a></p>

    <p>This email has been automatically generated.</p>
  `
});

module.exports.getUserNewAccountEmail = ({
  firstName,
  lastName,
  email,
  username
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: "New Account Registration",
  preheader: "Thanks for registering for a 4-Players account",
  text: `
  Hi ${firstName},

  Congratulations! Your new account has been created:
  ${process.env.FRONTEND_URL}/profile/${username}

  The secretary will review your account within 1-2 business days. Please make sure your profile is filled out.
  `,
  html: `
  <p>Hi ${firstName},</p>

  <p>Congratulations! Your new account has been created:
  ${process.env.FRONTEND_URL}/profile/${username}</p>

  <p>The secretary will review your account within 1-2 business days. Please make sure your profile is filled out.</p>
  `
});

module.exports.getUserWelcomeEmail = ({ email, firstName, lastName }) => ({
  to: getUserAddress(firstName, lastName, email),
  from: secretaryAddress,
  subject: "Account Approval",
  preheader: "Congratulations! Your account has been approved",
  text: `
    Welcome, ${firstName}!

    Thanks for signing up! Your account has been approved. Feel free to sign up for some events.

    Visit this URL to log in:
    ${process.env.FRONTEND_URL}/login
  `,
  html: `
    <p>Welcome, ${firstName}!</p>

    <p>Thanks for signing up! Thanks for signing up! Your account has been approved. Feel free to sign up for some events.</p>

    <p><a href="${
      process.env.FRONTEND_URL
    }/login">Visit the site</a> to log in</p>
  `
});

module.exports.getUserRejectionEmail = ({
  email,
  firstName,
  lastName,
  reason
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: secretaryAddress,
  subject: "Account Rejection",
  preheader: "We have some bad news",
  text: `
    Hello, ${firstName}

    Thanks for signing up, but unfortunately your account has been rejected. 
    
    Reason: ${reason}
    
    If you feel this rejection was made in error, please reply to this email so we can make the necessary corrections.
  `,
  html: `
    <p>Hello, ${firstName}</p>

    <p>Thanks for signing up, but unfortunately your account has been rejected.</p>

    <p>Reason: ${reason}</p>

    If you feel this rejection was made in error, please reply to this email so we can make the necessary corrections.
  `
});

module.exports.getUserWebsiteRegistrationEmail = ({
  email,
  firstName,
  lastName,
  resetToken
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: "Your Account Registration",
  preheader: "Continue with your profile creation",
  text: `
    ${firstName},

    Thanks for opting in!

    Visit this URL to create your profile:
    ${process.env.FRONTEND_URL}/signup?token=${resetToken}

    If you have any questions, please contact webmaster@4-playersofcolorado.org
  `,
  html: `
    <p>${firstName},</p>

    <p>Thanks for opting in!</p>

    <p>Please <a href="${
      process.env.FRONTEND_URL
    }/signup?token=${resetToken}">create your profile</a>.</p>

    <p>If you have any questions, please contact the <a href="mailto:webmaster@4-playersofcolorado.org">webmaster</a></p>
  `
});

module.exports.getUserEventRegistrationEmail = ({
  email,
  firstName,
  lastName,
  resetToken
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: "Invitation to Register",
  preheader: "You've been invited to register for an account",
  text: `
    Hi ${firstName},

    You recently attended a 4-Players of Colorado event as a guest and have been invited to create an account on the 4-Players website.

    Visit this URL to create your profile:
    ${process.env.FRONTEND_URL}/signup?token=${resetToken}

    If you have any questions, please contact webmaster@4-playersofcolorado.org

    If this message was sent to you in error, kindly disregard.
  `,
  html: `
    <p>Hi ${firstName},</p>

    <p>You recently attended a 4-Players of Colorado event as a guest and have been invited to create an account on the 4-Players website.</p>

    <p>Visit this URL to create your profile:
    ${process.env.FRONTEND_URL}/signup?token=${resetToken}</p>

    <p>If you have any questions, please contact the <a href="mailto:webmaster@4-playersofcolorado.org">webmaster</a></p>

    <p><small>If this message was sent to you in error, kindly disregard.</small></p>
  `
});

module.exports.getUserAdminRegistrationEmail = ({
  email,
  firstName,
  lastName,
  resetToken,
  inviter
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: "Invitation to Register",
  preheader: "You've been invited to register for an account",
  text: `
    Hi ${firstName},

    You've been invited by ${inviter} to create an account on the 4-Players of Colorado website.

    Visit this URL to create your profile:
    ${process.env.FRONTEND_URL}/signup?token=${resetToken}

    If you have any questions, please contact webmaster@4-playersofcolorado.org

    If this message was sent to you in error, kindly disregard.
  `,
  html: `
    <p>Hi ${firstName},</p>

    <p>You've been invited by ${inviter} to create an account on the 4-Players of Colorado website.</p>

    <p>Visit this URL to create your profile:
    ${process.env.FRONTEND_URL}/signup?token=${resetToken}</p>

    <p>If you have any questions, please contact the <a href="mailto:webmaster@4-playersofcolorado.org">webmaster</a></p>

    <p><small>If this message was sent to you in error, kindly disregard.</small></p>
  `
});

module.exports.getUserResetTokenEmail = ({
  email,
  firstName,
  lastName,
  username,
  resetToken
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: "Your Password Reset",
  preheader: "Here is your password reset",
  text: `
    ${firstName},

    Your password reset token for user "${username}" is here!

    Visit this URL to reset your password:
    ${process.env.FRONTEND_URL}/forgot-password?token=${resetToken}
  `,
  html: `
    <p>${firstName},</p>

    <p>Your password reset token for user "${username}" is here!
    <a href="${
      process.env.FRONTEND_URL
    }/forgot-password?token=${resetToken}">Click here to reset your password</a></p>
  `
});

module.exports.getRunReminderEmail = (
  email,
  firstName,
  lastName,
  eventDetails
) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: `Event Reminder: ${eventDetails.title} ${eventDetails.type}`,
  preheader: "We are expecting you at a run tomorrow",
  text: `
    ${firstName},

    You have an event coming up soon!

    ${eventDetails.title}
    Start time: ${format(new Date(eventDetails.startTime), datePrintFormat)}
    Rally location: ${eventDetails.rallyAddress}

    For more details or to edit your RSVP, please visit:
    ${process.env.FRONTEND_URL}/event/${eventDetails.id}

    If you can no longer attend, please update your RSVP so the Run Leader can get an accurate head count.
  `,
  html: `
    <p>${firstName},</p>

    <p>You have an event coming up tomorrow!</p>

    <p>
      ${eventDetails.title}<br/>
      Start time: ${format(
        new Date(eventDetails.startTime),
        datePrintFormat
      )}<br/>
      Rally location: ${eventDetails.rallyAddress}
    </p>

    <p>For more details or to edit your RSVP, please see <a href="${
      process.env.FRONTEND_URL
    }/event/${eventDetails.id}">the event details on the website</a>.</p>
    
    <p>If you can no longer attend, please update your RSVP so the Run Leader can get an accurate head count.</p>
  `
});

module.exports.getReportReminderEmail = (
  email,
  firstName,
  lastName,
  eventDetails
) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: `Run Report Reminder: ${eventDetails.title}`,
  preheader: "Please submit a run report",
  text: `
    ${firstName},

    How was your run?

    ${eventDetails.title}
    End time: ${format(new Date(eventDetails.endTime), datePrintFormat)}

    Please submit a run report at your earliest convenience:
    ${process.env.FRONTEND_URL}/event/${eventDetails.id}/submit-report
  `,
  html: `
    <p>${firstName},</p>

    <p>How was your run?</p>

    <p>
      ${eventDetails.title}<br/>
      End time: ${format(new Date(eventDetails.endTime), datePrintFormat)}
    </p>
    
    <p>Please <a href="${process.env.FRONTEND_URL}/event/${
    eventDetails.id
  }/submit-report">submit a run report</a> at your earliest convenience.</p>
  `
});

module.exports.getNotifyUserOfRestrictedStatusEmail = (
  email,
  firstName,
  lastName,
  events,
  max
) => {
  const count = events.length;
  const eventsMapText = events
    .map(
      event => `
    - ${event.title}
    `
    )
    .join("");

  return {
    to: getUserAddress(firstName, lastName, email),
    from: vpAddress,
    subject: `Account Status Change`,
    preheader: "Your account has been restricted",
    text: `
    ${firstName},

    Our records show that you've driven on ${count} runs:
    ${eventsMapText}
    
    Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. Your account has been restricted until the new year. 
    If you'd like to continue, we ask that you come to a meeting and seek membership.

    If you have any questions, please contact vicepresident@4-playersofcolorado.org
  `,
    html: `
    <p>${firstName},</p>

    <p>
      Our records show that you've driven on ${count} runs:
      <ul>
        ${events
          .map(
            event =>
              `<li>
              <a href="${process.env.FRONTEND_URL}/event/${event.id}">${
                event.title
              }</a>
            </li>`
          )
          .join("")}
      </ul>
    </p>

    <p>Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. If you'd like to continue, we ask that you 
    come to a meeting and seek membership.</p>
    
    <p>If you have any membership questions, please contact the <a href="mailto:vicepresident@4-playersofcolorado.org">Vice President</a></p>
  `
  };
};

module.exports.getNotifyBoardOfRestrictedGuestsEmail = (users, max) => {
  const usersMapText = users.map(user => {
    const eventsMap = Object.values(user.events)
      .map(
        event => `
        - ${event.title}
      `
      )
      .join("");

    return `
      - ${user.details.firstName} ${user.details.lastName}
      ${eventsMap}
      `;
  });

  return {
    to: vpAddress,
    from: noReplyAddress,
    subject: `Recent Account Status Change(s)`,
    preheader: "Guests have met their max run allotment for the year",
    text: `
    The following guests have driven on ${max} or more runs:
    ${usersMapText}
    
    Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. These members have been notified.

    This email has been automatically generated.
  `,
    html: `
    <p>
      The following guests have driven on ${max} or more runs:
      <ul>
        ${users
          .map(
            user =>
              `<li>
              <a href="mailto:${user.details.email}">${
                user.details.firstName
              } ${user.details.lastName}</a>
              <ul>
                ${Object.values(user.events)
                  .map(
                    event => `<li><a href="${process.env.FRONTEND_URL}/event/${
                      event.id
                    }">
                    ${event.title}
                  </a></li>`
                  )
                  .join("")}
              </ul>
            </li>`
          )
          .join("")}
      </ul>
    </p>

    <p>Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. These members have been notified.</p>
    
    <p>This email has been automatically generated.</p>
  `
  };
};

module.exports.getNotifyUserOfDelinquentStatusEmail = (
  email,
  firstName,
  lastName
) => {
  return {
    to: getUserAddress(firstName, lastName, email),
    from: vpAddress,
    subject: `Account Status Change`,
    preheader: "Your account has been restricted",
    text: `
    ${firstName},

    Our records show that you have not paid your dues for ${new Date().getFullYear()} and your account is now restricted.
    
    Per our bylaws, dues are payable per membership year (January lst to December 31st) and any member whose dues are
    not paid by March 31st will be dropped from the rolls of the current
    membership. 

    Any member whose dues have been delinquent less than 1 (one) year may be
    reinstated upon payment of dues and approval of the Executive Committee,
    providing an opening exists.

    If you believe you have received this message in error or if you have any questions, please contact vicepresident@4-playersofcolorado.org
  `,
    html: `
    <p>${firstName},</p>

    <p>Our records show that you have not paid your dues for ${new Date().getFullYear()} and your account is now restricted.</p>
    
    <p>Per our bylaws, dues are payable per membership year (January lst to December 31st) and any member whose dues are
    not paid by March 31st will be dropped from the rolls of the current
    membership.</p>

    <p>Any member whose dues have been delinquent less than 1 (one) year may be
    reinstated upon payment of dues and approval of the Executive Committee,
    providing an opening exists.</p>

    <p>If you believe you have received this message in error or if you have any questions, please contact the <a href="mailto:vicepresident@4-playersofcolorado.org">Vice President</a></p>
  `
  };
};

module.exports.getNotifyBoardOfDelinquentsEmail = users => {
  const usersMapText = users
    .map(user => {
      return `
      - ${user.firstName} ${user.lastName}
      `;
    })
    .join("");

  return {
    to: vpAddress,
    from: noReplyAddress,
    subject: `Recent Account Status Change(s)`,
    preheader: "Past due members have been made delinquent",
    text: `
    The following past due members have not paid their dues by 4/1 and are now delinquent:
    ${usersMapText}
    
    Per our bylaws, dues are payable per membership year (January lst to December 31st) and 
    any member whose dues are not paid by March 31st will be dropped from the rolls of the current
    membership.

    Any member whose dues have been delinquent less than 1 (one) year may be
    reinstated upon payment of dues and approval of the Executive Committee,
    providing an opening exists.

    This email has been automatically generated.
  `,
    html: `
    <p>
      The following past due members have not paid their dues by 4/1 and are now delinquent:
      <ul>
        ${users
          .map(
            user =>
              `<li>
              <a href="mailto:${user.email}">${user.firstName} ${
                user.lastName
              }</a>
            </li>`
          )
          .join("")}
      </ul>
    </p>

    <p>Per our bylaws, dues are payable per membership year (January lst to December 31st) and any member whose dues are
    not paid by March 31st will be dropped from the rolls of the current
    membership.</p>

    <p>Any member whose dues have been delinquent less than 1 (one) year may be
    reinstated upon payment of dues and approval of the Executive Committee,
    providing an opening exists.</p>
    
    <p>This email has been automatically generated.</p>
  `
  };
};

module.exports.getNotifyBoardOfInactiveMembersEmail = users => {
  const usersMapText = users
    .map(user => {
      return `
      - ${user.firstName} ${user.lastName}
      `;
    })
    .join("");

  return {
    to: vpAddress,
    from: noReplyAddress,
    subject: `Recent Account Status Change(s)`,
    preheader: "Delinquent members have been made inactive",
    text: `
    The following delinquent members have not paid their dues in over a year and are now inactive:
    ${usersMapText}
    
    Per our bylaws, any member in good standing who has resigned the club, upon request, may be
    reinstated upon payment of current dues and membership approval, providing an
    opening exists. The membership must approve the reinstatement by at least a
    51% (fifty-one percent) of the voting membership present at a regularly
    scheduled 4-Players of Colorado meeting, providing an opening exists.

    This email has been automatically generated.
  `,
    html: `
    <p>
      The following delinquent members have not paid their dues in over a year and are now inactive:
      <ul>
        ${users
          .map(
            user =>
              `<li>
              <a href="mailto:${user.email}">${user.firstName} ${
                user.lastName
              }</a>
            </li>`
          )
          .join("")}
      </ul>
    </p>

    <p>Per our bylaws, any member in good standing who has resigned the club, upon request, may be
    reinstated upon payment of current dues and membership approval, providing an
    opening exists. The membership must approve the reinstatement by at least a
    51% (fifty-one percent) of the voting membership present at a regularly
    scheduled 4-Players of Colorado meeting, providing an opening exists.</p>
    
    <p>This email has been automatically generated.</p>
  `
  };
};

module.exports.getNotifyUserOfPastDueStatusEmail = (
  email,
  firstName,
  lastName
) => {
  return {
    to: getUserAddress(firstName, lastName, email),
    from: vpAddress,
    subject: `Happy New Year!`,
    preheader: "Time to pay your membership dues",
    text: `
    Hi ${firstName},

    It's ${new Date().getFullYear()} and your membership dues are due!

    You can log into your website account and pay:
    ${process.env.FRONTEND_URL}/settings/account
    
    Alternatively, you can give 
    cash or check (payable to 4-Players of Colorado) to the Treasurer or you can mail a 
    check to the club: 
    
    4-Players of Colorado
    PO Box 300442
    Denver, CO 80203
    
    Per our bylaws, dues are payable per membership year (January lst to December 31st) and any member whose dues are
    not paid by March 31st will be dropped from the rolls of the current membership. Please pay soon to 
    avoid a lapse. 

    If you have any questions, please contact vicepresident@4-playersofcolorado.org
  `,
    html: `
    <p>Hi ${firstName},</p>

    <p>It's ${new Date().getFullYear()} and your membership dues are due!</p>

    <p>You can log into <a href="${
      process.env.FRONTEND_URL
    }/settings/account">your website account</a> and pay from there. Alternatively, you can give 
    cash or check (payable to 4-Players of Colorado) to the Treasurer or you can mail a 
    check to the club:</p>
    
    <p>
    4-Players of Colorado<br/>
    PO Box 300442<br/>
    Denver, CO 80203<br/>
    </p>
    
    <p>Per our bylaws, dues are payable per membership year (January lst to December 31st) and any member whose dues are
    not paid by March 31st will be dropped from the rolls of the current membership. Please pay soon to 
    avoid a lapse.</p>

    <p>If you have any questions, please contact the <a href="mailto:vicepresident@4-playersofcolorado.org">Vice President</a></p>
  `
  };
};

module.exports.getNotifyUserOfRestrictedResetEmail = (
  email,
  firstName,
  lastName,
  max
) => {
  return {
    to: getUserAddress(firstName, lastName, email),
    from: vpAddress,
    subject: `Account Status Change`,
    preheader: "Your account restrictions have been lifted",
    text: `
    ${firstName},

    Happy New Year! Your account restrictions have been lifted and you are free to attend runs again.
    
    Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. If you'd like to continue, we ask that you 
    come to a meeting and seek membership.

    If you have any questions, please contact vicepresident@4-playersofcolorado.org
  `,
    html: `
    <p>${firstName},</p>

    <p>
      Happy New Year! Your account has been un-restricted and you are free to attend runs again.
    </p>

    <p>Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. If you'd like to continue, we ask that you 
    come to a meeting and seek membership.</p>
    
    <p>If you have any membership questions, please contact the <a href="mailto:vicepresident@4-playersofcolorado.org">Vice President</a></p>
  `
  };
};

module.exports.getNotifyBoardOfRestrictedResetEmail = (users, max) => {
  const usersMapText = users.map(user => {
    return `
      - ${user.firstName} ${user.lastName}
      `;
  });

  return {
    to: vpAddress,
    from: noReplyAddress,
    subject: `Recent Account Status Change(s)`,
    preheader: "Restricted guest accounts have been reset",
    text: `
    The max number of runs a guest can attend per year is ${max}, which gets reset on January 1st.

    The following guests have had their accounts unrestricted:
    ${usersMapText}
    
    Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. These members have been notified.

    This email has been automatically generated.
  `,
    html: `
    <p>
      The max number of runs a guest can attend per year is ${max}, which gets reset on January 1st.
    </p>

    <p>
      The following guests have had their accounts unrestricted:
      <ul>
        ${users
          .map(
            user =>
              `<li>
              <a href="mailto:${user.email}">${user.firstName} ${
                user.lastName
              }</a>
            </li>`
          )
          .join("")}
      </ul>
    </p>

    <p>Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. These members have been notified.</p>
    
    <p>This email has been automatically generated.</p>
  `
  };
};

module.exports.getRemindWebmasterToSubscribeEmail = ({
  email,
  firstName,
  lastName,
  action,
  newsletter
}) => ({
  to: webmasterAddress,
  from: noReplyAddress,
  subject: "Update Email Marketing Contacts List",
  preheader: "Someone has changed their subscription preferences",
  text: `
    ${firstName} ${lastName} has requested to ${action} from the ${newsletter} newsletter\n
    Email: ${email}

    This email has been automatically generated.
  `,
  html: `
    <p>${firstName} ${lastName} has requested to ${action} from the ${newsletter} newsletter<br/>
    Email: ${email}</p>

    <p>This email has been automatically generated.</p>
  `
});

module.exports.getMigrationEmail = ({ email, firstName, resetToken }) => ({
  to: email,
  from: webmasterAddress,
  subject: "New Website Announcement",
  preheader: "The new website is here!",
  text: `
    Hi ${firstName}!

    It's been a longtime coming, but I'm pleased to announce that the new 4-Players website has finally arrived!

    It has a new look, new features that people have been asking for, and regular tasks have been automated. The site has been optimized for the latest browsers (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge).

    Your profile has been migrated over from the old site and in order to access the new site, you'll need to reset your password:
    https://members.4-playersofcolorado.org/forgot-password?token=${resetToken}&migration=true

    Feel free to explore! Please keep in mind that the work on this is ongoing and I'll need your help to make it better. In the footer of each page you'll see a "Submit Feedback" link where you can log bugs and submit feature requests.

    If you have any questions, comments, or suggestions, do not hesitate to contact me.

    Best,
    
    Craig F
    President/Webmaster
  `,
  html: `
    <p>Hi ${firstName}!</p>
    
    <p>It's been a longtime coming, but I'm pleased to announce that the new 4-Players website has finally arrived!</p>

    
    <p>It has a new look, new features that people have been asking for, and regular tasks have been automated. The site has been optimized for the latest browsers (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge).</p>
    <p>Your profile has been migrated over from the old site and in order to access the new site, you'll need to <a href="https://members.4-playersofcolorado.org/forgot-password?token=${resetToken}&migration=true">reset your password</a>.</p>

    <p>Feel free to explore! Please keep in mind that the work on this is ongoing and I'll need your help to make it better. In the footer of each page you'll see a "Submit Feedback" link where you can log bugs and submit feature requests.</p>

    <p>If you have any questions, comments, or suggestions, do not hesitate to contact me.</p>

    <p>
      Best,<br/>
      <br/>
      Craig F<br/>
      President/Webmaster
    </p>
  `
});

module.exports.getMigrationFollowupEmail = ({
  email,
  firstName,
  resetToken
}) => ({
  to: email,
  from: webmasterAddress,
  subject: "New Website Announcement Re-Redux",
  preheader: "website-final-v3",
  text: `
    Hi ${firstName}!

    Enough with the emails! You'll need to reset your password in order to gain access to your account. I was trying to be clever and get you halfway there, but that's proving difficult.

    Instead, visit this URL to reset your password if you haven't already: 
    https://members.4-playersofcolorado.org/forgot-password

    Sorry for the confusion, we'll get there! If you have any questions, comments, or suggestions, do not hesitate to contact me.

    Best,
    
    Craig F
    President/Webmaster
  `,
  html: `
    <p>Hi ${firstName}!</p>
    
    <p>Enough with the emails!  You'll need to reset your password in order to gain access to your account. I was trying to be clever and get you halfway there, but that's proving difficult.</p>

    <p>Instead, visit this URL to reset your password if you haven't already: <a href="https://members.4-playersofcolorado.org/forgot-password">reset your password</a></p>

    <p>Sorry for the confusion, we'll get there! If you have any questions, comments, or suggestions, do not hesitate to contact me.</p>

    <p>
      Best,<br/>
      <br/>
      Craig F<br/>
      President/Webmaster
    </p>
  `
});
