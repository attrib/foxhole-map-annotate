var express = require('express');
var router = express.Router();
var uuid = require('uuid');
var Discord = require('../lib/discord')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
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
        res.render('access', {userId, guilds});
      });
    }
  })
});

router.get('/logout', function(req, res, next) {
  req.session.destroy()
  res.redirect('/');
});

module.exports = router;