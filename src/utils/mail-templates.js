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

const getUserAddress = (firstName, lastName, email) =>
  `${firstName} ${lastName} <${email}>`;

module.exports.getSecretaryNewUserEmail = username => ({
  to: secretaryAddress,
  from: noReplyAddress,
  subject: "[4-Players] New Account Registration",
  text: `
    A new guest account has been created:
    ${process.env.FRONTEND_URL}/profile/${username}
  `,
  html: `
    <p>A new guest account has been created:
    ${process.env.FRONTEND_URL}/profile/${username}</p>
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

module.exports.getUserWebsiteRegistrationEmail = ({
  email,
  firstName,
  lastName,
  resetToken
}) => ({
  to: getUserAddress(firstName, lastName, email),
  from: noReplyAddress,
  subject: "Your 4-Players Account Registration",
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

    <p>Visit this URL to create your profile:
    ${process.env.FRONTEND_URL}/signup?token=${resetToken}</p>

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
  from: "no-reply@4-playersofcolorado.org",
  subject: "Invitation to register at the 4-Players website",
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
  from: "no-reply@4-playersofcolorado.org",
  subject: "Invitation to register at the 4-Players website",
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

    You have an event coming up tomorrow!

    ${eventDetails.title}
    Start time: ${format(new Date(eventDetails.startTime), datePrintFormat)}
    Rally time: ${format(new Date(eventDetails.rallyTime), datePrintFormat)}
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
      Rally time: ${format(
        new Date(eventDetails.rallyTime),
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
