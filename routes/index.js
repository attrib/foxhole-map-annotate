var express = require('express');
var router = express.Router();
var getMostRecentFile = require('../lib/mostRecentFile');
var uuid = require('uuid');
var multer = require("multer")
var path = require('path');
var Discord = require('../lib/discord')

/* GET home page. */
router.get('/', function(req, res, next) {
  if (!req.session || !req.session.user) {
    res.render('login', {title: 'BigOof RailMap'});
    return;
  }
  const image = getMostRecentFile(__dirname + '/../uploads/');
  res.render('index', {title: 'BigOof RailMap', image: '/uploads/' + image.file, websocketUrl: process.env.ORIGIN.replace('http', 'ws')});
});

router.get('/login', async function(req, res, next) {
  let discord = new Discord(req.session.grant.response.access_token);
  discord.getVStatus((data) => {
    if ((data.nick || data.user.username) && data.roles && data.roles.includes('1003485459676139551')) {
      req.session.user = data.nick ? data.nick : data.user.username;
      req.session.id = uuid.v4();
      req.session.save(() => {
        res.redirect('/');
      })
    }
    else {
      req.session.destroy(() => {
        res.render('error', {title: 'BigOof RailMap', error: {status: 'access denied', stack: JSON.stringify(data)}});
      });
    }
  })
});

router.get('/logout', function(req, res, next) {
  req.session.destroy()
  res.redirect('/');
});

router.get('/upload', function(req, res, next) {
  if (!req.session || !req.session.user) {
    res.render('login', {title: 'BigOof RailMap'});
    return;
  }
  res.render('upload', {title: 'BigOof RailMap Upload'});
});

router.post('/upload', function(req, res, next) {
  if (!req.session || !req.session.user) {
    res.render('login', {title: 'BigOof RailMap'});
    return;
  }
  // Error MiddleWare for multer file upload, so if any
  // error occurs, the image would not be uploaded!
  upload.single("image")(req, res, function(err) {
    console.log(err);
    if (err) {
      res.render('upload', {title: 'BigOof RailMap Upload', error: err});
    }
    else {
      // SUCCESS, image successfully uploaded
      res.redirect('/');
    }
  })
});

module.exports = router;

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Uploads is the Upload_folder_name
    cb(null, __dirname + "/../uploads")
  },
  filename: function (req, file, cb) {
    var extname = path.extname(file.originalname).toLowerCase()
    cb(null, file.originalname + "-" + Date.now() + "." + extname)
  }
})

var upload = multer({
  storage: storage,
  limits: {fileSize: 16 * 1000 * 1000},
  fileFilter: function (req, file, cb) {
    // Set the filetypes, it is optional
    var filetypes = /jpeg|jpg|png/;
    var mimetype = filetypes.test(file.mimetype);

    var extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb("Error: File upload only supports the "
      + "following filetypes - " + filetypes);
  }
});