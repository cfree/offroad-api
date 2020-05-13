const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;

const promisifiedRandomBytes = promisify(randomBytes);

cloudinary.config({
  cloud_name: process.env.CLOUNDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const promisifiedUpload = promisify(cloudinary.uploader.unsigned_upload);
const promisifiedDestroy = promisify(cloudinary.uploader.destroy);

const HASH_SECRET = process.env.HASH_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const { sendTransactionalEmail } = require("../mail");
const {
  yearInMs,
  resetTokenTimeoutInMs,
  hasRole,
  hasAccountStatus,
  hasAccountType,
  isSelf,
  getUploadLocation
} = require("../utils");
const { roles, emailGroups } = require("../config");

const getHash = async pw => {
  const salt = await bcrypt.hash(HASH_SECRET, 10);
  return bcrypt.hash(pw, salt);
};

const tokenSettings = {
  httpOnly: true,
  maxAge: yearInMs,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "Lax" : "None"
};

const Mutations = {
  async register(parent, args, ctx, info) {
    const { firstName, lastName, email, confirmEmail, source } = args;

    const lowercaseEmail = email.toLowerCase();
    const lowercaseConfirmEmail = confirmEmail.toLowerCase();

    // VALIDATION
    if (!email) {
      throw new Error("Email is required");
    }

    if (lowercaseEmail !== lowercaseConfirmEmail) {
      throw new Error("Emails do not match");
    }

    // Create registration in database
    const resetToken = (await promisifiedRandomBytes(20)).toString("hex");

    await ctx.db.mutation.createRegistration(
      {
        data: {
          firstName,
          lastName,
          email: lowercaseEmail,
          source,
          token: resetToken,
          tokenExpiry: Date.now() + resetTokenTimeoutInMs
        }
      },
      info
    );

    let emailDetails;

    switch (source) {
      case "website": // User initiated
        emailDetails = {
          to: lowercaseEmail,
          from: "no-reply@4-playersofcolorado.org",
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
        };
        break;
      case "run": // User attended run
      case "meeting": // User attended meeting
        emailDetails = {
          to: lowercaseEmail,
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
        };
        break;
      case "admin": // Admin invited user directly
      default:
        emailDetails = {
          to: lowercaseEmail,
          from: "no-reply@4-playersofcolorado.org",
          subject: "Invitation to register at the 4-Players website",
          text: `
            Hi ${firstName},
    
            You've been invited by ${
              ctx.req.user.firstName
            } to create an account on the 4-Players of Colorado website.
    
            Visit this URL to create your profile:
            ${process.env.FRONTEND_URL}/signup?token=${resetToken}

            If you have any questions, please contact webmaster@4-playersofcolorado.org

            If this message was sent to you in error, kindly disregard.
          `,
          html: `
            <p>Hi ${firstName},</p>
    
            <p>You've been invited by ${
              ctx.req.user.firstName
            } to create an account on the 4-Players of Colorado website.</p>

            <p>Visit this URL to create your profile:
          ${process.env.FRONTEND_URL}/signup?token=${resetToken}</p>

            <p>If you have any questions, please contact the <a href="mailto:webmaster@4-playersofcolorado.org">webmaster</a></p>

            <p><small>If this message was sent to you in error, kindly disregard.</small></p>
          `
        };
    }

    // Email reset token
    return sendTransactionalEmail(emailDetails)
      .then(() => ({
        message: "Registration was successful. Please check your email."
      }))
      .catch(err => {
        //Extract error msg
        // const { message, code, response } = err;

        //Extract response msg
        // const { headers, body } = response;

        throw new Error(err.toString());
      });
  },
  async signUp(parent, args, ctx, info) {
    const email = args.email.toLowerCase();

    // VALIDATION

    // TODO Confirm all fields valid

    // TODO Lock out if under 18

    // Hash the password
    const password = await getHash(args.password);

    const { token, firstName, lastName, username, ...newUser } = args;

    // Create user in database
    try {
      const user = await ctx.db.mutation.createUser(
        {
          data: {
            ...newUser,
            email,
            firstName,
            lastName,
            username,
            password,
            lastLogin: new Date(),
            membershipLog: {
              create: [
                {
                  time: new Date(),
                  message: "Account created",
                  messageCode: "ACCOUNT_CREATED"
                }
              ]
            }
          }
        },
        info
      );

      // Remove registration from database
      await ctx.db.mutation.deleteRegistration({
        where: { token }
      });

      // Create JWT token for new user
      // const jwToken = jwt.sign({ userId: user.id }, JWT_SECRET);

      // Set the JWT as a cookie
      // ctx.res.cookie("token", jwToken, tokenSettings);

      // Send email to secretary
      return sendTransactionalEmail({
        to: `4-Players Secretary <secretary@4-playersofcolorado.org>`,
        from: `4-Players Webmaster <no-reply@4-playersofcolorado.org>`,
        subject: "[4-Players] New Account Registration",
        text: `
        A new guest account has been created:
        ${process.env.FRONTEND_URL}/profile/${username}
      `,
        html: `
        <p>A new guest account has been created:
        ${process.env.FRONTEND_URL}/profile/${username}</p>
      `
      })
        .then(
          // Send email to user
          sendTransactionalEmail({
            to: `${firstName} ${lastName} <${email}>`,
            from: `4-Players Webmaster <no-reply@4-playersofcolorado.org>`,
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
          })
        )
        .then(() => ({ message: "Account created" }))
        .catch(err => {
          //Extract error msg
          // const { message, code, response } = err;

          //Extract response msg
          // const { headers, body } = response;

          throw new Error(err);
        });
    } catch (error) {
      if (
        error.message ===
        "A unique constraint would be violated on User. Details: Field name = username"
      ) {
        throw new Error("That username is taken.");
      }

      if (
        error.message ===
        "A unique constraint would be violated on User. Details: Field name = email"
      ) {
        throw new Error(
          "There is already an account with that email address. Try resetting your password."
        );
      }

      throw new Error(error);
    }
  },
  async unlockNewAccount() {
    // Add membership log
    const logs = [
      {
        time: new Date(),
        message: `Account unlocked by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "ACCOUNT_UNLOCKED",
        logger: {
          connect: {
            id: ctx.req.userId
          }
        }
      }
    ];

    // Update status
    await ctx.db.mutation.updateUser(
      {
        data: {
          accountStatus: args.accountStatus,
          membershipLog: {
            create: logs
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );

    // Send email to user
    // TODO Hook up to welcome email template
    return sendTransactionalEmail({
      to: lowercaseEmail,
      from: "secretary@4-playersofcolorado.org",
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
    })
      .then(() => ({ message: "Account unlock successful." }))
      .catch(err => {
        //Extract error msg
        // const { message, code, response } = err;

        //Extract response msg
        // const { headers, body } = response;

        throw new Error(err);
      });
  },
  async login(parent, { username, password }, ctx, info) {
    // Check if there is a user with that username
    const user = await ctx.db.query.user({ where: { username } });

    if (!user) {
      throw new Error("Username or password incorrect");
    }

    // Check if password is correct
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error("Invalid password"); // fix
    }

    // Generate the JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    // Set the cookie with the token
    ctx.res.cookie("token", token, tokenSettings);

    // Update role
    await ctx.db.mutation.updateUser(
      {
        data: {
          lastLogin: new Date()
        },
        where: {
          id: user.id
        }
      },
      info
    );

    // Return the user
    return { message: "Successfully logged in" };
  },
  logout(parent, args, ctx, info) {
    ctx.res.clearCookie("token");
    return { message: "Goodbye" };
  },
  async requestReset(parent, { email }, ctx, info) {
    // Check if this is a real user
    const user = await ctx.db.query.user({
      where: { email: email }
    });

    if (!user) {
      throw new Error("Invalid email entered");
    }

    // Set reset token and expiry
    const resetToken = (await promisifiedRandomBytes(20)).toString("hex");
    const resetTokenExpiry = Date.now() + resetTokenTimeoutInMs;
    const res = await ctx.db.mutation.updateUser({
      where: { email: email },
      data: { resetToken, resetTokenExpiry }
    });

    // Email reset token
    return sendTransactionalEmail({
      to: user.email,
      from: "no-reply@4-playersofcolorado.org",
      subject: "Your 4-Players Password Reset",
      text: `
        ${user.firstName},

        Your password reset token for user "${user.username}" is here!

        Visit this URL to reset your password:
        ${process.env.FRONTEND_URL}/forgot-password?token=${resetToken}
      `,
      html: `
        Your password reset token for user "${user.username}" is here!
        <a href="${
          process.env.FRONTEND_URL
        }/forgot-password?token=${resetToken}">Click here to reset your password</a>
      `
    })
      .then(() => ({ message: "Password reset is en route" }))
      .catch(err => {
        //Extract error msg
        // const { message, code, response } = err;

        //Extract response msg
        // const { headers, body } = response;

        throw new Error(err.toString());
      });
  },
  async resetPassword(parent, args, ctx, info) {
    // Check if passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Passwords do not match");
    }

    // Check if token is legit and not expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - resetTokenTimeoutInMs
      }
    });

    if (!user) {
      throw new Error("Token invalid or expired");
    }

    // Hash the new password
    const password = await getHash(args.password);

    // Save the new password to the User, remove old reset token fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    // Generate JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.JWT_SECRET);

    // Set JWT cookie
    ctx.res.cookie("token", token, tokenSettings);

    // Return the new user
    return updatedUser;
  },
  async changePassword(parent, args, ctx, info) {
    const { user, userId } = ctx.req;

    if (!userId) {
      throw new Error("User must be logged in");
    }

    // Check if passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Passwords do not match");
    }

    // Hash the new password
    const password = await getHash(args.password);

    // Save the new password to the User, remove old reset token fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password
      }
    });

    // // Generate JWT
    // const token = jwt.sign({ userId: updatedUser.id }, process.env.JWT_SECRET);

    // // Set JWT cookie
    // ctx.res.cookie('token', token, tokenSettings);

    return { message: "Your password has been changed" };
  },
  async changeEmail(parent, args, ctx, info) {
    const { userId } = ctx.req;
    const email = args.email.toLowerCase();

    if (!userId) {
      throw new Error("User must be logged in");
    }

    // Save the new password to the User, remove old reset token fields
    await ctx.db.mutation.updateUser({
      where: { id: userId },
      data: {
        email
      }
    });

    return { message: "Your email has been changed" };
  },
  async updateRole(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: { id: ctx.req.userId }
      },
      info
    );

    // Have proper roles to do this?
    hasRole(currentUser, ["ADMIN"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    // Update role
    try {
      return ctx.db.mutation.updateUser(
        {
          data: {
            role: args.role,
            membershipLog: {
              create: [
                {
                  time: new Date(),
                  message: `Role changed to "${args.role}" by ${
                    ctx.req.user.firstName
                  } ${ctx.req.user.lastName}`,
                  messageCode: "ACCOUNT_CHANGED",
                  logger: {
                    connect: {
                      id: ctx.req.userId
                    }
                  }
                }
              ]
            }
          },
          where: {
            id: args.userId
          }
        },
        info
      );
    } catch (e) {
      throw new Error("");
    }
  },
  async updateAccountType(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    // Changing account type to 'FULL', add membership log
    const logs = [
      {
        time: new Date(),
        message: `Account type changed to "${args.accountType}" by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "ACCOUNT_CHANGED",
        logger: {
          connect: {
            id: ctx.req.userId
          }
        }
      }
    ];

    // Update account type
    return ctx.db.mutation.updateUser(
      {
        data: {
          accountType: args.accountType,
          membershipLog: {
            create: logs
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },
  async updateAccountStatus(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    // Query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: { id: args.userId }
      },
      "{ accountStatus }"
    );

    // Add membership log
    const logs = [
      {
        time: new Date(),
        message: `Account status changed to "${args.accountStatus}" by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "ACCOUNT_CHANGED",
        logger: {
          connect: {
            id: ctx.req.userId
          }
        }
      }
    ];

    // Account unlocked
    if (
      currentUser.accountStatus === "LOCKED" &&
      args.data.accountStatus !== "LOCKED"
    ) {
      logs.push({
        time: new Date(),
        message: `Account unlocked by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "ACCOUNT_UNLOCKED",
        logger: {
          connect: {
            id: ctx.req.userId
          }
        }
      });
    }

    // Update status
    return ctx.db.mutation.updateUser(
      {
        data: {
          accountStatus: args.accountStatus,
          membershipLog: {
            create: logs
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },
  async updateOffice(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper account status to do this?
    hasRole(ctx.req.user, ["ADMIN"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { office: existingOffice } = await ctx.db.query.user(
      { where: { id: args.userId } },
      "{ office }"
    );

    if (existingOffice === args.office) {
      throw new Error("Cannot change office to the same office");
    }

    const defaultLog = {
      time: new Date(),
      logger: {
        connect: {
          id: ctx.req.userId
        }
      }
    };

    const logs = [];

    // Add new value
    if (existingOffice === null && typeof args.office === "string") {
      logs.push({
        message: `"${args.office}" office added by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "OFFICE_ADDED"
      });
    }
    // Removing old value
    else if (typeof existingOffice === "string" && args.office === null) {
      logs.push({
        message: `"${existingOffice}" office removed by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "OFFICE_REMOVED"
      });
    }
    // Replacing old value
    else if (existingOffice !== args.office) {
      logs.push(
        {
          message: `"${existingOffice}" office removed by ${
            ctx.req.user.firstName
          } ${ctx.req.user.lastName}`,
          messageCode: "OFFICE_REMOVED"
        },
        {
          message: `"${args.office}" office added by ${
            ctx.req.user.firstName
          } ${ctx.req.user.lastName}`,
          messageCode: "OFFICE_ADDED"
        }
      );
    }

    const messageLogs = logs.map(log => ({
      ...log,
      ...defaultLog
    }));

    // Update office
    return ctx.db.mutation.updateUser(
      {
        data: {
          office: args.office === "NONE" ? null : args.office,
          membershipLog: {
            create: messageLogs
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },
  async updateTitle(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { title: existingTitle } = await ctx.db.query.user(
      { where: { id: args.userId } },
      "{ title }"
    );

    if (existingTitle === args.title) {
      throw new Error("Cannot change title to the same title");
    }

    const defaultLog = {
      time: new Date(),
      logger: {
        connect: {
          id: ctx.req.userId
        }
      }
    };

    const logs = [];

    // Add new value
    if (existingTitle === null && typeof args.title === "string") {
      logs.push({
        message: `"${args.title}" title added by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "TITLE_ADDED"
      });
    }
    // Removing old value
    else if (typeof existingTitle === "string" && args.title === null) {
      logs.push({
        message: `"${existingTitle}" title removed by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "TITLE_REMOVED"
      });
    }
    // Replacing old value
    else if (existingTitle !== args.title) {
      logs.push(
        {
          message: `"${existingTitle}" title removed by ${
            ctx.req.user.firstName
          } ${ctx.req.user.lastName}`,
          messageCode: "TITLE_REMOVED"
        },
        {
          message: `"${args.title}" title added by ${ctx.req.user.firstName} ${
            ctx.req.user.lastName
          }`,
          messageCode: "TITLE_ADDED"
        }
      );
    }

    const messageLogs = logs.map(log => ({
      ...log,
      ...defaultLog,
      time: new Date()
    }));

    // Update title
    return ctx.db.mutation.updateUser(
      {
        data: {
          title: args.title,
          membershipLog: {
            create: messageLogs
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },
  async createEvent(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { event } = args;

    const attendees = [
      {
        member: {
          connect: {
            username: event.host
          }
        },
        status: "GOING"
      }
    ];

    const data = {
      type: event.type,
      title: event.title,
      description: event.description || "",
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      address: event.address || "",
      trailDifficulty: event.trailDifficulty || "",
      // trailNotes: event.trailNotes,
      rallyAddress: event.rallyAddress || "",
      rallyTime: event.rallyTime || "",
      membersOnly: false, // TODO
      creator: {
        connect: { id: ctx.req.userId }
      },
      host: {
        connect: {
          username: event.host
        }
      },
      rsvps: {
        create: attendees
      }
    };

    if (event.trail !== "0") {
      data.trail = {
        connect: {
          id: event.trail
        }
      };
    }

    const results = await ctx.db.mutation.createEvent({ data }, info);

    return { message: "Your event has been created" };
  },
  async updateEvent(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { event, id: eventId } = args;

    // Get current event for later comparison
    const existingEvent = await ctx.db.query.event(
      {
        where: {
          id: eventId
        }
      },
      info
    );

    const data = {
      title: event.title,
      description: event.description || "",
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      address: event.address || "",
      trailDifficulty: event.trailDifficulty || "",
      // trailNotes: event.trailNotes,
      rallyAddress: event.rallyAddress || "",
      rallyTime: event.rallyTime || "",
      membersOnly: false, // TODO
      creator: {
        connect: { id: ctx.req.userId }
      },
      host: {
        connect: {
          username: event.host
        }
      }
    };

    if (event.trail && event.trail !== "0") {
      // New trail submitted
      data.trail = {
        connect: {
          id: event.trail
        }
      };
    } else if (existingEvent.trail && existingEvent.trail.id && !event.trail) {
      // Remove old trail
      data.trail = {
        disconnect: true
      };
    }

    if (event.newFeaturedImage) {
      // New featured image submitted
      data.featuredImage = {
        upsert: {
          create: {
            ...event.newFeaturedImage
          },
          update: {
            ...event.newFeaturedImage
          }
        }
      };
    } else if (
      existingEvent.featuredImage &&
      existingEvent.featuredImage.publicId &&
      !event.newFeaturedImage
    ) {
      // Remove old featured image
      data.featuredImage = {
        delete: true
      };
    }

    const results = await ctx.db.mutation.updateEvent(
      {
        data,
        where: {
          id: eventId
        }
      },
      info
    );

    return { message: "Your event has been updated" };
  },
  async setRSVP(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    const { rsvp } = args;

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    // Requesting user has proper role?
    if (ctx.req.userId !== rsvp.userId) {
      hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);
    }

    // Query the current user
    const currentUser = await ctx.db.query.user(
      { where: { id: rsvp.userId } },
      "{ id, eventsRSVPd { id, status, event { id } } }"
    );

    if (!currentUser) {
      throw new Error("User does not have permission");
    }

    // Has this user already RSVPd?
    const userRSVP = currentUser.eventsRSVPd.find(
      eventRSVP => eventRSVP.event.id === rsvp.eventId
    );

    // If this RSVP is not different, return gracefully
    if (userRSVP && userRSVP.status === rsvp.status) {
      return { message: "Already RSVPd, no change recorded" };
    }

    // If this RSVP is different, update RSVP
    if (userRSVP && userRSVP.status !== rsvp.status) {
      await ctx.db.mutation.updateRSVP(
        {
          where: { id: userRSVP.id },
          data: { status: rsvp.status }
        },
        info
      );

      return { message: "Thank you for updating your RSVP" };
    }

    // If RSVP is missing, record RSVP
    await ctx.db.mutation.createRSVP(
      {
        data: {
          status: rsvp.status,
          member: {
            connect: {
              id: rsvp.userId
            }
          },
          event: {
            connect: {
              id: rsvp.eventId
            }
          }
        }
      },
      info
    );

    return { message: "Thank you for RSVPing" };
  },
  async sendMessage(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Requesting user has proper account status?
    const { user } = ctx.req;

    const { to, subject, htmlText } = args;

    if (to.length === 0) {
      throw new Error("No recipients found");
    }

    // Can email ALL users
    if (to.includes("all_users")) {
      hasRole(user, ["ADMIN"]);
      hasAccountStatus(user, ["ACTIVE"]);
      hasAccountType(user, ["FULL"]);
    }

    // Can email guests or full members
    if (
      to.includes("guests") ||
      to.includes("all_active") ||
      to.includes("full_membership")
    ) {
      // Is active full member and at least an officer
      hasRole(user, ["ADMIN", "OFFICER"]);
      hasAccountStatus(user, ["ACTIVE"]);
      hasAccountType(user, ["FULL"]);
    }

    // Can email run leaders
    if (to.includes("run_leaders")) {
      // Is active full member and at least the Run Master
      hasRole(user, ["ADMIN", "OFFICER", "RUN_MASTER"]);
      hasAccountStatus(user, ["ACTIVE"]);
      hasAccountType(user, ["FULL"]);
    }

    // Can email multiple individual members
    if (
      (!to.includes("officers") || !to.includes("webmaster")) &&
      !to.some(subject => subject === emailGroups) &&
      to.length > 1
    ) {
      // Is active full or emeritus and at least a run leader
      hasRole(user, roles.filter(role => role !== "USER"));
      hasAccountStatus(user, ["ACTIVE"]);
      hasAccountType(user, ["FULL", "EMERITUS"]);
    }

    // Can email individual members
    if (
      (!to.includes("officers") || !to.includes("webmaster")) &&
      !to.some(subject => subject === emailGroups)
    ) {
      // Is active full or emeritus
      hasAccountStatus(user, ["ACTIVE"]);
      hasAccountType(user, ["FULL", "EMERITUS", "ASSOCIATE"]);
    }

    // Can email Run Master
    if (to.includes("runmaster")) {
      // Is active member
      hasAccountStatus(user, ["ACTIVE"]);
    }

    // Anyone logged in can email the officers or the webmaster

    const emailSettings = {
      from: user.email,
      subject: `[4-Players] ${subject || `Message from ${user.firstName}`}`,
      // text,
      html: htmlText
    };

    if (
      to.length === 1 &&
      !emailGroups.some(recipient => recipient === to[0])
    ) {
      // Send email to one person
      const email = await ctx.db.query.user(
        {
          where: { username: to[0] }
        },
        "{ email }"
      );

      emailSettings.to = [email];
    } else {
      // Send email to many people
      // To do: email permissions
      const peopleQueries = to
        .filter(recipient => !emailGroups.includes(recipient))
        .map(person => ({ username: person }));
      const groupQueries = to
        .filter(recipient => emailGroups.includes(recipient))
        .map(group => {
          switch (group) {
            case "officers":
              return {
                NOT: { office: null }
              };
            case "runmaster":
              return { role: "RUN_MASTER" };
            case "webmaster":
              return { title: "WEBMASTER" };
            case "run_leaders":
              return { role: "RUN_LEADER" };
            case "full_membership":
              return {
                AND: [
                  {
                    OR: [
                      { accountType: "FULL" },
                      { accountType: "EMITERUS" },
                      { accountType: "ASSOCIATE" }
                    ]
                  },
                  { accountStatus: "ACTIVE" }
                ]
              };
            case "all_active":
              return { accountStatus: "ACTIVE" };
            case "all_users":
              return {
                NOT: { email: null }
              };
            default:
              // guests
              return {
                AND: [{ accountType: "GUEST" }, { accountStatus: "ACTIVE" }]
              };
          }
        });

      // To do: handle duplicates, if any
      let query = {
        where: {
          OR: peopleQueries
        }
      };

      if (groupQueries.length) {
        query = {
          where: {
            OR: [...query.where["OR"], ...groupQueries]
          }
        };
      }

      const emails = await ctx.db.query.users(query, "{ email }");

      if (emails && emails.length > 1) {
        emailSettings.to = "info@4-playersofcolorado.org";
        emailSettings.bcc = emails.map(email => email.email);
      } else {
        emailSettings.to = user.email;
      }
    }

    if (emailSettings.to.length >= 1) {
      return sendTransactionalEmail(emailSettings)
        .then(() => ({ message: "Message has been sent" }))
        .catch(err => {
          throw new Error(err.toString());
        });
    }

    throw new Error("No email addresses found for recipient(s)");
  },
  async updateUserProfileSettings(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    if (
      hasRole(ctx.req.user, ["ADMIN", "OFFICER"], false) ||
      isSelf(ctx.req.user, args.id, false)
    ) {
      // Query the current user
      const currentUser = await ctx.db.query.user(
        {
          where: { id: args.id }
        },
        "{ accountType, accountStatus, role, joined }"
      );

      const logs = [];

      // Became a full member
      if (
        currentUser.accountType === "FULL" &&
        typeof args.data.joined === "string" &&
        currentUser.joined === null
      ) {
        logs.push({
          time: new Date(),
          message: "Became a Full Member",
          messageCode: "MEMBERSHIP_GRANTED",
          logger: {
            connect: {
              id: ctx.req.userId
            }
          }
        });
      }

      // Account unlocked
      if (
        currentUser.accountStatus === "LOCKED" &&
        args.data.accountStatus !== "LOCKED"
      ) {
        logs.push({
          time: new Date(),
          message: `Account unlocked by ${ctx.req.user.firstName} ${
            ctx.req.user.lastName
          }`,
          messageCode: "ACCOUNT_UNLOCKED",
          logger: {
            connect: {
              id: ctx.req.userId
            }
          }
        });
      }

      // Account rejected
      // TODO

      // Update user
      const obj = {
        data: {
          firstName: args.data.firstName,
          lastName: args.data.lastName,
          username: args.data.username,
          gender: args.data.gender,
          birthdate: new Date(args.data.birthdate),
          joined: args.data.joined ? new Date(args.data.joined) : null,
          contactInfo: {
            upsert: {
              create: {
                street: args.data.street,
                city: args.data.city,
                state: args.data.state,
                zip: args.data.zip,
                phone: args.data.phone
              },
              update: {
                street: args.data.street,
                city: args.data.city,
                state: args.data.state,
                zip: args.data.zip,
                phone: args.data.phone
              }
            }
          },
          preferences: {
            upsert: {
              create: {
                emergencyContactName: args.data.emergencyContactName,
                emergencyContactPhone: args.data.emergencyContactPhone,
                showPhoneNumber: args.data.showPhoneNumber
              },
              update: {
                emergencyContactName: args.data.emergencyContactName,
                emergencyContactPhone: args.data.emergencyContactPhone,
                showPhoneNumber: args.data.showPhoneNumber
              }
            }
          },
          membershipLog: {
            create: logs
          }
        },
        where: { id: args.id }
      };

      const results = await ctx.db.mutation.updateUser(obj, info);

      if (false) {
        return { message: "Unable to update user profile settings" };
      }
      return { message: "User profile settings updated" };
    } else {
      throw new Error(
        "User profile can only be updated by the user, an admin, or an officer"
      );
    }
  },
  async updateUserAdminProfileSettings(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    if (!hasRole(ctx.req.user, ["ADMIN", "OFFICER"], false)) {
      throw new Error(
        "User profile can only be updated by an admin or an officer"
      );
    }

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { data } = args;

    // Query the current user
    const currentUser = await ctx.db.query.user(
      { where: { id: args.id } },
      "{ id, accountType, accountStatus, role, office, title }"
    );

    // Logs
    const defaultLog = {
      time: new Date(),
      logger: {
        connect: {
          id: ctx.req.userId
        }
      }
    };

    const logs = [];

    // Add new title
    if (currentUser.title === null && typeof data.title === "string") {
      logs.push({
        message: `"${data.title}" title added by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "TITLE_ADDED"
      });
    }
    // Removing old title
    else if (typeof currentUser.title === "string" && data.title === null) {
      logs.push({
        message: `"${currentUser.title}" title removed by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "TITLE_REMOVED"
      });
    }
    // Replace title
    else if (
      typeof currentUser.title === "string" &&
      typeof data.title === "string" &&
      currentUser.title !== data.title
    ) {
      logs.push(
        {
          message: `"${currentUser.title}" title removed by ${
            ctx.req.user.firstName
          } ${ctx.req.user.lastName}`,
          messageCode: "TITLE_REMOVED"
        },
        {
          message: `"${data.title}" title added by ${ctx.req.user.firstName} ${
            ctx.req.user.lastName
          }`,
          messageCode: "TITLE_ADDED"
        }
      );
    }

    // Add new office
    if (currentUser.office === null && typeof data.office === "string") {
      logs.push({
        message: `"${data.office}" office added by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "OFFICE_ADDED"
      });
    }
    // Removing old office
    else if (typeof currentUser.office === "string" && data.office === null) {
      logs.push({
        message: `"${currentUser.office}" office removed by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "OFFICE_REMOVED"
      });
    }
    // Replace office
    else if (
      typeof currentUser.office === "string" &&
      typeof data.office === "string" &&
      currentUser.office !== data.office
    ) {
      logs.push(
        {
          message: `"${currentUser.office}" office removed by ${
            ctx.req.user.firstName
          } ${ctx.req.user.lastName}`,
          messageCode: "OFFICE_REMOVED"
        },
        {
          message: `"${data.office}" office added by ${
            ctx.req.user.firstName
          } ${ctx.req.user.lastName}`,
          messageCode: "OFFICE_ADDED"
        }
      );
    }

    if (currentUser.role !== data.role) {
      logs.push({
        message: `Role changed to "${data.role}" by ${ctx.req.user.firstName} ${
          ctx.req.user.lastName
        }`,
        messageCode: "ACCOUNT_CHANGED"
      });
    }

    if (currentUser.accountStatus !== data.accountStatus) {
      logs.push({
        message: `Account status changed to "${data.accountStatus}" by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "ACCOUNT_CHANGED"
      });
    }

    if (currentUser.accountType !== data.accountType) {
      logs.push({
        message: `Account type changed to "${data.accountType}" by ${
          ctx.req.user.firstName
        } ${ctx.req.user.lastName}`,
        messageCode: "ACCOUNT_CHANGED"
      });
    }

    const messageLogs = logs.map(log => ({
      ...log,
      ...defaultLog
    }));

    // Update user
    await ctx.db.mutation.updateUser(
      {
        data: {
          ...data,
          ...(messageLogs.length > 0
            ? {
                membershipLog: {
                  create: messageLogs
                }
              }
            : {})
        },
        where: { id: args.id }
      },
      info
    );

    if (false) {
      return { message: "Unable to update user profile settings" };
    }
    return { message: "User profile settings updated" };
  },
  async updateAvatar(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    const { data } = args;
    const { old: oldAvatar, new: newAvatar } = data;

    if (oldAvatar) {
      // Delete old image via Cloudinary API
      const formData = {
        api_key: process.env.CLOUDINARY_KEY,
        public_id: oldAvatar.publicId
      };

      try {
        await fetch(
          "https://api.cloudinary.com/v1_1/fourplayers/image/destroy",
          {
            method: "POST",
            body: formData
          }
        );
      } catch (e) {
        console.error(e);
        throw new Error("Unable to remove old avatar");
      }
    }

    // Update user
    const obj = {
      data: {
        avatar: {
          upsert: {
            create: {
              publicId: newAvatar.publicId,
              url: newAvatar.url,
              smallUrl: newAvatar.smallUrl
            },
            update: {
              publicId: newAvatar.publicId,
              url: newAvatar.url,
              smallUrl: newAvatar.smallUrl
            }
          }
        }
      },
      where: { id: ctx.req.userId }
    };

    const results = await ctx.db.mutation.updateUser(obj, info);

    await ctx.db.mutation.createActivityLogItem({
      data: {
        time: new Date(),
        message: `Added a new profile photo`,
        messageCode: "PROFILE_PHOTO_SUBMITTED",
        link: `/profile/${ctx.req.user.username}`,
        user: {
          connect: {
            id: ctx.req.userId
          }
        }
      }
    });

    // TODO error handling
    if (false) {
      return { message: "Unable to update avatar" };
    }
    return { message: "Avatar updated" };
  },
  async deleteAvatar(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    const { avatar } = args;

    // Remove from Cloudinary
    try {
      const cloudinaryResults = await promisifiedDestroy(avatar.publicId);

      if (cloudinaryResults && cloudinaryResults.result !== "ok") {
        throw new Error(cloudinaryResults);
      }
    } catch (e) {
      console.error(e);
      throw new Error("Unable to delete old avatar");
    }

    // Remove from user
    const obj = {
      data: {
        avatar: {
          delete: true
        }
      },
      where: { id: ctx.req.userId }
    };

    const results = await ctx.db.mutation.updateUser(obj, info);

    if (false) {
      return { message: "Unable to delete avatar" };
    }
    return { message: "Avatar deleted" };
  },
  async updateRig(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    const { data } = args;
    const { old, new: newRig } = data;

    // Remove from Cloudinary
    if (old) {
      try {
        const cloudinaryResults = await promisifiedDestroy(old.publicId);

        if (cloudinaryResults.result !== "ok") {
          throw new Error("Unable to delete old rig image", cloudinaryResults);
        }
      } catch (e) {
        console.error(e);
        throw new Error("Unable to delete old rig image");
      }
    }

    // Update user
    const obj = {
      data: {
        rig: {
          upsert: {
            create: {
              image: {
                create: {
                  publicId: newRig.publicId,
                  url: newRig.url,
                  smallUrl: newRig.smallUrl
                }
              }
            },
            update: {
              image: {
                upsert: {
                  create: {
                    publicId: newRig.publicId,
                    url: newRig.url,
                    smallUrl: newRig.smallUrl
                  },
                  update: {
                    publicId: newRig.publicId,
                    url: newRig.url,
                    smallUrl: newRig.smallUrl
                  }
                }
              }
            }
          }
        }
      },
      where: { id: ctx.req.userId }
    };

    const results = await ctx.db.mutation.updateUser(obj, info);

    await ctx.db.mutation.createActivityLogItem({
      data: {
        time: new Date(),
        message: `Added a new rigbook photo`,
        messageCode: "RIGBOOK_PHOTO_SUBMITTED",
        link: `/profile/${ctx.req.user.username}`,
        user: {
          connect: {
            id: ctx.req.userId
          }
        }
      }
    });

    // TODO error handling
    if (false) {
      return { message: "Unable to update rig image" };
    }
    return { message: "Rig image updated" };
  },
  async deleteRig(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    const { rig } = args;

    // Remove from Cloudinary
    try {
      const cloudinaryResults = await promisifiedDestroy(rig.publicId);

      if (cloudinaryResults && cloudinaryResults.result !== "ok") {
        throw new Error(cloudinaryResults);
      }
    } catch (e) {
      console.error(e);
      throw new Error("Unable to delete old rig image");
    }

    // Remove from user
    const obj = {
      data: {
        rig: {
          delete: true
        }
      },
      where: { id: ctx.req.userId }
    };

    const results = await ctx.db.mutation.updateUser(obj, info);

    if (false) {
      return { message: "Unable to update rig image" };
    }
    return { message: "Rig image deleted" };
  },
  async updateVehicle(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Requesting user has proper account status?
    // hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { vehicle, id: vehicleId } = args;
    const { outfitLevel, mods, ...restVehicle } = vehicle;

    const data = {
      vehicle: {
        upsert: {
          create: {
            outfitLevel: outfitLevel && outfitLevel != 0 ? outfitLevel : null,
            mods: {
              set: mods || []
            },
            ...restVehicle
          },
          update: {
            outfitLevel: outfitLevel && outfitLevel != 0 ? outfitLevel : null,
            mods: {
              set: mods || []
            },
            ...restVehicle
          }
        }
      }
    };

    const results = await ctx.db.mutation.updateUser(
      {
        data,
        where: {
          id: ctx.req.userId
        }
      },
      info
    );

    return { message: "Your vehicle has been updated" };
  },
  async submitElection(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { election } = args;

    // Format races
    const races = election.races.map(race => {
      race.candidates = {
        connect: race.candidates
      };
      return race;
    });

    // Update election
    return ctx.db.mutation.createElection(
      {
        data: {
          electionName: election.electionName,
          startTime: election.startTime,
          endTime: election.endTime, // 1 week default
          races: { create: races }
        }
      },
      info
    );
  },
  async submitVote(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Requesting user has proper account type?
    hasAccountType(ctx.req.user, ["FULL"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    // Have they voted for this ballot before?
    const { vote } = args;
    const votes = await ctx.db.query.votes(
      {
        where: {
          AND: [
            { ballot: { id: vote.ballot } },
            { voter: { id: ctx.req.userId } }
          ]
        }
      },
      info
    );

    if (votes.length > 0) {
      throw new Error("User has voted already");
    }

    const data = {
      dateTime: new Date(vote.dateTime),
      ballot: {
        connect: {
          id: vote.ballot
        }
      },
      voter: {
        connect: {
          id: ctx.req.userId
        }
      }
    };

    if (vote.candidate) {
      data.candidate = {
        connect: { id: vote.candidate }
      };
    }

    // Record vote
    await ctx.db.mutation.createVote({ data });

    return { message: "Thank you for voting" };
  },
  async createTrail(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { trail } = args;
    const { featuredImage, newFeaturedImage, ...filteredTrail } = trail;

    let data = { ...filteredTrail };

    if (newFeaturedImage) {
      // New featured image submitted
      data.featuredImage = {
        create: {
          ...newFeaturedImage
        }
      };
    }

    const results = await ctx.db.mutation.createTrail({ data }, info);

    return { message: "Your trail has been created" };
  },
  async updateTrail(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE"]);

    const { trail, id: trailId } = args;
    const { newFeaturedImage, featuredImage, ...filteredTrail } = trail;

    // Get current trail for later comparison
    const existingTrail = await ctx.db.query.trail(
      {
        where: {
          id: trailId
        }
      },
      info
    );

    let data = { ...filteredTrail };

    if (newFeaturedImage) {
      // New featured image submitted
      data.featuredImage = {
        upsert: {
          create: {
            ...newFeaturedImage
          },
          update: {
            ...newFeaturedImage
          }
        }
      };
    } else if (
      existingTrail.featuredImage &&
      existingTrail.featuredImage.publicId &&
      !newFeaturedImage
    ) {
      // Remove old featured image
      data.featuredImage = {
        delete: true
      };
    }

    const results = await ctx.db.mutation.updateTrail(
      {
        data,
        where: {
          id: trailId
        }
      },
      info
    );

    return { message: "Your trail has been updated" };
  }
};

module.exports = Mutations;
