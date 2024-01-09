"use strict";

let lib = {
  fs: require('fs'),
  path: require('path'),
};

class MediaLibrary {
  loaded = false;
  files = {};
  constructor(options) {
    Object.assign(this, options);
  }
}

var configData = g.serviceConfig.data;
g.media = {
  files: {},
  metadata: {},
  automations: {},
  libraries: configData.libraryPaths.mapKeyValue(
    (k,v)=>v,
    (v,k)=>new MediaLibrary({path: v}),
  ),
};

function metadataAPI(req, res, next) {
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.seg(1) == 'listLibrary') {
    ret.json(configData.libraryPaths);
  } else if (url.seg(1) == 'init') {
    /* TODO:
    - mkdir if data dir is missing
    - touch file if text file is missing
    */
    g.media.files = endfw.fileUtil.DelimitedText;
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
