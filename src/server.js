/* @fileOverview service entry point
 * Minimalistic version of web server
 * without any features, just to do the work
 * Routing requests to apropriate handlers
 * are implemented in, class, that
 * actually do the work
 * */
var Http = require('http');
var Url = require('url');
var PresService = require('./service');
var presServiceInstance = new PresService();
var server = Http.createServer(function (request, response) {
  var requestCtx =  {
    request: request,
    response: response
  };
  requestCtx.answerJSON = function (code, data) {
    if (arguments.length === 1) {
      data = code;
      code = '200';
    }
    this.response.writeHead(code, {'Content-Type': 'application/json'});
    this.response.end(JSON.stringify(data));
  }.bind(requestCtx);
  requestCtx.answer = function (code, data) {
    if (arguments.length === 1) {
      data = code;
      code = '200';
    }
    this.response.writeHead(code, {'Content-Type': 'text/plain'});
    this.response.end(data);
  }.bind(requestCtx);
  requestCtx.url = Url.parse(request.url, true);
  presServiceInstance.request(requestCtx);
});
server.listen(8080);
