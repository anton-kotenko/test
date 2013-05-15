var Fs = require('fs');
var Vow = require('vow');
var Path = require('path');
var PresService = function () {
  this._buildRoutingTable();
  this._presentaionsPromise = this._preLoadPresentations();
};
PresService.prototype = {
  ROUTING_TABLE: {
    '^/list': 'listPresentations',
  },
  PRESNTATIONS_PATH: __dirname + '/../www/images',
  STATUSES: {
    ERROR: 'error',
    SUCCESS: 'success'
  },
  /* load information about presentatons from file system
   * @private
   * @return {Object}  -- work promise
   * */
  _preLoadPresentations: function () {
    var promise = Vow.promise(),
      presentations = {},
      loadOnePresentation = function (path, callback) {
        Fs.readdir(path, function (error, files) {
          if (error) {
            return callback(error);
          }
          files.sort(function(a, b) {
            return parseInt(a) > parseInt(b);
          });
          return callback(null, files.filter(function (file) {
            return Boolean(file.match(/^.+\.((jpg)|(png))$/i));
          }));
        });
      },
      loadEveryPresentation = function (list, current) {
        if (current >= list.length) {
          return promise.fulfill(presentations);
        }
        Fs.stat(list[current], function (error, stats) {
          var presentationKey = Path.basename(list[current]);
          if (error || !stats.isDirectory()) {
            current++;
            return loadEveryPresentation(list, current);
          }
          loadOnePresentation(list[current], function (error, presInfo) {
            if (!error) {
              presentations[presentationKey] = {frames: presInfo, id: presentationKey, currentFrame: 0};
            }
            current++;
            loadEveryPresentation(list, current);
          });
        });
      };
    Fs.readdir(this.PRESNTATIONS_PATH, function (error, list) {
      if (error) {
        return promise.reject(error);
      }
      list = list.map(Path.join.bind(Path, this.PRESNTATIONS_PATH));
      loadEveryPresentation(list, 0);
    }.bind(this));
    return promise;
  },
  /* transform configuration of routes 
   * into way, convenient to search
   * @private
   * */
  _buildRoutingTable: function () {
    this._routingTable = Object.keys(this.ROUTING_TABLE).map (function (regexp) {
      return {regexp: new RegExp(regexp), action: this.ROUTING_TABLE[regexp]};
    }.bind(this));
  },
  /* find what route (and what method)
   * have to handle request
   * @private
   * */
  _matchRoute: function (requestCtx) {
    return this._routingTable.reduce(function (found, route) {
      var matches;
      if (found) {
        return found;
      }
      matches = requestCtx.url.pathname.match(route.regexp);
      if (matches) {
        return {route: route, matches: matches};
      }
      return false;
    }, false);
  },
  /* handle request;
   * @public
   * @argument {Object} requestCtx. object that represnts request
   * */
  request: function (requestCtx) {
    var route = this._matchRoute(requestCtx);
    if (!route) {
      return requestCtx.answer('404', 'Not Found');
    }
    requestCtx.matches = route.matches;
    requestCtx.route = route.route;
    if (!(this[requestCtx.route.action] instanceof Function)) {
      return requestCtx.answer('404', 'Not Found');
    }
    this[requestCtx.route.action](requestCtx);
  },
  /* /list url handler. 
   * return all information about all presentations
   * */
  listPresentations: function (requestCtx) {
    this._presentaionsPromise.then(function (presentations) {
      requestCtx.answerJSON(200, {status: this.STATUSES.SUCCESS, presentations: presentations});
    }.bind(this)).fail(function (rejectReason) {
      requestCtx.answerJSON('200', {status: this.STATUSES.ERROR});
    }.bind(this));
  }
};
module.exports = PresService;
