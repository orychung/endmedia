"use strict";

let lib = {
  fs: require('fs'),
  path: require('path'),
}

function ingestAPI(req, res, next) {
  const configData = g.serviceConfig.data;
  const ret = res.returner;
  const url = req.parsedUrl;
  
  if (url.remainingPath() == '/dev/loadDynamic') {
    globalThis.loadDynamic();
    return ret.json({done:'loadDynamic done!'});
  }
  
  if (url.seg(0) == 'mediaFile') {
    console.log(req.p);
    
    let endfw = require('endfw');
    let fSeg = new endfw.file.FileSegment({
      basePath: configData.libraryPaths[0],
    });
    let unresolvedPath = fSeg.pathExp(req)
      .replace(/[\\]/g, '/')
      .replace(/^\.([\/$])/, fSeg.basePath+'$1');
    console.log('unresolvedPath',unresolvedPath);
    let path = lib.path.resolve(unresolvedPath);
    console.log([
      fSeg.ingestRegExp,
      path,
      fSeg.ingestRegExp.test(path)
    ]);
    
    return ret.json({done:'dev print done!'});
  }
  
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
    //metadataAPI,
    //automateAPI,
  }
}
