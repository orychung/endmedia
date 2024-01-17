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
  async init() {
    
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
g.mediaFiles = {
  files: new endfw.file.DelimitedText({
    path: configData.path+'/files',
    keys: ['path','title','artist'],
    indexedKey: 'path',
  }),
  metadata: new endfw.file.DelimitedText({
    path: configData.path+'/metadata',
    keys: ['path','field','value'],
    indexedKey: 'path',
  }),
  automations: new endfw.file.DelimitedText({
    path: configData.path+'/automations',
    keys: ['path','type','config'],
    indexedKey: 'path',
  }),
};

async function metadataAPI(req, res, next) {
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.seg(1) == 'listLibrary') {
    ret.json(configData.libraryPaths);
  } else if (url.seg(1) == 'init') {
    console.log({'configData.path':configData.path});
    let tryMkdir = lib.fs.promises.mkdir(configData.path);
    await Promise.allSettled([tryMkdir]);
    await Promise.allSettled(g.mediaFiles.mapArray(async (file, key)=>{
      g.media[key] = (await file.readAsArray()).lookupOf(file.indexedKey);
    }));
    await Promise.allSettled(g.media.libraries.mapArray(lib=>lib.init());
    console.error(g.media);
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
