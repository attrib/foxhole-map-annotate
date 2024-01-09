import session from "express-session";
import fileStore from "session-file-store";

import config from "./config.js";

const FileStore = fileStore(session);
/** @type {fileStore.Options} */
const fileStoreOptions = {};

/**
 * Express Session using session-file-store as a backend
 */
export const sessionParser = session({
  secret: process.env.SECRET ?? "grant",
  store: new FileStore(fileStoreOptions),
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: 86400000 * 2, // 2 day
    secure: config.config.basic.url.startsWith("https://"),
  },
});
