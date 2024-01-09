"use strict";

let lib = {
  fs: require('fs'),
  path: require('path'),
}
const dynamicLib = endfw.dynamic.dynamicLibFor('../library');

function ingestAPI(req, res, next) {
  const configData = g.serviceConfig.data;
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.remainingPath() == '/dev/loadDynamic') {
    globalThis.loadDynamic();
    return ret.json({done:'loadDynamic done!'});
  }
  
  // custom handler to be added below this line
  // avoid adding above loadDynamic, because that can ruin the loadDynamic
  
  if (url.seg(0) != 'dev') return next();
  if (url.seg(1) == 'test') {
    ret.json({done:'/dev/test'});
  } else {return ret.jsonMsg.methodNotFound();
  }
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    ingestAPI,
    metadataAPI: dynamicLib('/metadata').metadataAPI,
    automateAPI: dynamicLib('/automate').automateAPI,
  }
}
