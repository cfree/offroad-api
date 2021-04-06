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
  subject: "[4-Players] New Account Registration",
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
  subject: "[4-Players] New Account Registration",
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
  subject: "[4-Players] Account Approval",
  text: `
    Welcome, ${firstName}!

    Thanks for signing up! Your account has been unlocked. Feel free to sign up for some events.

    Visit this URL to log in:
    ${process.env.FRONTEND_URL}/login
  `,
  html: `
    <p>Welcome, ${firstName}!</p>

    <p>Thanks for signing up! Thanks for signing up! Your account has been unlocked. Feel free to sign up for some events.</p>

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
  subject: "[4-Players] Account Rejection",
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
  subject: "[4-Players] Your Account Registration",
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
  subject: "[4-Players] Invitation to Register",
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
  subject: "[4-Players] Invitation to Register",
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
  subject: "[4-Players] Your Password Reset",
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
  subject: `[4-Players] Event Reminder: ${eventDetails.title} ${
    eventDetails.type
  }`,
  text: `
    ${firstName},

    You have an event coming up soon!

    ${eventDetails.title}
    Start time: ${format(new Date(eventDetails.startTime), datePrintFormat)}
    Rally location: ${eventDetails.rallyAddress}

    If you can no longer attend, please update your RSVP so the Run Leader can get an accurate head count.

    For more details or to edit your RSVP, please visit:
    ${process.env.FRONTEND_URL}/event/${eventDetails.id}
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

    <p>If you can no longer attend, please update your RSVP so the Run Leader can get an accurate head count</p>
    
    <p>For more details or to edit your RSVP, please see <a href="${
      process.env.FRONTEND_URL
    }/event/${eventDetails.id}">the event details on the website</a>.</p>
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
  subject: `[4-Players] Run Report Reminder: ${eventDetails.title}`,
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
    subject: `[4-Players] Account Status Change`,
    text: `
    ${firstName},

    Our records show that you've driven on ${count} runs:
    ${eventsMapText}
    
    Per our bylaws, a prospective member may only attend ${max} runs in a calendar year 
    without applying for membership. If you'd like to continue, we ask that you 
    come to a meeting and seek membership.

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
    subject: `[4-Players] Recent Account Status Change(s)`,
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
    subject: `[4-Players] Account Status Change`,
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
    subject: `[4-Players] Recent Account Status Change(s)`,
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
