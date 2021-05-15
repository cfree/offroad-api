const { unserialize } = require("php-serialize");
const cuid = require("cuid");

const { mysql, postgres } = require("./db");

const {
  getTrailPreference,
  getBirthdate,
  getLastLogin,
  getGender,
  getRole,
  getAccountStatus,
  getAccountType,
  getPhoneNumber,
  getState,
  getEmergencyContactName,
  getPhotoPermissions,
  getTshirtSize,
  getOutfitLevel,
  getYear,
  createJsonFile
} = require("./utils");

/**
 * Migrate users, contact info, preferences, vehicles
 *
 * @desc Move old WordPress MySQL database to new app Postgres database
 * Generates users.json and vehicles.json migration files
 */

const fn = async () => {
  try {
    // USERS

    // Retrieve old users
    const retrievedUsers = await mysql
      .select(
        "u.ID",
        "m.member_id",
        "u.user_registered",
        "m.user_name",
        "m.first_name",
        "m.last_name",
        "m.password",
        "m.member_since",
        "s.alias", // Member, Guest, Content Protection
        "m.account_state", // active, inactive
        "m.last_accessed",
        "m.email",
        "m.phone",
        "m.address_street",
        "m.address_city",
        "m.address_state",
        "m.address_zipcode",
        "m.gender",
        "me.meta_value"
      )
      .from("users AS u")
      .leftJoin("wp_eMember_members_tbl AS m", "u.user_email", "=", "m.email")
      .leftJoin(
        "wp_eMember_membership_tbl AS s",
        "m.membership_level",
        "=",
        "s.id"
      )
      .leftJoin("wp_members_meta_tbl AS me", "m.member_id", "=", "me.user_id")
      .distinct("m.email")
      .whereNotNull("m.email")
      .whereNotNull("m.password");

    /**
     * Unserialized format:
     *
     * Birth_Date
     * Website_-_Permission_to_post_pictures_of_me
     * T-Shirt_Size
     * Emergency_Contact_-_Name
     * Emergency_Contact_-_Phone_Number
     * Rig_Year
     * Rig_Make
     * Rig_Model
     * Rig_Outfit_Level
     * Rig_Modifications
     * Rig_-_Highest_Preferred_Trail_Rating
     * Facebook_URL
     */
    const unserializedUsers = retrievedUsers.map(user => {
      const { meta_value, ...rest } = user;
      const newUser = {
        ...rest,
        meta: meta_value ? unserialize(meta_value) : {}
      };
      return newUser;
    });

    const userMap = [];

    // Insert new users
    await Promise.all(
      unserializedUsers.map(async user => {
        const newId = cuid();

        userMap.push({
          ...user,
          oldId: user.ID,
          oldMemberId: user.member_id,
          newId
        });

        return postgres("User").insert(
          {
            id: newId,
            createdAt: user.user_registered,
            updatedAt: new Date().toISOString(),
            joined:
              user.alias === "Member"
                ? new Date(
                    new Date(user.member_since).setHours(12)
                  ).toISOString()
                : null,
            lastLogin: new Date(getLastLogin(user.last_accessed)).toISOString(),
            firstName: user.first_name,
            lastName: user.last_name,
            email:
              process.env.NODE_ENV === "staging"
                ? `craigfreeman+${user.user_name}@gmail.com`
                : user.email,
            gender: getGender(user.gender),
            birthdate: getBirthdate(user.meta.Birth_Date),
            username: user.user_name.toLowerCase(),
            password: user.password, // md5
            role: getRole(user.alias),
            accountStatus: getAccountStatus(user.account_state),
            accountType: getAccountType(user.alias),
            comfortLevel: getTrailPreference(
              user.meta["Rig_-_Highest_Preferred_Trail_Rating"]
            )
          },
          ["id"]
        );
      })
    );

    console.log("Users inserted");

    // Generate user migration json file
    createJsonFile("users", userMap);

    // Insert new contact info
    let contactInfoPivot = {};

    await Promise.all(
      unserializedUsers.map(async user => {
        const newId = cuid();
        contactInfoPivot = {
          ...contactInfoPivot,
          [user.ID]: newId
        };

        return postgres("ContactInfo").insert(
          {
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            street: user.address_street || "",
            city: user.address_city || "",
            state: getState(user.address_state),
            zip: user.address_zipcode || "00000",
            phone: getPhoneNumber(user.phone)
          },
          ["id"]
        );
      })
    );

    console.log("ContactInfo inserted");

    // Add to _UserContactInfo pivot table
    // A: ContactInfo.id, B: User.id
    await Promise.all(
      userMap.map(async user => {
        const contactInfoId = contactInfoPivot[user.oldId];

        if (!contactInfoId) {
          console.log(
            "No contact info id, not inserting contact info for userID",
            user.oldId
          );
          // bail
          return;
        }

        return postgres("_UserContactInfo").insert({
          A: contactInfoId,
          B: user.newId
        });
      })
    );

    // Insert preferences
    let prefsPivot = {};

    await Promise.all(
      unserializedUsers.map(async user => {
        const newId = cuid();

        prefsPivot = {
          ...prefsPivot,
          [user.ID]: newId
        };

        return postgres("Preference").insert(
          {
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            emergencyContactName: getEmergencyContactName(
              user.meta["Emergency_Contact_-_Name"]
            ),
            emergencyContactPhone: getPhoneNumber(
              user.meta["Emergency_Contact_-_Phone_Number"]
            ),
            photoPermissions: getPhotoPermissions(
              user.meta["Website_-_Permission_to_post_pictures_of_me"]
            ),
            showPhoneNumber: true,
            tshirtSize: getTshirtSize(user.meta["T-Shirt_Size"])
          },
          ["id"]
        );
      })
    );

    console.log("Preferences inserted");

    // Add to _UserPreferences pivot table
    // A: Preferences.id, B: User.id
    await Promise.all(
      userMap.map(async user => {
        const prefsId = prefsPivot[user.oldId];

        if (!prefsId) {
          // bail
          console.log(
            "No contact info id, not inserting contact info for userID",
            user.oldId
          );
          return;
        }

        return postgres("_UserPreferences").insert({
          A: prefsId,
          B: user.newId
        });
      })
    );

    // Get vehicle data
    const vehicleMap = unserializedUsers.reduce((memo, user) => {
      console.log("user.ID", user.ID, user.email);
      if (
        !getYear(user.meta["Rig_Year"]) ||
        !user.meta["Rig_Make"] ||
        !user.meta["Rig_Model"]
      ) {
        return memo;
      }

      return {
        ...memo,
        [user.ID]: {
          outfitLevel: getOutfitLevel(user.meta["Rig_Outfit_Level"]),
          year: parseInt(getYear(user.meta["Rig_Year"]), 10),
          make: user.meta["Rig_Make"],
          model: user.meta["Rig_Model"],
          mods: (user.meta["Rig_Modifications"] || "").split("\n")
        }
      };
    }, {});

    // Use: https://vpic.nhtsa.dot.gov/api/
    // VEHICLES

    // Generate vehicle migration json file
    createJsonFile("vehicles", vehicleMap);

    // STOP. `npm run migration:2`
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

return fn();
