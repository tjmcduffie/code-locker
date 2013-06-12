/**
 * @fileOverview Bootstrap for a barebones MVC Node app.
 * @author <a href="mailto:timothy.mcduffie@gmail.com">Tim McDuffie</a>
 * @version 1.0
 */


var config = require(process.cwd() + '/config');
var utils = require(process.cwd() + '/server/lib/utils');
var fs = require('fs');
var nodeUtil = require('util');



/**
 * Bootstrap the application by loading the controllers and extracting the
 * routes.
 */
var Bootstrap = function(server, callback) {
  if (!server) {
    throw new BootstrapError('The server is required to bootstrap the app');
  }
  console.log('bootstrapping');

  this.server = server;

  this.isProcessing = 0;

  this.bootstrapComplete_ = callback || function() {};

  // set the env variable in the config
  config.env = server.settings.env;

  this.registerRoutes();
};

Bootstrap.jsFileNameRegEx = /(\w)*\.js/;

Bootstrap.prototype.registerRoutes = function() {
  var controllersPath = config.routeLocations.controllers;
  var controllersCallack = utils.bind(this.processControllers_, this);
  var widgetsPath = config.routeLocations.services;
  var widgetsCallack = utils.bind(this.locateServices_, this);

  this.processDirContents_(widgetsPath, widgetsCallack, false);
  this.processDirContents_(controllersPath, controllersCallack, true);
};

Bootstrap.prototype.completeBootstrap = function() {
  if (!this.isProcessing) {
    console.log('>>>> Bootstrap complete');
    this.bootstrapComplete_();
  }
};

Bootstrap.prototype.retrieveRoutesFromController_ = function(controllerUri) {
  var routerCallback = utils.bind(this.registerRoute_, this);
  var Controller = require(process.cwd() + controllerUri);
  var controllerInstance = new Controller();
  controllerInstance.getRoutes().forEach(routerCallback);

  this.isProcessing -= 1;
  this.completeBootstrap();
};

Bootstrap.prototype.registerRoute_ = function(route) {
  // throw an error if the method doesn't exist
  if (!this.server[route.method]) {
    console.error('Error thrown from ', route);
    throw new Error(route.method + ' method does not exist in the server');
  }
  console.log('registering [' + route.method + ', ' + route.path + ']');
  // Method exists, register the route
  this.server[route.method](route.path, route.responder);
};

Bootstrap.prototype.processDirContents_ = function(dirPath, callback, register) {
  var dirReadCallback = utils.bind(function(err, paths) {
    if (!err && nodeUtil.isArray(paths)) {
      this.isProcessing += paths.length - (register ? 1 : 0);
      callback(paths, dirPath);
    }
  }, this);
  fs.readdir(process.cwd() + dirPath, dirReadCallback);
};

Bootstrap.prototype.processControllers_ = function(controllers, path) {
  var controllerCallback = utils.bind(function(controller) {
    if (Bootstrap.jsFileNameRegEx.test(controller)) {
      this.retrieveRoutesFromController_(path + '/' + controller);
    }
    this.isProcessing -= 1;
  }, this);
  controllers.forEach(controllerCallback);
};

Bootstrap.prototype.locateServices_ = function(services, path) {
  var serviceLocationCallback = utils.bind(this.processDirContents_, this);
  var serviceProcessCallabck = utils.bind(this.processControllers_, this);
  services.forEach(function(service) {
    var servicePath = path + '/' + service + '/services';
    serviceLocationCallback(servicePath, serviceProcessCallabck, true);
  });
};



/**
 * Bootstrap error object. Inherits from Error.
 * @extends {Error}
 * @param {string} message Message to display in the error console.
 * @param {number=} opt_linenumber Line number where the error occurred.
 */
var BootstrapError = function(message, opt_linenumber) {
  utils.base(this, message, __filename, opt_linenumber);

  this.name = 'BootstrapError';
  this.message = message;
};
utils.inherits(BootstrapError, Error);



/**
 * Module exports.
 */
module.exports = function(server, cb) {
  return new Bootstrap(server, cb);
};