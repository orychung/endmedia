"use strict";
//main.js for node.js server start
const path = require('path');
const endfw = require('endfw');

const PROJECT = 'endmedia';
g.rootPath = path.resolve()+'/..';
g.serviceConfig = require(`${g.rootPath}/.local/${PROJECT}/service.json`);
g.assetConfig = require(`${g.rootPath}/nodejs/quick/assetConfig.json`);
g.assetConfig.authFree.versionPattern = new RegExp(g.assetConfig.versionPattern);

let endmedia = require('endmedia');

g.server = new endfw.server.Server({
  project: PROJECT,
  cspDirectives: g.assetConfig.cspDirectives,
  domain: g.serviceConfig.server.domain,
  port: g.serviceConfig.server.port
});
//g.server.fileInventories.default.paths = [`${g.rootPath}/nodejs/node_modules/endmedia`];
g.server.fileInventories.default.paths = [`${g.rootPath}`]; //special case working for dev or direct deployment
g.server.fileInventories.asset = { paths: ['./asset'] };
g.server.logTypes = {
  "0": {"format":"[T:h:m:s.:ms]"}, //general request
  "1": {"format":"[:Y4:M:DT:h:m:s.:ms]"}, //server changes
};
g.server.log = function(message, type=0) {
  console.log(endfw.text.now.format(this.logTypes[type].format) + message);
};

let mainRoute = new endfw.subroute();
mainRoute.use(endfw.server.basicParseRoute, 'basicParseRoute');
mainRoute.use(endfw.ingest.ingestRequest.parsedUrl_p(g.server));
mainRoute.use(endfw.ingest.logRequest.ip_method_url);
mainRoute.use(endfw.ingest.authFree.cache_path_inventory(g.assetConfig.authFree));
mainRoute.all('/automate/*', endmedia.automate.automateAPI);
mainRoute.all('/metadata/*', endmedia.metadata.metadataAPI);
mainRoute.all('/web/css/*', endfw.lessCss({
  contextPath: '/web/css',
  pathFromReq: req=>req.parsedUrl.remainingPath(),
}));
mainRoute.use((req, res, next)=>{
  if (req.method=='POST') g.server.log(JSON.stringify(req.body)); // activate this line for debug only
  
  let ret = res.returner;
  let url = req.parsedUrl;
  if (url.seg(0) == 'favicon.ico') return ret.file('/favicon.png', 'image/png');
  if (url.seg(0) != 'web') return ret.jsonMsg.methodNotFound();
  if (url.seg(1) == 'html') {
    ret.fillVariable('buildHash', 1);
    ret.setCsp();
    ret.file(url.remainingPath(), 'text/html');
  } else {
    ret.file(url.remainingPath());
  }
});

g.server.app.use(mainRoute.handler);
// middleware = function that takes 4 parameters identifies an error handler, calling next() with argument means to handle an error
g.server.app.use(function (e, req, res, next) {
  console.error(e);
  res.status(400).send('other errors');
});
g.server.startHTTPS(g.serviceConfig.https);
