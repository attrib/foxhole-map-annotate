import session from "express-session";
import fileStore from "session-file-store";

import config from "./config.js";

const FileStore = fileStore(session);
const fileStoreOptions = {};

export default session({
  secret: process.env.SECRET || 'grant',
  store: new FileStore(fileStoreOptions),
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: 86400000 * 7,
    secure: config.config.basic.url.startsWith('https://'),
  }
});