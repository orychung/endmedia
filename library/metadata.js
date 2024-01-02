"use strict";

let endfw = require('endfw');
const {g} = endfw.global;

function metadataAPI(req, res, next) {
  
};

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    metadataAPI: metadataAPI,
  }
}
