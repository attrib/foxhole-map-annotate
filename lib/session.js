const session = require("express-session");
const config = require('./config')

var FileStore = require('session-file-store')(session);
var fileStoreOptions = {};

module.exports = session({
  secret: process.env.SECRET || 'grant',
  store: new FileStore(fileStoreOptions),
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: 86400000,
    secure: config.config.basic.url.startsWith('https://'),
  }
});