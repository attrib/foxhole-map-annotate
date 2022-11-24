const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const grant = require('grant').express()
const nunjucks = require("nunjucks");

const sessionParser = require('./lib/session');
const indexRouter = require('./routes/index');
const {ACL_FULL, ACL_READ, ACL_ICONS_ONLY} = require("./lib/ACLS");
const fs = require("fs");
const config = require('./lib/config')

const warapi = require('./lib/warapi')

const app = express();

// bad hack to copy a region.json from data to public
if (fs.existsSync('./data/regions.json')) {
  fs.copyFileSync('./data/regions.json', './public/regions.json')
}

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

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionParser)
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
  }
}))

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.session.user = 'develop';
    req.session.acl = ACL_FULL;
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
    res.locals.acl = req.session.acl
    next();
  }
  else {
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
