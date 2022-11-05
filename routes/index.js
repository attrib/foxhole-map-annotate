var express = require('express');
var router = express.Router();
var uuid = require('uuid');
var Discord = require('../lib/discord')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/login', async function(req, res, next) {
  if (req.session.grant === undefined) {
    return res.redirect('/');
  }
  let discord = new Discord(req.session.grant.response.access_token);
  discord.checkAllowedUser().then((data) => {
    if (data.access === true) {
      req.session.user = data.user;
      req.session.acl = data.acl;
      req.session.id = uuid.v4();
      req.session.save(() => {
        res.redirect('/');
      })
    }
    else {
      req.session.destroy(() => {
        res.render('access', data);
      });
    }
  })
});

router.get('/logout', function(req, res, next) {
  req.session.destroy()
  res.redirect('/');
});

module.exports = router;