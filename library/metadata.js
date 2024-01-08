"use strict";

function metadataAPI(req, res, next) {
  const configData = g.serviceConfig.data;
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.seg(1) == 'listLibrary') {
    ret.json(configData.libraryPaths);
  } else {return ret.jsonMsg.methodNotFound();
  }
};

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    metadataAPI: metadataAPI,
  }
}
