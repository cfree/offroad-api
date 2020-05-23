const noReplyAddress = "4-Players Webmaster <no-reply@4-playersofcolorado.org>";
const secretaryAddress =
  "4-Players Secretary <secretary@4-playersofcolorado.org>";
const webmasterAddress = "4-Players  <webmaster@4-playersofcolorado.org>";

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

    Thanks for signing up!

    Visit this URL to log in:
    ${process.env.FRONTEND_URL}/login
  `,
  html: `
    <p>Welcome, ${firstName}!</p>

    <p>Thanks for signing up!</p>

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
