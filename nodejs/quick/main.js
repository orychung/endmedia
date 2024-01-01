"use strict";
//main.js for node.js server start
const path = require('path');

const PROJECT = 'endmedia';
const rootPath = path.resolve()+'/..';

globalThis.endfw = require('endfw');
globalThis.endmedia = require('endmedia');

const {g} = endfw.global;
const {Server, basicParseRoute} = endfw.server;
const Subroute = endfw.subroute;
g.tokens = require(`${rootPath}/.local/tokens.json`);
g.serviceConfig = require(`${rootPath}/.local/${PROJECT}/service.json`);
g.assetConfig = require(`${rootPath}/nodejs/proj/quick/assetConfig.json`);
g.assetConfig.authFree.versionPattern = new RegExp(g.assetConfig.versionPattern);

Server.defaultCspDirectives = g.assetConfig.defaultCspDirectives;
g.server = new Server({
  project: PROJECT,
  domain: g.serviceConfig.server.domain,
  port: g.serviceConfig.server.port
});
g.server.fileInventories.default.paths = ['./web'];
g.server.fileInventories.asset = { paths: ['./asset'] };
g.server.logTypes = {
  "0": {"format":"[T:h:m:s.:ms]"}, //general request
  "1": {"format":"[:Y4:M:DT:h:m:s.:ms]"}, //server changes
};
g.server.log = function(message, type=0) {
  console.log(endfw.text.now.format(this.logTypes[type].format) + message);
};

let mainRoute = new Subroute();
mainRoute.use(basicParseRoute, 'basicParseRoute');
mainRoute.use(endfw.ingest.ingestRequest.parsedUrl_p(g.server));
mainRoute.use(endfw.ingest.logRequest.ip_method_url);
mainRoute.all('/web/css/*', endfw.lessCss(g.server, req=>req.parsedUrl.remainingPath()));
mainRoute.all('/file/*', new endfw.file.FileSegment({
  basePath: 'C:',
  token: g.tokens.fileAPI,
  tokenExp: (req=>req.headers['file-api-token']),
  regExp:　'.*',
}).handler);
mainRoute.use(endfw.ingest.authFree.cache_path_inventory(g.assetConfig.authFree));
mainRoute.use((req, res, next)=>{
  if (req.method=='POST') g.server.log(JSON.stringify(req.body)); // activate this line for debug only
  
  let ret = res.returner;
  let url = req.parsedUrl;
  
         if (url.seg(0) == 'favicon.ico') {ret.file('/img/a_1.png', 'image/png');
  } else if (url.seg(0) == 'dl'         ) {ret.download(url.pathname);
  } else if (url.seg(0) == 'demo'       ) {ret.file(url.pathname, undefined, req.p.standalone);
  } else if (url.seg(0) == 'html'       ) {
      ret.fillVariable('buildHash', 1);
      ret.setCsp();
      ret.file(url.pathname, 'text/html', req.p.standalone);
  } else if (url.seg(0) == 'room'       ) {roomAPI(req, ret, url);
  } else if (url.seg(0) == 'system'     ) {systemAPI(req, ret, url);
  } else if (url.seg(0) == 'user'       ) {userAPI(req, ret, url);
  } else if (url.seg(0) == 'proxy'      ) {proxyAPI(req, ret, url);
  } else if (url.seg(0) == 'debug'      ) {debugAPI(req, ret, url);
  } else {ret.jsonMsg.methodNotFound();
  }
}, 'routeRequest');
g.server.mainRoute = mainRoute;

g.server.app.use(mainRoute.handler);
// middleware = function that takes 4 parameters identifies an error handler, calling next() with argument means to handle an error
g.server.app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send('other errors');
});
g.server.startHTTPS(g.serviceConfig.https);
