"use strict";

let endfw = require('endfw'); //g is defined here
let mediaRoute = new endfw.subroute();
let metadata = require('./library/metadata');
let automate = require('./library/automate');

let pathHandler = {};
g.serviceConfig.data.libraryPaths.forEach(path=>{
  pathHandler[path] = 
    new endfw.file.FileSegment({basePath: path}).handler;
});
mediaRoute.all(
  '/mediaFile/*',
  (req, res, next)=>{
    handler = pathHandler[req.p.libraryPath];
    if (!handler) return endfw.file.FileSegment.errorCallback(res, undefined, 404, "libraryPath not found");
    return handler(req, res, next);
  }
);
mediaRoute.all('/automate/*', automate.automateAPI, 'automate');
mediaRoute.all('/metadata/*', metadata.metadataAPI, 'metadata');

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    mediaRoute,
    metadata,
    automate,
  }
}
