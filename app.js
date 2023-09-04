const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const grant = require('grant').express()
const nunjucks = require("nunjucks");

const sessionParser = require('./lib/session');
const indexRouter = require('./routes/index');
const {ACL_FULL, ACL_READ, ACL_ICONS_ONLY, ACL_MOD, ACL_ADMIN, ACL_BLOCKED} = require("./lib/ACLS");
const config = require('./lib/config')

const warapi = require('./lib/warapi')

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
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webPackConfig = require('./webpack.dev.js');
  const compiler = webpack(webPackConfig);
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: webPackConfig.output.publicPath,
    })
  );
}

app.use(express.static(path.join(__dirname, 'public'), {maxAge: 7200000}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionParser)
app.use((req, res, next) => {
  // Bad hacks for cn.warden.express
  if (req.get('host') === 'cn.warden.express') {
    res.locals.grant = {dynamic: {redirect_uri: 'https://cn.warden.express/connect/discord/callback'}}
  }
  next()
})
app.use(grant({
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
    res.locals.hiddenCode = req.query.hiddenCode || false
    res.locals.user = false
    res.status(req.path === '/' ? 200 : 403);
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

module.exports = app;
