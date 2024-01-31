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
    this.loaded = false;
    this.files = {};
    let extList = g.media.settings.extList.value.split(',');
    let fileEntries =
      (await lib.fs.promises.readdir(this.path,{recursive: true}))
      .filter(x=>!x.startsWith('['))
      .filter(x=>extList.includes(x.toLowerCase().split('.').at(-1)));
    for (const fileEntry of fileEntries) {
      this.files[fileEntry] = {
        path: fileEntry,
        stat: await lib.fs.promises.stat(this.path+'/'+fileEntry),
      };
    }
    this.loaded = true;
  }
}

if (!g.serviceConfig) throw '[endmedia/metadata] g.serviceConfig must be created before loading endmedia';
var configData = g.serviceConfig.data;
g.media = {
  settings: {},
  files: {},
  metadata: {},
  automations: {},
  libraries: configData.libraryPaths.mapKeyValue(
    (k,v)=>v,
    (v,k)=>new MediaLibrary({path: v}),
  ),
};
g.mediaFiles = {
  // TODO: support file partition
  settings: new endfw.file.DelimitedText({
    path: configData.path+'/settings',
    keys: ['setting','value'],
    indexedKey: 'setting',
  }),
  files: new endfw.file.DelimitedText({
    path: configData.path+'/files',
    keys: ['path','title','artist'],
    indexedKey: 'path',
  }),
  metadata: new endfw.file.DelimitedText({
    path: configData.path+'/metadata',
    keys: ['path','metadata'],
    indexedKey: 'path',
  }),
  automations: new endfw.file.DelimitedText({
    path: configData.path+'/automations',
    keys: ['target','type','config'],
    indexedKey: 'target',
  }),
};

async function initAll() {
  console.log({'configData.path':configData.path});
  let tryMkdir = lib.fs.promises.mkdir(configData.path);
  await Promise.allSettled([tryMkdir]);
  await Promise.allSettled(g.mediaFiles.mapArray(async (file, key)=>{
    g.media[key] = (await file.readAsArray()).lookupOf(file.indexedKey);
  }));
  g.media.settings.touch('extList', {
    setting:'extList',
    value:'mp3,flac',
  });
  await Promise.allSettled(g.media.libraries.mapArray(lib=>lib.init()));
  console.error(g.media);
}
initAll();

async function metadataAPI(req, res, next) {
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.seg(1) == 'listLibrary') {
    ret.json(configData.libraryPaths);
  } else if (['settings','files','metadata'].includes(url.seg(1))) {
    ret.json(g.media[url.seg(1)]);
  } else if (url.seg(1) == 'listFiles') {
    if (!(req.p.library in g.media.libraries)) return ret.jsonError(404, 'library not found');
    ret.json(g.media.libraries[req.p.library].files);
  } else if (url.seg(1) == 'init') {
    await initAll();
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
