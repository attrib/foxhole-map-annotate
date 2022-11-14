var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var grant = require('grant').express()
const nunjucks = require("nunjucks");

var sessionParser = require('./lib/session');
var indexRouter = require('./routes/index');
const {ACL_FULL, ACL_READ, ACL_ICONS_ONLY} = require("./lib/ACLS");
const fs = require("fs");


var app = express();

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
  const webpackHotMiddleware = require('webpack-hot-middleware')
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webPackConfig = require('./webpack.config.js');
  const compiler = webpack(webPackConfig);
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: webPackConfig.output.publicPath,
    })
  );
  app.use(webpackHotMiddleware(compiler))
}

const date = new Date()
const accessLogStream = fs.createWriteStream(path.join(__dirname, `logs/access-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.log`), { flags: 'a' })
app.use(logger('combined', {stream: accessLogStream}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionParser)
app.use(grant({
  "defaults": {
    "origin": process.env.ORIGIN,
    "transport": "session",
    "state": true
  },
  "discord": {
    "key": process.env.DISCORD_KEY,
    "secret": process.env.DISCORD_SECRET,
    "scope": ["identify", "guilds.members.read"],
    "callback": "/login",
  }
}))

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.session.user = 'develop';
    req.session.acl = ACL_FULL;
  }
  res.locals.title = 'Warden Infrastructure Map';
  res.locals.path = req.path;
  res.locals.origin = process.env.ORIGIN
  res.locals.cacheBuster = process.env.COMMIT_HASH
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
