const express = require('express');
const router = express.Router();
const Discord = require('../lib/discord')
const eventLog = require('../lib/eventLog')
const {ACL_ADMIN, ACL_MOD} = require("../lib/ACLS");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/help', function(req, res, next) {
  res.render('help');
});

router.get('/admin', async function (req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN && req.session.acl !== ACL_MOD)) {
    return res.redirect('/');
  }
  res.locals.events = await eventLog.getLastLines()
  res.render('admin');
})

router.get('/login', async function(req, res, next) {
  if (req.session.grant === undefined) {
    return res.redirect('/');
  }
  let discord = new Discord(req.session.grant.response.access_token);
  discord.checkAllowedUser().then((data) => {
    if (data.access === true) {
      req.session.user = data.user;
      req.session.userId = data.userId;
      req.session.acl = data.acl;
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