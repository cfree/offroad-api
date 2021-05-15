const fs = require("fs");

const states = [
  {
    name: "Alabama",
    abbreviation: "AL"
  },
  {
    name: "Alaska",
    abbreviation: "AK"
  },
  {
    name: "American Samoa",
    abbreviation: "AS"
  },
  {
    name: "Arizona",
    abbreviation: "AZ"
  },
  {
    name: "Arkansas",
    abbreviation: "AR"
  },
  {
    name: "California",
    abbreviation: "CA"
  },
  {
    name: "Colorado",
    abbreviation: "CO"
  },
  {
    name: "Connecticut",
    abbreviation: "CT"
  },
  {
    name: "Delaware",
    abbreviation: "DE"
  },
  {
    name: "District Of Columbia",
    abbreviation: "DC"
  },
  {
    name: "Federated States Of Micronesia",
    abbreviation: "FM"
  },
  {
    name: "Florida",
    abbreviation: "FL"
  },
  {
    name: "Georgia",
    abbreviation: "GA"
  },
  {
    name: "Guam",
    abbreviation: "GU"
  },
  {
    name: "Hawaii",
    abbreviation: "HI"
  },
  {
    name: "Idaho",
    abbreviation: "ID"
  },
  {
    name: "Illinois",
    abbreviation: "IL"
  },
  {
    name: "Indiana",
    abbreviation: "IN"
  },
  {
    name: "Iowa",
    abbreviation: "IA"
  },
  {
    name: "Kansas",
    abbreviation: "KS"
  },
  {
    name: "Kentucky",
    abbreviation: "KY"
  },
  {
    name: "Louisiana",
    abbreviation: "LA"
  },
  {
    name: "Maine",
    abbreviation: "ME"
  },
  {
    name: "Marshall Islands",
    abbreviation: "MH"
  },
  {
    name: "Maryland",
    abbreviation: "MD"
  },
  {
    name: "Massachusetts",
    abbreviation: "MA"
  },
  {
    name: "Michigan",
    abbreviation: "MI"
  },
  {
    name: "Minnesota",
    abbreviation: "MN"
  },
  {
    name: "Mississippi",
    abbreviation: "MS"
  },
  {
    name: "Missouri",
    abbreviation: "MO"
  },
  {
    name: "Montana",
    abbreviation: "MT"
  },
  {
    name: "Nebraska",
    abbreviation: "NE"
  },
  {
    name: "Nevada",
    abbreviation: "NV"
  },
  {
    name: "New Hampshire",
    abbreviation: "NH"
  },
  {
    name: "New Jersey",
    abbreviation: "NJ"
  },
  {
    name: "New Mexico",
    abbreviation: "NM"
  },
  {
    name: "New York",
    abbreviation: "NY"
  },
  {
    name: "North Carolina",
    abbreviation: "NC"
  },
  {
    name: "North Dakota",
    abbreviation: "ND"
  },
  {
    name: "Northern Mariana Islands",
    abbreviation: "MP"
  },
  {
    name: "Ohio",
    abbreviation: "OH"
  },
  {
    name: "Oklahoma",
    abbreviation: "OK"
  },
  {
    name: "Oregon",
    abbreviation: "OR"
  },
  {
    name: "Palau",
    abbreviation: "PW"
  },
  {
    name: "Pennsylvania",
    abbreviation: "PA"
  },
  {
    name: "Puerto Rico",
    abbreviation: "PR"
  },
  {
    name: "Rhode Island",
    abbreviation: "RI"
  },
  {
    name: "South Carolina",
    abbreviation: "SC"
  },
  {
    name: "South Dakota",
    abbreviation: "SD"
  },
  {
    name: "Tennessee",
    abbreviation: "TN"
  },
  {
    name: "Texas",
    abbreviation: "TX"
  },
  {
    name: "Utah",
    abbreviation: "UT"
  },
  {
    name: "Vermont",
    abbreviation: "VT"
  },
  {
    name: "Virgin Islands",
    abbreviation: "VI"
  },
  {
    name: "Virginia",
    abbreviation: "VA"
  },
  {
    name: "Washington",
    abbreviation: "WA"
  },
  {
    name: "West Virginia",
    abbreviation: "WV"
  },
  {
    name: "Wisconsin",
    abbreviation: "WI"
  },
  {
    name: "Wyoming",
    abbreviation: "WY"
  }
];

module.exports = {
  createJsonFile: (fileName, data) => {
    fs.writeFileSync(
      __dirname + `/generated/${fileName}.json`,
      JSON.stringify(data, null, 2),
      {
        flag: "w"
      }
    );

    console.log(`${fileName}.json generated`);
  },
  readJsonFile: filePath => {
    const rawUsersData = fs.readFileSync(__dirname + filePath);
    console.log(`${filePath} retrieved`);
    return JSON.parse(rawUsersData);
  },
  getTrailPreference: pref => {
    switch (pref) {
      case "Easy":
        return "EASY";
      case "Moderate":
        return "INTERMEDIATE";
      case "Difficult":
        return "ADVANCED";
      case "Difficult (if bypassed)":
        return "ADVANCED";
      default:
        return "UNKNOWN";
    }
  },
  getTrailName: name => {
    // Lowercase
    // \'
    // Ç
    return name
      .replace(`\'`, `'`)
      .replace("Ç", "C")
      .split(" ")
      .map(n => {
        const lowercaseName = n.toLowerCase();
        return lowercaseName
          .split("")
          .map((n, i) => {
            if (i === 0) {
              return n.toUpperCase();
            }
            return n;
          })
          .join("");
      })
      .join(" ");
  },
  getTrailDescription: desc => {
    // \'
    // \"
    return desc.replace(`\'`, `'`).replace(`\"`, `"`);
  },
  getTrailAddress: addr => {
    // address.join(" ").trim(),
    // ''
    const newAddr = addr.join().trim();
    return !!newAddr ? newAddr : null;
  },
  getBirthdate: bday => {
    const epoch = new Date("January 1, 1970 12:00:00").toISOString();
    const trimmedBday = (bday || "").trim();

    // blank
    if (!bday || !trimmedBday) {
      return epoch;
    }

    const regExp = /[a-zA-Z]/g;

    // 07201990
    if (
      trimmedBday.length === 8 &&
      !trimmedBday.includes("/") &&
      !trimmedBday.includes("-") &&
      !trimmedBday.includes(".") &&
      !trimmedBday.includes(" ") &&
      !regExp.test(trimmedBday)
    ) {
      const month = trimmedBday.substr(0, 2);
      const day = trimmedBday.substr(2, 2);
      const year = trimmedBday.substr(4);

      return new Date(`${month}/${day}/${year} 12:00:00`).toISOString();
    }

    // 091989
    if (
      trimmedBday.length === 6 &&
      !trimmedBday.includes("/") &&
      !trimmedBday.includes("-") &&
      !trimmedBday.includes(".") &&
      !trimmedBday.includes(" ") &&
      !regExp.test(trimmedBday)
    ) {
      const month = trimmedBday.substr(0, 2);
      const year = trimmedBday.substr(-2, 2);

      return new Date(`${month}/1/${year} 12:00:00`).toISOString();
    }

    // 09/1973
    if (
      trimmedBday.length === 7 &&
      Number.isInteger(parseInt(trimmedBday.substr(0, 2), 10)) &&
      trimmedBday.indexOf("/") === 2 &&
      Number.isInteger(parseInt(trimmedBday.substr(-4), 10)) &&
      trimmedBday.charAt(4) !== "/"
    ) {
      const [month, year] = trimmedBday.split("/");

      return new Date(`${month}/1/${year.substr(2)} 12:00:00`).toISOString();
    }

    // 01/01/1970
    // 7/23/1984
    // 10/23/69
    // 2/12/50
    // 01-16-1979
    // 1may1965
    // 12.11.1980
    // 08/29
    // 02/08
    // April 15
    // 04 JAN 1981
    // 1969
    const returnBday = new Date(`${trimmedBday} 12:00:00`);
    return isNaN(returnBday) ? epoch : returnBday.toISOString();
  },
  getLastLogin: lastAccess =>
    lastAccess === "0000-00-00 00:00:00"
      ? new Date("January 1, 1970 12:00:00").toISOString()
      : lastAccess,
  getGender: gender =>
    gender !== "not specified" ? gender.toUpperCase() : "UNDISCLOSED",
  getRole: alias => (alias === "Content Protection" ? "ADMIN" : "USER"),
  getEmergencyContactName: name => name || "",
  getTshirtSize: size => size || null,
  getAccountStatus: status => (status === "active" ? "ACTIVE" : "INACTIVE"),
  getAccountType: alias => (alias === "Member" ? "FULL" : "GUEST"),
  getPhotoPermissions: permission =>
    permission === "Granted" || permission === "" || false,
  getPhoneNumber: num => {
    const defaultNum = "0000000000";
    const trimmedNum = (num || "").trim();

    // blank
    if (!num || !trimmedNum) {
      return defaultNum;
    }

    // 303-345-1906
    if (
      trimmedNum.charAt(3) === "-" &&
      trimmedNum.charAt(7) === "-" &&
      trimmedNum.length === 12
    ) {
      return trimmedNum.split("-").join("");
    }

    // 303.618.5229
    if (
      trimmedNum.charAt(3) === "." &&
      trimmedNum.charAt(7) === "." &&
      trimmedNum.length === 12
    ) {
      return trimmedNum.split(".").join("");
    }

    // (435) 881-4950
    if (
      trimmedNum.charAt(0) === "(" &&
      trimmedNum.charAt(3) === ")" &&
      trimmedNum.charAt(4) === " " &&
      trimmedNum.charAt(8) === "-" &&
      trimmedNum.length === 14
    ) {
      const areaCode = trimmedNum.substr(1, 3);
      const phoneNum = trimmedNum.substr(6);
      return `${areaCode}${phoneNum.split("-").join("")}`;
    }

    // 720 771 7122
    if (
      trimmedNum.charAt(3) === " " &&
      trimmedNum.charAt(7) === " " &&
      trimmedNum.length === 12
    ) {
      return trimmedNum.split(" ").join("");
    }

    // 17205959226
    if (trimmedNum.charAt(0) === "1" && trimmedNum.length === 11) {
      return trimmedNum.substr(1);
    }

    // 504
    if (trimmedNum.length === 3) {
      return defaultNum;
    }

    // 7205959226
    return isNaN(trimmedNum) ? defaultNum : trimmedNum;
  },
  getState: state => {
    const defaultState = "CO";
    const trimmedState = (state || "").trim();

    // blank
    if (!state || !trimmedState) {
      return defaultState;
    }

    const normalizedState = trimmedState.toUpperCase();

    // CO
    if (normalizedState.length === 2) {
      return normalizedState;
    }

    // CO.
    if (normalizedState.length === 3 && normalizedState.charAt(2) === ".") {
      return normalizedState.substr(0, 2);
    }

    // Colorado / colorado / COLORADO / Iowa / Tennessee / California
    const abbrev = states.filter(
      state => state.name.toUpperCase() === normalizedState
    );

    return (abbrev.length > 0 && abbrev[0].abbreviation) || defaultState;
  },
  getYear: year => {
    console.log("year", year, typeof year);
    const trimmedYear = ((year || "").toString() || "").trim();

    // blank
    if (!year || !trimmedYear || isNaN(year) || year === "N/A") {
      return 0000;
    }

    // 1089
    if (trimmedYear.charAt(0) === 1 && trimmedYear.charAt(1) === 0) {
      return parseInt(year.replace(0, 9), 10);
    }

    // 09 || 02
    if (
      trimmedYear.length === 2 &&
      (trimmedYear.charAt(0) !== 9 ||
        trimmedYear.charAt(0) !== 8 ||
        trimmedYear.charAt(0) !== 7)
    ) {
      return parseInt(`20${trimmedYear}`, 10);
    }

    // 2013
    // 2018 & 2020
    // 2018/2020
    return parseInt(trimmedYear, 10);
  },
  getMake: make => {
    if (!make) {
      return null;
    }

    switch (make) {
      case "Jeep":
      case "JEEP":
      case "jeep":
      case "Jeep Unlimited Rubicon":
      case "Willys":
        return "Jeep";
      case "Chev":
      case "Chevy":
      case "Chevrolet":
        return "Chevrolet";
      case "Ram":
      case "RAM":
      case "Dodge":
        return "Dodge";
      case "toyota":
      case "Toyota":
        return "Toyota";
      case "polaris":
        return "polaris";
      case "land rover":
      case "Land Rover":
      case "range Rover":
        return "Land Rover";

      // Nissan
      // Ford
      // Isuzu
      // GMC
      // Subaru
      // Suzuki
      default:
        return make;
    }
  },
  getModel: model => {
    switch (model) {
      case "CJ":
        return "CJ-7";
      case "CJ5":
        return "CJ-5";
      case "YJ":
      case "wrangler":
      case "Wrangler":
      case "WRANGLER":
      case "Wrangler Sport":
      case "Wrangler, Unlimited":
      case "Wrangler unlimited":
      case "Wrangler Unlimited":
      case "Wrangler Unlimited - Rubicon":
      case "Wrangler Unlimited Rubicon":
      case "Wrangler Rubicon Unlimited":
      case "Wrangler Sport":
      case "Wrangler sport":
      case "Wrangler Rubicon":
      case "Rubicon Unlimited":
      case "Wrangler unlimited":
      case "Wrangler JK Rubicon":
      case "Wrangler Rubicon 10A":
      case "Wrangler Unlimited Hardrock Rubicon":
      case "Wrangler Rubicon HR":
      case "Wrangler Unlimited Recon":
      case "2-door Rubicon":
      case "2 Door Wrangler Oscar Mike Freedom Edition":
      case "Wrangler tj":
      case "Wrangler jl":
      case "Wrangler Safari":
      case "JK Rubicon Recon":
      case "JKU Rubicon":
      case "JLU Wrangler Sahara & JT Gladiator Rubicon":
      case "Wrangler/Gladiator":
      case "JKU":
      case "JK":
      case "Rubicon":
      case "Unlimited":
        return "Wrangler";
      case "Gladiator":
      case "Gladiator Rubicon":
        return "Gladiator";
      case "Cherokee":
      case "Cherokee XJ":
        return "Gladiator";
      case "WK":
      case "Grand Cherokee":
      case "Grand cherokee":
      case "GRAND CHEROKEE LIMITED":
      case "GC Trailhawk":
        return "Grand Cherokee";
      case "Rzr 800":
        return "RZR";
      case "Xyterra Pro4x":
      case "Xterra Pro4X":
      case "Xterra-Pro4":
      case "Xterra":
      case "XTerra":
        return "Xterra";
      case "D21 Hardbody Pickup 4x4":
        return "Pickup";
      case "Colorado Z71":
      case "Colorado ZR2":
      case "Colorado ZR2 Bison":
        return "Colorado";
      case "1500":
      case "Silverado 1500":
        return "Silverado";
      case "K/10 Custom":
        return "C/K Pickup";
      case "Yukon Denali":
        return "Yukon";
      case "F150":
        return "F-150";
      case "F-250":
      case "F250 Super Duty":
        return "F-250";
      case "F350":
        return "F-350";
      case "Ram":
      case "Rebel":
      case "1500 LARAMIE ECODIESEL":
        return "Ram";
      case "4 Runner":
      case "4runner":
      case "4Runner Trail":
      case "4Runner TRD OffRoad Premium":
        return "4-Runner";
      case "Tacoma":
      case "Tacoma TRD OFF ROAD":
        return "Tacoma";
      case "Tundra":
      case "Tundra 1794":
        return "Tundra";
      case "range rover":
        return "Range Rover";
      case "Sport":
        "Range Rover Sport";
      case "Disco II":
        return "Discovery";
      case "XV Crosstrek":
        return "XV CrossTrek";
      case "X90":
        return "X-90";

      // Trooper
      // Defender
      // Pickup
      // FJ Cruiser
      // Land Cruiser
      // Pathfinder
      // Ramcharger
      // Excursion
      // Ranger
      // Frontier
      // Renegade
      default:
        return model;
    }
  },
  getTrim: trim => {
    switch (trim) {
      case "Wrangler Sport":
      case "Wrangler Sport":
      case "Wrangler sport":
        return "Sport";
      case "Wrangler, Unlimited":
      case "Wrangler unlimited":
      case "Wrangler Unlimited":
      case "Wrangler unlimited":
      case "Unlimited":
        return "Unlimited";
      case "Wrangler Unlimited - Rubicon":
      case "Wrangler Unlimited Rubicon":
      case "Wrangler Rubicon Unlimited":
      case "Rubicon Unlimited":
      case "JKU Rubicon":
        return "Unlimited Rubicon";
      case "Wrangler Rubicon":
      case "Wrangler JK Rubicon":
      case "2-door Rubicon":
      case "Rubicon":
        return "Rubicon";
      case "Wrangler Rubicon 10A":
        return "Rubicon 10th Anniversary";
      case "Wrangler Unlimited Hardrock Rubicon":
        return "Unlimited Rubicon Hard Rock";
      case "Wrangler Rubicon HR":
        return "Rubicon Hard Rock";
      case "Wrangler Unlimited Recon":
        return "Unlimited Rubicon Recon";
      case "JK Rubicon Recon":
        return "Rubicon Recon";
      case "Oscar Mike Freedom Edition":
        return "Freedom Edition";
      case "Wrangler Safari":
        return "Safari";
      case "JLU Wrangler Sahara & JT Gladiator Rubicon":
        return "Unlimited Sahara";
      case "Gladiator Rubicon":
        return "Rubicon";
      case "GRAND CHEROKEE LIMITED":
        return "Limited";
      case "GC Trailhawk":
        return "Trailhawk";
      case "Rzr 800":
        return "800";
      case "Xyterra Pro4x":
      case "Xterra Pro4X":
      case "Xterra-Pro4":
        return "PRO-4X";
      case "Colorado Z71":
        return "Z71";
      case "Colorado ZR2":
        return "ZR2";
      case "Colorado ZR2 Bison":
        return "ZR2 Bison";
      case "Silverado 1500":
        return "1500";
      case "K/10 Custom":
        return "Custom";
      case "Yukon Denali":
        return "Denali";
      case "F250 Super Duty":
        return "Super Duty";
      case "1500 LARAMIE ECODIESEL":
        return "1500 Laramie EcoDiesel";
      case "Rebel":
        return "Rebel";
      case "4Runner Trail":
        return "Trail Special Edition";
      case "4Runner TRD OffRoad Premium":
        return "TRD Off Road Premium";
      case "Tacoma TRD OFF ROAD":
        return "TRD Off Road";
      case "Tundra 1794":
        return "1794 Edition";
      case "Disco II":
        return "Series II";
      // Wrangler tj
      // Wrangler jl
      // Wrangler/Gladiator
      // JKU
      // JK
      // Gladiator
      // Cherokee
      // Cherokee XJ
      // Renegade
      // WK
      // Grand Cherokee
      // Grand cherokee
      // Xterra
      // XTerra
      // Frontier
      // D21 Hardbody Pickup 4x4
      // Gladiator
      // Ranger
      // F150
      // F-250
      // Land Cruiser
      // FJ Cruiser
      // Tacoma
      // Tundra
      // Pickup
      // range rover
      // Defender
      // Sport
      // Trooper
      // XV Crosstrek
      // X90

      case null:
      default:
        return null;
    }
  },
  getOutfitLevel: level => {
    // blank or Stock
    if (!level || level === "Stock") {
      return "STOCK";
    }

    // Modified
    return "MODIFIED";
  },
  getModifications: mods => {
    const newMods =
      mods.length > 1
        ? mods
        : mods.reduce((memo, mod) => {
            if (mod === "") {
              return memo;
            }

            return [...memo, ...mod.split(",")];
          }, []);

    return newMods.reduce((memo, mod) => {
      const newMod = mod
        .replace("...", "")
        .replace("”", "in")
        .replace('\\"', "in")
        .replace("\r", ",")
        .replace("\\'", "'")
        .replace(",", "")
        .trim();

      if (
        newMod.toLowerCase() === "n/a" ||
        newMod.toLowerCase() === "none" ||
        newMod === "etc" ||
        newMod.toLowerCase() === "a lot" ||
        newMod.toLowerCase() === "more." ||
        newMod.toLowerCase() === "stock" ||
        newMod.trim() === ""
      ) {
        return memo;
      }

      return [...memo, newMod];
    }, []);
  },
  getEventTitle: title => {
    return title.replace(`\'`, `'`).replace(`\"`, `"`);
  },
  getEventCategory: category => {
    switch (category) {
      case "Pride":
      case "Social Event":
        return "SOCIAL";
      case "Clinic":
        return "CLINIC";
      case "Meeting":
        return "MEETING";
      case "Beer Bust":
        return "FUNDRAISING";
      case "Run/Camping":
        return "CAMPING";
      case "Run":
      default:
        return "RUN";
    }
  },
  getEventStatus: status => {
    switch (status) {
      case "A":
        return "Public";
      case "D":
        return "Deleted";
      case "S":
        return "Waitlist";
      case "O":
        return "Ongoing";
      case "R":
      default:
        return "Draft";
    }
  },
  getEventDesription: desc => {
    return desc.replace(`\'`, `'`).replace(`\"`, `"`);
  },
  getEventTrailDifficulty: diff => {
    const newDiff = (diff || "").trim().toLowerCase();

    if (!newDiff || newDiff === "trails picked onsite") {
      return "UNKNOWN";
    }

    switch (newDiff) {
      case "2-3":
        return "EASY";
      case "3-4":
      case "4":
      case "moderate":
      case "easy/intermediate":
        return "INTERMEDIATE";
      case "3-5":
      case "2-5":
      case "4-7":
      case "4-5":
      case "5":
      case "5-8":
      case "mg: 4, hg: 5-7":
      case "8-9":
      case "3-9":
      case "easy/intermediate or difficult":
      case "intermediate/difficult":
      case "difficult":
        return "ADVANCED";
      default:
        return newDiff.toUpperCase();
    }
  },
  getSlug: name =>
    name
      .replace(/[{(\-\&\.\\\/\')}]/g, "")
      .replace(/  /g, " ")
      .split(" ")
      .reduce((memo, word) => (word.trim() ? [...memo, word.trim()] : memo), [])
      .join("-")
      .toLowerCase(),
  // getTrailAddress: address => address.join(" ").trim(),
  getTime: (date, time) => {
    return new Date(`${date} ${time || "10:00"}`).toISOString();
  },
  mapPersonnelToUser: (users, personnel, personnelIds) => {
    if (personnelIds === null) {
      return "ckomap3wv003f13b72rg7d5ry";
    }

    const [firstName, lastName] = personnel
      .find(p => p.id === personnelIds[0])
      .name.split(" ");

    const user = users.find(user => {
      if (firstName === "Greg" && lastName === "Foskey") {
        return (
          user.first_name.includes("Gregory") &&
          user.last_name.includes(lastName)
        );
      }

      if (firstName === "Tom" && lastName === "Eskridge") {
        return (
          user.first_name.includes("Thomas") &&
          user.last_name.includes(lastName)
        );
      }

      if (firstName === "Ryan" && lastName === "McCoy") {
        return (
          user.first_name.includes(firstName) &&
          user.last_name.includes("Taylor")
        );
      }

      if (
        (firstName === "Mike" && lastName === "Rahn") ||
        (firstName === "Mike" && lastName === "Vialpando-Nunez")
      ) {
        return (
          user.first_name.includes("Michael") &&
          user.last_name.includes(lastName)
        );
      }

      return (
        user.first_name.includes(firstName) && user.last_name.includes(lastName)
      );
    });

    return user.newId;
  },
  getNewUserId: (users, id) => {
    const newId = users.find(user => user.oldId === id);
    return newId.newId;
  },
  getRsvpMember: (users, userId) => {
    const user = users.find(user => {
      if (!user || !user.ID) {
        console.log("no user iD", userId, user);
        return false;
      }

      return user.ID === userId;
    });

    if (!user) {
      console.log("this has rsvp.user_id has failed", userId);
      return null;
    }

    return user.newId;
  },
  getPersonId: pId =>
    pId === null ? pId : pId.split(",").map(p => parseInt(p, 10)),
  getRsvpStatus: status => {
    switch (status) {
      case "Completed":
        return "GOING";
      case "Pending":
      case "Incomplete":
      case "Refund":
      case "Cancelled":
      default:
        return "CANT_GO";
    }
  }
};
