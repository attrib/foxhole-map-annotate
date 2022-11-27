const express = require('express');
const router = express.Router();
const Discord = require('../lib/discord')
const eventLog = require('../lib/eventLog')
const {ACL_ADMIN, ACL_MOD} = require("../lib/ACLS");
const config = require('../lib/config')
const sanitizeHtml = require('sanitize-html')
const eventlog = require('../lib/eventLog');

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
  return res.redirect('/admin/eventlog');
})

router.get('/admin/eventlog', async function (req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN && req.session.acl !== ACL_MOD)) {
    return res.redirect('/');
  }
  res.locals.events = await eventLog.getLastLines()
  res.render('admin.eventlog.html');
})

router.get('/admin/config', async function (req, res, next) {
  if (!req.session || req.session.acl !== ACL_ADMIN) {
    return res.redirect('/');
  }
  res.render('admin.config.html');
})

router.post('/admin/config', function(req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN)) {
    return res.redirect('/');
  }
  eventlog.logEvent({type: 'configChange', user: req.session.user, userId: req.session.userId, data: config.config})
  if (req.body.title.match(/^[\w ]+$/)) {
    config.config.basic.title = req.body.title
  }
  if (req.body.color.match(/^#\w{3,6}$/)) {
    config.config.basic.color = req.body.color
  }
  config.config.basic.links = []
  if (!Array.isArray(req.body.linkTitle)) {
    req.body.linkTitle = [req.body.linkTitle]
  }
  if (!Array.isArray(req.body.linkHref)) {
    req.body.linkHref = [req.body.linkHref]
  }
  for (const i in req.body.linkHref) {
    const linkHref = req.body.linkHref[i]
    if (linkHref.length === 0) {
      continue
    }
    if (!linkHref.match(/^https?:\/\/[\w.:\/\-_?&#]+$/)) {
      continue
    }
    const linkText = (req.body.linkTitle[i] && req.body.linkTitle[i].length > 0) ? req.body.linkTitle[i] : 'Link'
    if (!linkText.match(/^[\w ]+$/)) {
      continue
    }
    config.config.basic.links.push({
      href: linkHref,
      title: linkText
    })
  }
  const sanitizeOptions = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p' ],
    allowedAttributes: {
      'a': [ 'href' ]
    },
  };
  config.config.text.login = sanitizeHtml(req.body.textLogin, sanitizeOptions)
  config.config.text.accessDenied = sanitizeHtml(req.body.textAccessDenied, sanitizeOptions)
  config.config.text.feedback = sanitizeHtml(req.body.textFeedback, sanitizeOptions)
  config.config.text.contributors = sanitizeHtml(req.body.textContributors, sanitizeOptions)

  config.config.access = {users: {}, roles: {}}
  config.config.accessComments = {users:{}, roles: {}}

  for (const i in req.body.accessUser) {
    const userId = req.body.accessUser[i]
    if (userId.length === 0 || !userId.match(/^\d+$/)) {
      continue
    }
    config.config.access.users[userId] =  req.body.accessUserRole[i]
    config.config.accessComments.users[userId] =  req.body.accessUserComment[i]
  }
  if (!Array.isArray(req.body.accessDiscord)) {
    req.body.accessDiscord = [req.body.accessDiscord]
  }
  for (const i in req.body.accessDiscord) {
    const discordId = req.body.accessDiscord[i]
    if (discordId.length === 0 || !discordId.match(/^\d+$/)) {
      continue
    }
    config.config.access.roles[discordId] = {}
    config.config.accessComments.roles[discordId] = {name: req.body.accessDiscordComment[i]}
    if (req.body['accessDiscordRole[' + discordId + ']']) {
      if (!Array.isArray(req.body['accessDiscordRole[' + discordId + ']'])) {
        req.body['accessDiscordRole[' + discordId + ']'] = [req.body['accessDiscordRole[' + discordId + ']']]
      }
      for (const i in req.body['accessDiscordRole[' + discordId + ']']) {
        const role = req.body['accessDiscordRole[' + discordId + ']'][i]
        if (role.length === 0 || !role.match(/^\d+$/)) {
          continue
        }
        config.config.access.roles[discordId][role] = req.body['accessDiscordRoleAssigment[' + discordId + ']'][i]
        config.config.accessComments.roles[discordId][role] = req.body['accessDiscordRoleComment[' + discordId + ']'][i]
      }
    }
  }
  config.save()
  return res.redirect('/admin/config');
})

router.get('/login', async function(req, res, next) {
  if (req.session.grant === undefined) {
    return res.redirect('/');
  }
  if (req.session.grant.error) {
    throw new Error(req.session.grant.error)
  }
  let discord = new Discord(req.session.grant.response.access_token);
  if (req.session.grant.dynamic && req.session.grant.dynamic.discordServerId) {
    discord.preferredDiscordServer = req.session.grant.dynamic.discordServerId
  }
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
      res.render('access', data);
    }
  })
});

router.get('/logout', function(req, res, next) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid')
    res.redirect('/');
  })
});

module.exports = router;