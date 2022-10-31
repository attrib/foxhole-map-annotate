var express = require('express');
var router = express.Router();
var uuid = require('uuid');
var Discord = require('../lib/discord')

/* GET home page. */
router.get('/', function(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    req.session.user = 'develop';
  }
  if (!req.session || !req.session.user) {
    res.render('login', {title: 'Warden Rail Network'});
    return;
  }
  res.render('index', {title: 'Warden Rail Network'});
});

router.get('/login', async function(req, res, next) {
  let discord = new Discord(req.session.grant.response.access_token);
  discord.checkAllowedUser((data, userId, guilds) => {
    if (data !== false) {
      req.session.user = data.user;
      req.session.id = uuid.v4();
      req.session.save(() => {
        res.redirect('/');
      })
    }
    else {
      req.session.destroy(() => {
        res.render('access', {title: 'Warden Rail Network', userId, guilds});
      });
    }
  })
});

router.get('/logout', function(req, res, next) {
  req.session.destroy()
  res.redirect('/');
});

module.exports = router;