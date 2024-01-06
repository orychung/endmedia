"use strict";

let endfw = require('endfw'); //g is defined here

let dataPath = g.serviceConfig.data.path;
let libraryPaths = g.serviceConfig.data.libraryPaths;
function automateAPI(req, res, next) {
  const ret = res.returner;
  const url = req.parsedUrl;
  
};

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    automateAPI: automateAPI,
  }
}
