var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var grant = require('grant').express()
const nunjucks = require("nunjucks");

var sessionParser = require('./lib/session');
var indexRouter = require('./routes/index');


var app = express();

nunjucks.configure('views', {
  autoescape: true,
  express: app,
  noCache: app.get('env') !== 'production',
});
app.set('view engine', 'html');
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionParser)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', function(req,res,next){
  if (req.session && req.session.user) {
    return express.static(path.join(__dirname, 'uploads'))(req,res,next);
  } else {
    res.render('login', {title: 'Warden Rail Network'});
  }
});

app.use('/', indexRouter);

app.use(grant({
  "defaults": {
    "origin": process.env.ORIGIN,
    "transport": "session",
    "state": true
  },
  "discord": {
    "key": process.env.DISCORD_KEY,
    "secret": process.env.DISCORD_SECRET,
    "scope": ["identify", "guilds", "guilds.members.read"],
    "callback": "/login",
  }
}))

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
