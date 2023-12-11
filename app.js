import path from "node:path";

import cookieParser from "cookie-parser";
import express from "express";
import grant from "grant";
import createError from "http-errors";
import nunjucks from "nunjucks";

import { ACL_ADMIN, ACL_BLOCKED, ACL_FULL, ACL_ICONS_ONLY, ACL_MOD, ACL_READ } from "./lib/ACLS.js";
import config from "./lib/config.js";
import sessionParser from "./lib/session.js";
import warapi from "./lib/warapi.js";
import indexRouter from "./routes/index.js";

const app = express();

nunjucks.configure('views', {
  autoescape: true,
  express: app,
  noCache: app.get('env') !== 'production',
});
app.set('view engine', 'html');
if (app.get('env') === 'production') {
  app.set('trust proxy', 2) // trust first two proxys (nginx, cloudflare)
}
else {
  const webpack = await import('webpack').then((module) => module.default);
  const webpackDevMiddleware = await import('webpack-dev-middleware').then((module) => module.default);
  const webPackConfig = await import('./webpack.dev.js').then((module) => module.default);
  const compiler = webpack(webPackConfig);
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: webPackConfig.output.publicPath,
    })
  );
}

app.use(express.static(path.resolve('public'), {maxAge: 7200000}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionParser)

app.use(grant.express({
  "defaults": {
    "origin": config.config.basic.url,
    "transport": "session",
    "state": true
  },
  "discord": {
    "key": config.config.discord.key,
    "secret": config.config.discord.secret,
    "scope": ["identify", "guilds.members.read"],
    "callback": "/login",
    "dynamic": [],
  }
}))

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    if (req.query.dev === 'admin') {
      req.session.user = 'admin';
      req.session.userId = '285113857326710784';
      req.session.discordId = '987654321098765410';
      req.session.acl = ACL_ADMIN;
    }
    else if (req.query.dev === 'mod') {
      req.session.user = 'mod';
      req.session.userId = '101716812827217920';
      req.session.discordId = '987654321098765410';
      req.session.acl = ACL_MOD;
    }
    else if (req.query.dev === 'full') {
      req.session.user = 'full';
      req.session.userId = '123456789012345610';
      req.session.discordId = '987654321098765410';
      req.session.acl = ACL_FULL;
    }
    else if (req.query.dev === 'full2') {
      req.session.user = 'full2';
      req.session.userId = '123456789012345620';
      req.session.discordId = '987654321098765420';
      req.session.acl = ACL_FULL;
    }
    else if (req.query.dev === 'full3') {
      req.session.user = 'full3';
      req.session.userId = '123456789012345630';
      req.session.discordId = '987654321098765430';
      req.session.acl = ACL_FULL;
    }
    else if (req.query.dev === 'icons') {
      req.session.user = 'icons';
      req.session.userId = '123456789012345640';
      req.session.discordId = '987654321098765410';
      req.session.acl = ACL_ICONS_ONLY;
    }
    else if (req.query.dev === 'read') {
      req.session.user = 'read';
      req.session.userId = '123456789012345650';
      req.session.discordId = '987654321098765410';
      req.session.acl = ACL_READ;
    }
  }
  res.locals.config = config.config
  res.locals.title = config.config.basic.title;
  res.locals.path = req.path;
  res.locals.cacheBuster = process.env.COMMIT_HASH
  res.locals.shard = warapi.warData.shard
  res.locals.war = warapi.warData.warNumber
  res.locals.warStatus = warapi.warData.status
  res.locals.warWinner = warapi.getTeam(warapi.warData.winner)
  res.locals.warConquestEndTime = warapi.warData.conquestEndTime || ''

  // old routes redirects
  if (req.query.cx && req.query.cy && req.query.r && req.path === '/') {
    return res.redirect(301, `/map?cx=${req.query.cx}&cy=${req.query.cy}&r=${req.query.r}`)
  }

  if (req.session && (req.session.user || req.path === '/login')) {
    res.locals.user = req.session.user
    res.locals.userId = req.session.userId
    res.locals.acl = req.session.acl

    // quick check if somebody is blocked
    if (req.session.userId in config.config.access.users && config.config.access.users[req.session.userId] === ACL_BLOCKED) {
      req.session.destroy(() => {
        res.clearCookie('connect.sid')
        res.redirect('/');
      })
    }
    else {
      next();
    }
  }
  else {
    // old routes redirects
    if (req.query.hiddenCode && req.path === '/') {
     return res.redirect(301, '/map?hiddenCode=' + req.query.hiddenCode)
    }

    if (req.path === '/' || req.path === '/help') {
      next();
      return;
    }
    res.locals.hiddenCode = req.query.hiddenCode || false
    res.locals.user = false
    res.status(403);
    res.render('login');
  }
})
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
