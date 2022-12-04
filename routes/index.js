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
  if (req.body.link) {
    for (const i in req.body.link.href) {
      const linkHref = req.body.link.href[i]
      if (linkHref.length === 0) {
        continue
      }
      if (!linkHref.match(/^https?:\/\/[\w.:\/\-_?&#]+$/)) {
        continue
      }
      const linkText = (req.body.link.title[i] && req.body.link.title[i].length > 0) ? req.body.link.title[i] : 'Link'
      if (!linkText.match(/^[\w ]+$/)) {
        continue
      }
      config.config.basic.links.push({
        href: linkHref,
        title: linkText
      })
    }
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

  config.config.access = {users: {}, discords: {}}

  if (req.body.access) {
    if (req.body.access.users) {
      for (const i in req.body.access.users.id) {
        const userId = req.body.access.users.id[i]
        if (userId.length === 0 || !userId.match(/^\d+$/)) {
          continue
        }
        config.config.access.users[userId] = {
          name: req.body.access.users.name[i],
          acl: req.body.access.users.acl[i],
        }
      }
    }

    if (req.body.access.discords) {
      for (const i in req.body.access.discords.id) {
        const discordId = req.body.access.discords.id[i]
        if (discordId.length === 0 || !discordId.match(/^\d+$/)) {
          continue
        }
        config.config.access.discords[discordId] = {
          name: req.body.access.discords.name[i],
          hiddenCode: req.body.access.discords.hidden[i],
          roles: {}
        }
        if (req.body.access.discords[discordId]) {
          for (const i in req.body.access.discords[discordId].roles.id) {
            const roleId = req.body.access.discords[discordId].roles.id[i]
            if (roleId.length === 0 || !roleId.match(/^\d+$/)) {
              continue
            }
            config.config.access.discords[discordId].roles[roleId] = {
              name: req.body.access.discords[discordId].roles.name[i],
              acl: req.body.access.discords[discordId].roles.acl[i],
            }
          }
        }
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
      req.session.discordId = data.discordId;
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