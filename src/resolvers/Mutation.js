const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;

const { sendTransactionalEmail } = require("../mail");
const {
  getSecretaryNewUserEmail,
  getUserNewAccountEmail,
  getUserWelcomeEmail,
  getUserWebsiteRegistrationEmail,
  getUserEventRegistrationEmail,
  getUserAdminRegistrationEmail,
  getUserResetTokenEmail,
  getUserRejectionEmail
} = require("../utils/mail-templates");
const activityLog = require("../utils/activity-log");
const membershipLog = require("../utils/membership-log");

const promisifiedRandomBytes = promisify(randomBytes);

cloudinary.config({
  cloud_name: process.env.CLOUNDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const promisifiedUpload = promisify(cloudinary.uploader.unsigned_upload);
const promisifiedDestroy = promisify(cloudinary.uploader.destroy);

const isDev = process.env.NODE_ENV === "development";
const HASH_SECRET = process.env.HASH_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const {
  yearInMs,
  resetTokenTimeoutInMs,
  hasRole,
  hasAccountStatus,
  hasAccountType,
  isSelf,
  getUploadLocation,
  getDuesAmountIncludingFees,
  convertToCents,
  determineTitleChanges,
  determineOfficeChanges
} = require("../utils");
const { roles, emailGroups } = require("../config");
const stripe = require("../utils/stripe");
// const { getDocs } = require("../");

// const docs = require("./partials/docs");

const getHash = async pw => {
  const salt = await bcrypt.hash(HASH_SECRET, 10);
  return bcrypt.hash(pw, salt);
};

const tokenSettings = {
  httpOnly: true,
  maxAge: yearInMs,
  // domain: "4-playersofcolorado.org"
  secure: !isDev,
  sameSite: isDev ? "lax" : "none"
};

const Mutations = {
  async register(parent, args, ctx, info) {
    const { firstName, lastName, email, confirmEmail, source } = args;

    // VALIDATION
    if (!email) {
      throw new Error("Email is required");
    }

    if (!confirmEmail) {
      throw new Error("Email confirmation is required");
    }

    const lowercaseEmail = email.toLowerCase();
    const lowercaseConfirmEmail = confirmEmail.toLowerCase();

    if (lowercaseEmail !== lowercaseConfirmEmail) {
      throw new Error("Emails do not match");
    }

    if (!firstName) {
      throw new Error("Must include a first name");
    }

    if (!lastName) {
      throw new Error("Must include a last name");
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
          tokenExpiry: new Date(
            Date.now() + resetTokenTimeoutInMs
          ).toISOString()
        }
      },
      info
    );

    let emailDetails;

    switch (source) {
      case "website": // User initiated
        emailDetails = getUserWebsiteRegistrationEmail({
          email: lowercaseEmail,
          firstName,
          lastName,
          resetToken
        });
        break;
      case "run": // User attended run
      case "meeting": // User attended meeting
        emailDetails = getUserEventRegistrationEmail({
          email: lowercaseEmail,
          firstName,
          lastName,
          resetToken
        });
        break;
      case "admin": // Admin invited user directly
      default:
        emailDetails = getUserAdminRegistrationEmail({
          email: lowercaseEmail,
          firstName,
          lastName,
          resetToken,
          inviter: ctx.req.user.firstName
        });
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
    if (!args.firstName) {
      throw new Error("Must include a first name");
    }

    if (!args.lastName) {
      throw new Error("Must include a last name");
    }

    if (!args.username) {
      throw new Error("Must include a username");
    }

    if (!args.password) {
      throw new Error("Must include a password");
    }

    // Hash the password
    const password = await getHash(args.password);

    const { token, firstName, lastName, username, ...newUser } = args;

    // Create user in database
    try {
      await ctx.db.mutation.createUser(
        {
          data: {
            ...newUser,
            email: email.toLowerCase(),
            firstName,
            lastName,
            username,
            password,
            lastLogin: new Date().toISOString(),
            membershipLog: {
              create: [membershipLog.accountCreated()]
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
      return sendTransactionalEmail(getSecretaryNewUserEmail(username))
        .then(
          sendTransactionalEmail(
            getUserNewAccountEmail({
              firstName,
              lastName,
              email: email.toLowerCase(),
              username
            })
          )
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
  async unlockNewAccount(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const user = await ctx.db.query.user(
      { where: { id: args.userId } },
      "{ id, email, firstName, lastName }"
    );

    const lowercaseEmail = user.email.toLowerCase();

    // Add membership log
    const logs = [membershipLog.accountUnlocked(ctx.req.userId)];

    // Update status
    await ctx.db.mutation.updateUser(
      {
        data: {
          accountStatus: "ACTIVE",
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
    return sendTransactionalEmail(
      getUserWelcomeEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: lowercaseEmail
      })
    )
      .then(() => ({ message: "Account unlocked" }))
      .catch(err => {
        //Extract error msg
        // const { message, code, response } = err;

        //Extract response msg
        // const { headers, body } = response;

        throw new Error(err);
      });
  },
  async rejectNewAccount(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("You must be logged in");
    }

    // Requesting user has proper role?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const user = await ctx.db.query.user(
      { where: { id: args.userId } },
      "{ id, email, firstName, lastName }"
    );

    const lowercaseEmail = user.email.toLowerCase();

    // Add membership log
    const logs = [membershipLog.accountRejected(ctx.req.userId, args.reason)];

    // Update status
    await ctx.db.mutation.updateUser(
      {
        data: {
          accountStatus: "REJECTED",
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
    return sendTransactionalEmail(
      getUserRejectionEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: lowercaseEmail,
        reason: args.reason
      })
    )
      .then(() => ({ message: "Account rejected" }))
      .catch(err => {
        //Extract error msg
        // const { message, code, response } = err;

        //Extract response msg
        // const { headers, body } = response;

        throw new Error(err);
      });
  },
  async login(parent, { email, password }, ctx, info) {
    // Check if there is a user with that username
    const user = await ctx.db.query.user(
      { where: { email: email.toLowerCase() } },
      "{ id, username, password, userMeta { firstLoginComplete } }"
    );

    if (!user) {
      throw new Error("Username or password incorrect");
    }

    let updatedUserData = {
      lastLogin: new Date().toISOString()
    };

    // Check if password is correct
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error("Username or password incorrect"); // fix
    }

    // Generate the JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    // Set the cookie with the token
    ctx.res.cookie("token", token, tokenSettings);

    // Update role
    await ctx.db.mutation.updateUser(
      {
        data: updatedUserData,
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
    const { maxAge, ...restTokenSettings } = tokenSettings;
    ctx.res.clearCookie("token", restTokenSettings);
    return { message: "Goodbye" };
  },
  async requestReset(parent, { email }, ctx, info) {
    // Check if this is a real user
    const lowerEmail = email.toLowerCase();
    const user = await ctx.db.query.user({
      where: { email: lowerEmail }
    });

    if (!user) {
      throw new Error("Invalid email entered");
    }

    // Set reset token and expiry
    const resetToken = (await promisifiedRandomBytes(20)).toString("hex");
    const resetTokenExpiry = new Date(
      Date.now() + resetTokenTimeoutInMs
    ).toISOString();

    await ctx.db.mutation.updateUser({
      where: { email: lowerEmail },
      data: { resetToken, resetTokenExpiry }
    });

    // Email reset token
    return sendTransactionalEmail(
      getUserResetTokenEmail({
        email: email.toLowerCase(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        resetToken
      })
    )
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
        resetTokenExpiry_gte: new Date(
          Date.now() - resetTokenTimeoutInMs
        ).toISOString()
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Update role
    try {
      return ctx.db.mutation.updateUser(
        {
          data: {
            role: args.role,
            membershipLog: {
              create: [
                membershipLog.accountChanged({
                  stateName: "Role",
                  newState: args.role,
                  userId: ctx.req.userId
                })
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Changing account type to 'FULL', add membership log
    const logs = [
      membershipLog.accountChanged({
        stateName: "Account type",
        newState: args.accountType,
        userId: ctx.req.userId
      })
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: { id: args.userId }
      },
      "{ accountStatus }"
    );

    // Add membership log
    const logs = [
      membershipLog.accountChanged({
        stateName: "Account status",
        newState: args.accountStatus,
        userId: ctx.req.userId
      })
    ];

    // Account unlocked
    if (
      currentUser.accountStatus === "LOCKED" &&
      args.accountStatus !== "LOCKED"
    ) {
      logs.push(membershipLog.accountUnlocked(ctx.req.userId));
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const { office: existingOffice } = await ctx.db.query.user(
      { where: { id: args.userId } },
      "{ office }"
    );

    if (args.office !== null) {
      const existingOfficer = await ctx.db.query.user(
        { where: { office: args.office } },
        "{ firstName, lastName }"
      );

      if (existingOfficer) {
        throw new Error(
          `Officer already assigned to ${existingOfficer.firstName} ${
            existingOfficer.lastName
          }. Unassign first, then try again.`
        );
      }
    }

    let membershipLogs = [];

    const [officeToRemove, officeToAdd, officeToLog] = determineOfficeChanges(
      existingOffice === "NONE" ? null : existingOffice,
      args.office,
      ctx.req.userId,
      true
    );

    membershipLogs = membershipLogs.concat(officeToLog);

    // Update office
    return ctx.db.mutation.updateUser(
      {
        data: {
          office: officeToAdd === "" ? null : officeToAdd,
          membershipLog: {
            create: membershipLogs
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  },
  async updateTitles(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const { titles: existingTitles } = await ctx.db.query.user(
      { where: { id: args.userId } },
      "{ titles }"
    );

    let membershipLogs = [];

    const [titlesToRemove, titlesToAdd, titleLogs] = determineTitleChanges(
      existingTitles,
      args.titles,
      ctx.req.userId,
      true
    );

    membershipLogs = membershipLogs.concat(titleLogs);

    // Update title
    return ctx.db.mutation.updateUser(
      {
        data: {
          titles: titles.length === 0 ? null : titlesToAdd,
          membershipLog: {
            create: membershipLogs
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

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
      startTime: new Date(event.startTime).toISOString(),
      endTime: new Date(event.endTime).toISOString(),
      address: event.address || "",
      trailDifficulty: event.trailDifficulty || "",
      // trailNotes: event.trailNotes,
      rallyAddress: event.rallyAddress || "",
      membersOnly: event.membersOnly,
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const { event, id: eventId } = args;

    // Get current event for later comparison
    const existingEvent = await ctx.db.query.event(
      {
        where: {
          id: eventId
        }
      },
      "{ id, rsvps { id, member { id, username } }, host { id, username }, trail { id }, featuredImage { id, publicId } }"
    );

    const data = {
      title: event.title,
      type: event.type,
      description: event.description || "",
      startTime: new Date(event.startTime).toISOString(),
      endTime: new Date(event.endTime).toISOString(),
      address: event.address || "",
      trailDifficulty: event.trailDifficulty || "",
      // trailNotes: event.trailNotes,
      rallyAddress: event.rallyAddress || "",
      membersOnly: event.membersOnly,
      maxAttendees: event.maxAttendees,
      maxRigs: event.maxRigs,
      creator: {
        connect: { id: ctx.req.userId }
      },
      host: {
        connect: {
          username: event.host
        }
      }
    };

    // Does host need an RSVP?
    if (
      existingEvent.rsvps &&
      !existingEvent.rsvps.find(rsvp => rsvp.member.username === event.host)
    ) {
      data.rsvps = {
        create: [
          {
            member: {
              connect: {
                username: event.host
              }
            },
            status: "GOING"
          }
        ]
      };
    }

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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    // Requesting user has proper role?
    if (ctx.req.userId !== rsvp.userId) {
      hasRole(ctx.req.user, ["ADMIN", "OFFICER"]);
    }

    // Query the current user
    const currentUser = await ctx.db.query.user(
      { where: { id: rsvp.userId } },
      "{ id, accountStatus, accountType, eventsRSVPd { id, status, event { id }, vehicle { id }, guestCount } }"
    );

    if (!currentUser) {
      throw new Error("User does not have permission");
    }

    if (
      currentUser.accountStatus !== "ACTIVE" &&
      currentUser.accountStatus !== "PAST_DUE"
    ) {
      throw new Error("User does not have permission");
    }

    if (currentUser.accountType === "GUEST") {
      const rsvps = await ctx.db.query.rSVPs(
        {
          where: {
            AND: [
              {
                member: {
                  id: rsvp.userId
                }
              },
              {
                event: {
                  type: "RUN"
                }
              },
              {
                status: "GOING"
              }
            ]
          }
        },
        "{ id }"
      );

      if (rsvps.length >= 3 && rsvp.status === "GOING") {
        throw new Error(
          "Guests can only attend 3 runs. Please become a member to attend more."
        );
      }
    }

    // Has this user already RSVPd?
    const userRSVP = currentUser.eventsRSVPd.find(
      eventRSVP => eventRSVP.event.id === rsvp.eventId
    );

    // console.log("userRSVP", userRSVP);

    // If this RSVP is different, update RSVP
    if (userRSVP) {
      // console.log("update rsvp");
      // console.log("rsvp", rsvp);

      // console.log("before passengers", userRSVP.memberPassengers);
      // console.log("after passengers", rsvp.memberPassengers);
      // console.log("guests", rsvp.guestCount);
      // console.log("before", oldMembersSet);
      // console.log("after", newMembersSet);
      // console.log(
      //   "to remove",
      //   memberPassengersNoLongerAttending,
      //   [...memberPassengersNoLongerAttending].map(passenger => ({
      //     id: passenger
      //   }))
      // );
      // console.log(
      //   "to add",
      //   memberPassengersNotYetAttending,
      //   [...memberPassengersNotYetAttending].map(passenger => ({
      //     id: passenger
      //   }))
      // );

      // is there an existing vehicle on this rsvp? do they match?
      // do nothing
      // is there no existing vehicle but member is now bringing one?
      // connect
      // is there an existing vehicle but member is no longer bringing one?
      // disconnect

      let vehicle;

      if (!userRSVP.vehicle && rsvp.vehicle) {
        // no existing vehicle but member is now bringing one
        vehicle = {
          vehicle: {
            connect: {
              id: rsvp.vehicle
            }
          }
        };
      } else if (userRSVP.vehicle && !rsvp.vehicle) {
        // existing vehicle but member is no longer bringing one
        vehicle = {
          vehicle: {
            disconnect: true
          }
        };
      } else {
        // existing vehicle on this rsvp, no change needed
        vehicle = {};
      }

      console.log("vehicle", vehicle);

      await ctx.db.mutation.updateRSVP(
        {
          where: { id: userRSVP.id },
          data: {
            status: rsvp.status,
            equipment: rsvp.equipment || null,
            guestCount: rsvp.guestCount,
            isRider: !vehicle ? true : rsvp.isRider,
            ...vehicle
            // memberGuests: {
            //   connect: [...memberPassengersNotYetAttending].map(passenger => ({
            //     id: passenger
            //   })),
            //   disconnect: [...memberPassengersNoLongerAttending].map(
            //     passenger => ({
            //       id: passenger
            //     })
            //   )
            // },
            // paid: null,
          }
        },
        info
      );

      return { message: "Thank you for updating your RSVP" };
    }

    // console.log("new rsvp", rsvp.memberPassengers);

    // If RSVP is missing, record RSVP

    // 1. If rider RSVP:
    //   cannot have member guests of their own
    //   cannot have non member guests of their own
    // 2. If driver RSVP has member guests:
    //   create yes RSVP for member guests if they dont exist
    //     add chaperone
    //   update member guests RSVP to yes if they do exist
    //     add chaperone

    let vehicle;

    if (userRSVP && !userRSVP.vehicle && rsvp.vehicle) {
      // no existing vehicle but member is now bringing one
      vehicle = {
        vehicle: {
          connect: {
            id: rsvp.vehicle
          }
        }
      };
    } else if (userRSVP && userRSVP.vehicle && !rsvp.vehicle) {
      // existing vehicle but member is no longer bringing one
      vehicle = {
        vehicle: {
          disconnect: true
        }
      };
    } else {
      // existing vehicle on this rsvp, no change needed
      vehicle = {};
    }

    // console.log("vehuicle", vehicle);

    await ctx.db.mutation.createRSVP(
      {
        data: {
          status: rsvp.status,
          // ...(rsvp.memberPassengers.length > 0
          //   ? {
          //       memberPassengers: {
          //         connect: rsvp.memberPassengers
          //           .map(passenger => ({
          //             id: passenger
          //           }))
          //           .filter(passenger => passenger.id !== null)
          //       }
          //     }
          //   : {}),
          // paid: null,
          equipment: rsvp.equipment || null,
          guestCount: rsvp.guestCount,
          isRider: rsvp.isRider || false,
          member: {
            connect: {
              id: rsvp.userId
            }
          },
          event: {
            connect: {
              id: rsvp.eventId
            }
          },
          ...vehicle
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
      subject: `${subject || `Message from ${user.firstName}`}`,
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
              return { title_in: "WEBMASTER" };
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

      const membershipLogs = [];
      const activityLogs = [];

      if (hasRole(ctx.req.user, ["ADMIN", "OFFICER"], false)) {
        // Became a full member
        if (
          currentUser.accountType === "FULL" &&
          typeof args.data.joined === "string" &&
          currentUser.joined === null
        ) {
          activityLogs.push(
            activityLog.joined({
              joined: args.data.joined
            })
          );
        }

        if (
          currentUser.accountType === "ASSOCIATE" &&
          typeof args.data.joined === "string" &&
          currentUser.joined === null
        ) {
          activityLogs.push(
            activityLog.joined({
              joined: args.data.joined
            })
          );
        }

        // Account unlocked
        if (
          args.data.accountStatus &&
          currentUser.accountStatus === "LOCKED" &&
          args.data.accountStatus !== "LOCKED"
        ) {
          membershipLogs.push(membershipLog.membershipUnlocked(ctx.req.userId));
        }

        // Account rejected
        if (
          args.data.accountStatus &&
          currentUser.accountStatus === "REJECTED" &&
          args.data.accountStatus !== "REJECTED"
        ) {
          membershipLogs.push(
            membershipLog.membershipRejected(ctx.req.userId, "why") // TODO note
          );
        }
      }

      // Update user
      const obj = {
        data: {
          firstName: args.data.firstName,
          lastName: args.data.lastName,
          username: args.data.username,
          gender: args.data.gender,
          birthdate: new Date(args.data.birthdate).toISOString(),
          joined: args.data.joined
            ? new Date(args.data.joined).toISOString()
            : null,
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
          comfortLevel: args.data.comfortLevel,
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
            create: membershipLogs
          },
          activityLog: {
            create: activityLogs
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const {
      data: { titles, ...restData }
    } = args;

    // Query the current user
    const currentUser = await ctx.db.query.user(
      { where: { id: args.id } },
      "{ id, accountType, accountStatus, role, office, titles }"
    );

    let membershipLogs = [];

    const [titlesToRemove, titlesToAdd, titlesToLog] = determineTitleChanges(
      currentUser.titles,
      titles,
      ctx.req.userId
    );

    membershipLogs = [...membershipLogs, ...titlesToLog];

    const [officeToRemove, officeToAdd, officeToLog] = determineOfficeChanges(
      currentUser.office,
      restData.office,
      ctx.req.userId
    );

    membershipLogs = [...membershipLogs, ...officeToLog];

    if (currentUser.role !== restData.role) {
      membershipLogs.push(
        membershipLog.accountChanged({
          stateName: "Role",
          newState: restData.role,
          userId: ctx.req.userId
        })
      );
    }

    if (currentUser.accountStatus !== restData.accountStatus) {
      membershipLogs.push(
        membershipLog.accountChanged({
          stateName: "Account status",
          newState: restData.accountStatus,
          userId: ctx.req.userId
        })
      );
    }

    if (currentUser.accountType !== restData.accountType) {
      membershipLogs.push(
        membershipLog.accountChanged({
          stateName: "Account type",
          newState: restData.accountType,
          userId: ctx.req.userId
        })
      );
    }

    // Update user
    await ctx.db.mutation.updateUser(
      {
        data: {
          ...restData,
          ...(titlesToAdd
            ? {
                titles: {
                  set: titles
                }
              }
            : {}),
          ...(membershipLogs.length > 0
            ? {
                membershipLog: {
                  create: membershipLogs
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
      data: activityLog.newProfilePhoto({
        username: ctx.req.user.username,
        userId: ctx.req.user.id
      })
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
      data: activityLog.newRigbookPhoto({
        username: ctx.req.user.username,
        userId: ctx.req.user.id
      })
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
    // hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const { vehicle, id: vehicleId } = args;
    const { outfitLevel, mods, ...restVehicle } = vehicle;

    const data = {
      vehicle: {
        upsert: {
          create: {
            outfitLevel: outfitLevel && outfitLevel !== 0 ? outfitLevel : null,
            mods: {
              set: mods || []
            },
            ...restVehicle
          },
          update: {
            outfitLevel: outfitLevel && outfitLevel !== 0 ? outfitLevel : null,
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

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
      dateTime: new Date(vote.dateTime + "12:00:00").toISOString(),
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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

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
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

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
  },
  async updateTrailImage(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    hasRole(ctx.req.user, ["ADMIN", "OFFICER", "RUN_MASTER"]);

    // Requesting user has proper account status?
    hasAccountStatus(ctx.req.user, ["ACTIVE", "PAST_DUE"]);

    const { id, image } = args;

    // const { newFeaturedImage, featuredImage, ...filteredTrail } = trail;

    // Get current trail for later comparison
    // const existingTrail = await ctx.db.query.trail(
    //   {
    //     where: {
    //       id: trailId
    //     }
    //   },
    //   info
    // );

    // let data = {};

    // if (image) {
    // New featured image submitted
    // const data = {
    //   featuredImage: {
    //     upsert: {
    //       create: image,
    //       update: image
    //     }
    //   }
    // };
    // } else if (
    //   existingTrail.featuredImage &&
    //   existingTrail.featuredImage.publicId &&
    //   !newFeaturedImage
    // ) {
    //   // Remove old featured image
    //   data.featuredImage = {
    //     delete: true
    //   };
    // }

    await ctx.db.mutation.updateTrail(
      {
        data: {
          featuredImage: {
            upsert: {
              create: image,
              update: image
            }
          }
        },
        where: {
          id
        }
      },
      info
    );

    return { message: "Your trail photo has been updated" };
  },
  async payMembershipDues(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    // Have proper roles to do this?
    if (!hasAccountType(ctx.req.user, ["FULL", "ASSOCIATE"], true)) {
      throw new Error(
        `Account type must be FULL or ASSOCIATE to proceed. Please contact the webmaster.`
      );
    }

    // Requesting user has proper account status?
    if (!hasAccountStatus(ctx.req.user, ["PAST_DUE", "ACTIVE"], false)) {
      throw new Error(
        `Account status must be ACTIVE or PAST_DUE to proceed. Contact the board to request reinstatement`
      );
    }

    const { token } = args.data;

    // Confirm all `payingFor` IDs eligible for payment?
    // const fullMemberCount = x;
    // const associateMemberDues = y;

    // Recalculate amount due (confirm)
    // const duesAmount = getDuesAmountIncludingFees(x, y);
    const duesAmount = getDuesAmountIncludingFees();

    // if (args.amount !== duesAmount) {
    //   throw new Error(
    //     "Amount received does not match expected amount. Contact the webmaster"
    //   );
    // }

    // Submit to stripe
    try {
      const charge = await stripe.charges.create({
        amount: convertToCents(duesAmount),
        currency: "USD",
        source: token
      });

      if (charge.status === "succeeded") {
        // Create membership log entry for payer
        await ctx.db.mutation.updateUser({
          data: {
            accountStatus: "ACTIVE",
            membershipLog: {
              create: [
                membershipLog.accountChanged({
                  stateName: "Account status",
                  newState: "ACTIVE",
                  userId: ctx.req.userId
                }),
                membershipLog.duesPaid(duesAmount)
              ]
            }
          },
          where: {
            id: ctx.req.userId
          }
        });

        // Create membership log entry for other recipients
        // Send email to payer and recipients

        return {
          message: "Dues payment was successful."
        };
      } else {
        throw new Error(charge.failure_message || "Error processing charge");
      }
    } catch (e) {
      throw new Error(e);
    }
  },
  async logMembershipEvent(parent, args, ctx, info) {
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
    if (!hasAccountStatus(ctx.req.user, ["ACTIVE"], false)) {
      throw new Error(`Account status must be ACTIVE to proceed.`);
    }

    await ctx.db.mutation.createMembershipLogItem({
      data: {
        time: args.date, // Browser time
        message: args.message,
        messageCode: args.code,
        user: {
          connect: {
            id: args.userId
          }
        },
        logger: {
          connect: {
            id: ctx.req.user.id
          }
        }
      }
    });

    return { message: "Item successfully logged" };
  },
  async notifications(parent, args, ctx, info) {
    // Logged in?
    if (!ctx.req.userId) {
      throw new Error("User must be logged in");
    }

    const user = await ctx.db.query.user(
      { where: { id: ctx.req.userId } },
      "{ id, firstName, lastName, email, userMeta { id } }"
    );

    if (user && user.userMeta) {
      const { id } = user.userMeta;
      const settings = Object.entries(args.settings);
      const [key, value] = settings[0];

      // Update settings
      await ctx.db.mutation.updateUserMeta({
        data: {
          [key]: value
        },
        where: {
          id
        }
      });

      const { firstName, lastName, email } = user;
      const lowercaseEmail = email.toLowerCase();

      const emailDetails = getRemindWebmasterToSubscribeEmail({
        email: lowercaseEmail,
        firstName,
        lastName,
        action: value ? "subscribe" : "unsubscribe",
        newsletter: key
      });

      // Send webmaster reminder email
      // TODO: Connect to SendGrid
      return sendTransactionalEmail(emailDetails)
        .then(() => ({
          message: "Setting successfully updated"
        }))
        .catch(err => {
          throw new Error(err.toString());
        });
    }

    throw new Error("Unable to update notifications settings");
  }
};

module.exports = Mutations;
