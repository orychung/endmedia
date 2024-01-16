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

if (!g.serviceConfig) throw '[endmedia/metadata] g.serviceConfig must be created before loading endmedia';
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

async function metadataAPI(req, res, next) {
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.seg(1) == 'listLibrary') {
    ret.json(configData.libraryPaths);
  } else if (url.seg(1) == 'init') {
    /* TODO:
    - mkdir if data dir is missing
    - touch file if text file is missing
    */
    console.log({'configData.path':configData.path});
    let tryMkdir = lib.fs.promises.mkdir(configData.path);
    await Promise.allSettled([tryMkdir]);
    let filesDT = new endfw.file.DelimitedText({
      path:configData.path+'/files'
    });
    filesDT.writeArray([{a:3, b:'abc'}],['a','b']);
    g.media.files = await filesDT.readAsArray(['a','b']);
    console.error(g.media.files);
    ret.json({done:{}});
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
