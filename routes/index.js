var express = require('express');
var router = express.Router();
var uuid = require('uuid');
var Discord = require('../lib/discord')

/* GET home page. */
router.get('/', function(req, res, next) {
  if (!req.session || !req.session.user) {
    res.render('login', {title: 'BigOof RailMap'});
    return;
  }
  res.render('index', {title: 'BigOof RailMap'});
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

module.exports = router;