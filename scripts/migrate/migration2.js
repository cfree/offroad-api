const cuid = require("cuid");

const { postgres } = require("./db");
const {
  readJsonFile,
  getYear,
  getMake,
  getModel,
  getTrim,
  getModifications
} = require("./utils");

/**
 * Migrate vehicles, vehicle mods
 *
 * @desc Move old WordPress MySQL database to new app Postgres database
 *
 * Must run migration1 script first to generate users.json and vehicles.json
 *
 * Assumes data in users.json and vehicles.json has been massaged
 */

const fn = async () => {
  try {
    const userMap = readJsonFile("/generated/users.json");
    const vehicleMap = readJsonFile("/generated/vehicles.json");

    // VEHICLES

    let vehiclePivot = {};

    // Insert vehicle data - assuming the json data has been massaged
    await Promise.all(
      userMap.map(async user => {
        const newId = cuid();

        if (
          !vehicleMap[user.oldId] ||
          !vehicleMap[user.oldId].year ||
          !vehicleMap[user.oldId].make ||
          !vehicleMap[user.oldId].model
        ) {
          return Promise.resolve();
        }

        vehiclePivot = {
          ...vehiclePivot,
          [user.oldId]: newId
        };

        return postgres("Vehicle").insert(
          {
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            year: getYear(vehicleMap[user.oldId].year),
            make: getMake(vehicleMap[user.oldId].make),
            model: getModel(vehicleMap[user.oldId].model),
            trim: getTrim(vehicleMap[user.oldId].model),
            outfitLevel: vehicleMap[user.oldId].outfitLevel
          },
          ["id"]
        );
      })
    );

    console.log("Vehicles inserted");

    // Associate to User
    // A: Preferences.id, B: User.id
    await Promise.all(
      userMap.map(async user => {
        const prefsId = vehiclePivot[user.oldId];

        if (!prefsId) {
          // bail
          return;
        }
        return postgres("User")
          .update({
            vehicle: prefsId
          })
          .where({ id: user.newId });
      })
    );

    // console.log("Users updated");

    // Insert vehicle mods
    await Promise.all(
      Object.entries(vehicleMap).map(async ([userId, vehicleDeets]) => {
        const vehicleId = vehiclePivot[userId];

        if (!vehicleId) {
          // bail
          return;
        }

        const parsedMods = getModifications(vehicleDeets.mods);

        const mods = parsedMods.map((mod, i) => ({
          nodeId: vehicleId,
          position: (i + 1) * 1000,
          value: mod
        }));

        if (mods.length > 0) {
          return postgres("Vehicle_mods").insert(mods);
        }

        return Promise.resolve();
      })
    );

    console.log("Mods inserted");

    // STOP. `npm run migration:3`
    return Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};

return fn();
