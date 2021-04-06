require("dotenv").config({ path: "variables.env" });

const nightly = require("./nightly");
const annuallyJanuary1 = require("./annually-1.1.js");
const annuallyApril1 = require("./annually-4.1.js");

// nightly()
//   // .then(annuallyJanuary1)
//   // .then(annuallyApril1)
//   .catch(console.error);
