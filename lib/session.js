const session = require("express-session");

var FileStore = require('session-file-store')(session);
var fileStoreOptions = {};

module.exports = session({
  secret: process.env.SECRET || 'grant',
  store: new FileStore(fileStoreOptions),
  saveUninitialized: true,
  resave: false
});