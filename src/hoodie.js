// Hoodie Core
// -------------
//
// the door to world domination (apps)
//

var hoodieAccount = require('./hoodie/account');
var hoodieAccountRemote = require('./hoodie/remote');
var hoodieConfig = require('./hoodie/config');
var hoodieConnection = require('./hoodie/connection');
var hoodieId = require('./hoodie/id');
var hoodieLocalStore = require('./hoodie/store');
var hoodieTask = require('./hoodie/task');
var hoodieOpen = require('./hoodie/open');
var hoodieRequest = require('./hoodie/request');
var hoodieEvents = require('./lib/events');

// for plugins
var lib = require('./lib');
var util = require('./utils');

// Constructor
// -------------

// When initializing a hoodie instance, an optional URL
// can be passed. That's the URL of the hoodie backend.
// If no URL passed it defaults to the current domain.
//
//     // init a new hoodie instance
//     var hoodie = new Hoodie();
//
function Hoodie (baseUrl) {
  var self = this;

  // enforce initialization with `new`
  if (!(self instanceof Hoodie)) {
    new Error('usage: new Hoodie(url);');
  }

  // remove trailing slashes
  self.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';


  // hoodie.extend
  // ---------------

  // extend hoodie instance:
  //
  //  hoodie.extend(function (hoodie) {} );
  //
  self.extend = function extend (extension) {
    extension(self);
  };


  //
  // Extending hoodie core
  //

  // * hoodie.bind
  // * hoodie.on
  // * hoodie.one
  // * hoodie.trigger
  // * hoodie.unbind
  // * hoodie.off
  self.extend(hoodieEvents);

  // * hoodie.isOnline
  // * hoodie.checkConnection
  self.extend(hoodieConnection);

  // * hoodie.open
  self.extend(hoodieOpen);

  // * hoodie.store
  self.extend(hoodieLocalStore);

  // workaround, until we ship https://github.com/hoodiehq/hoodie.js/issues/199
  self.store.patchIfNotPersistant();

  // * hoodie.task
  self.extend(hoodieTask);

  // * hoodie.config
  self.extend(hoodieConfig);

  // * hoodie.account
  self.extend(hoodieAccount);

  // * hoodie.remote
  self.extend(hoodieAccountRemote);

  // * hoodie.id
  self.extend(hoodieId);

  // * hoodie.request
  self.extend(hoodieRequest);


  //
  // Initializations
  //

  // init config
  self.config.init();

  // init hoodieId
  self.id.init();

  // set username from config (local store)
  self.account.username = self.config.get('_account.username');

  // init hoodie.remote API
  self.remote.init();

  // check for pending password reset
  self.account.checkPasswordReset();

  // hoodie.id
  self.id.subscribeToOutsideEvents();

  // hoodie.config
  self.config.subscribeToOutsideEvents();

  // hoodie.store
  self.store.subscribeToOutsideEvents();
  self.store.bootstrapDirtyObjects();

  // hoodie.remote
  self.remote.subscribeToOutsideEvents();

  // hoodie.task
  self.task.subscribeToOutsideEvents();

  // authenticate
  // we use a closure to not pass the username to connect, as it
  // would set the name of the remote store, which is not the username.
  self.account.authenticate().then(function( /* username */ ) {
    self.remote.connect();
  });

  // check connection when browser goes online / offline
  global.addEventListener('online', self.checkConnection, false);
  global.addEventListener('offline', self.checkConnection, false);

  // start checking connection
  self.checkConnection();

  //
  // loading user extensions
  //
  applyExtensions(self);
}

// Extending hoodie
// ------------------

// You can extend the Hoodie class like so:
//
// Hoodie.extend(function (hoodie) { hoodie.customMethod = function() {} });
//
var extensions = [];

Hoodie.extend = function (extension) {
  extensions.push(extension);
};

//
// detect available extensions and attach to Hoodie Object.
//
function applyExtensions (self) {
  for (var i = 0; i < extensions.length; i++) {
    extensions[i].call(self, [lib, util]);
  }
}

module.exports = Hoodie;

