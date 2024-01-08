"use strict";

function automateAPI(req, res, next) {
  const configData = g.serviceConfig.data;
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
