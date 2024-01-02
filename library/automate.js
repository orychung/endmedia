"use strict";

let endfw = require('endfw');
const {g} = endfw.global;

function automateAPI(req, res, next) {
  
};

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    automateAPI: automateAPI,
  }
}
