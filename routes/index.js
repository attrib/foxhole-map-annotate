import express from "express";
import sanitizeHtml from "sanitize-html";

import { ACL_ADMIN, ACL_MOD } from "../lib/ACLS.js";
import config from "../lib/config.js";
import { clearRegionsCache } from "../lib/conquerUpdater.js";
import Discord from "../lib/discord.js";
import draftStatus from "../lib/draftStatus.js";
import eventLog from "../lib/eventLog.js";

const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('stats');
});

router.get('/help', function(req, res, next) {
  throw new Error(req.session.grant)
  res.render('help');
});

router.get('/cmap', function(req, res, next) {
  res.render('index');
});

router.get('/admin', function (req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN && req.session.acl !== ACL_MOD)) {
    return res.redirect('/');
  }
  return res.redirect('/admin/eventlog');
})

router.get('/admin/eventlog', function (req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN && req.session.acl !== ACL_MOD)) {
    return res.redirect('/');
  }
  res.locals.events = eventLog.lastLogs
  res.render('admin.eventlog.html');
})

router.get('/admin/config', function (req, res, next) {
  if (!req.session || req.session.acl !== ACL_ADMIN) {
    return res.redirect('/');
  }
  res.locals.draftStatus = draftStatus;
  if (draftStatus.activeDraft) {
    res.locals.draftStatusSelected = draftStatus.draftOrder.at(draftStatus.activeDraft)?.discordId ?? "";
  } else {
    res.locals.draftStatusSelected = "";
  }
  res.render('admin.config.html');
})

router.post('/admin/reload', function (req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN) || (req.session.user === undefined || req.session.userId === undefined)) {
    return res.redirect('/');
  }
  eventLog.logEvent({type: 'forcedMapReload', user: req.session.user, userId: req.session.userId, data: config.config})
  clearRegionsCache()
  return res.redirect('/admin/config');
})

router.post('/admin/config', function(req, res, next) {
  if (!req.session || (req.session.acl !== ACL_ADMIN) || req.session.user === undefined || req.session.userId === undefined) {
    return res.redirect('/');
  }
  eventLog.logEvent({type: 'configChange', user: req.session.user, userId: req.session.userId, data: config.config})
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
    const discordIdPattern = /^(\d+)\s*$/;
    if (req.body.access.users) {
      for (const i in req.body.access.users.id) {
        const userId = discordIdPattern.exec(req.body.access.users.id[i])?.[1];
        if (!userId) {
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
        const discordId = discordIdPattern.exec(req.body.access.discords.id[i])?.[1];
        if (!discordId) {
          continue
        }
        config.config.access.discords[discordId] = {
          name: req.body.access.discords.name[i],
          hiddenCode: req.body.access.discords.hidden[i],
          roles: {}
        }
        if (req.body.access.discords[discordId]) {
          for (const i in req.body.access.discords[discordId].roles.id) {
            const roleId = discordIdPattern.exec(req.body.access.discords[discordId].roles.id[i])?.[1];
            if (!roleId) {
              continue
            }
            const discordConfig = config.config.access.discords[discordId];
            if (discordConfig === undefined) {
              continue;
            }
            discordConfig.roles[roleId] = {
              name: req.body.access.discords[discordId].roles.name[i],
              acl: req.body.access.discords[discordId].roles.acl[i],
            }
          }
        }
      }
    }
  }
  config.save()
  if (req.body.draftStatus) {
    const draftOrder = []
    if (req.body.draftStatus.draftOrder) {
      for (const [i, discordId] of req.body.draftStatus.draftOrder.discordId.entries()) {
        const discordConfig = config.config.access.discords[discordId];
        if (discordConfig !== undefined) {
          draftOrder.push({discordId, userId: null, name: discordConfig.name})
        } else {
          draftOrder.push({
            discordId: null,
            userId: req.body.draftStatus.draftOrder.userId[i],
            name: req.body.draftStatus.draftOrder.name[i]
          })
        }
      }
    }
    draftStatus.draftUrl = req.body.draftStatus.draftUrl
    draftStatus.draftOrder = draftOrder
    if (draftStatus.active) {
      if (!req.body.draftStatus.active) {
        draftStatus.stopDraft()
        eventLog.logEvent({
          type: 'draftStatus',
          user: req.session.user,
          userId: req.session.userId,
          data: {active: false}
        })
      }
      else {
        draftStatus.activeDraft = draftStatus.draftOrder.findIndex(element => req.body.draftStatus.activeDraft === element.discordId)
        draftStatus.emit("draftUpdate")
      }
    }
    if (!draftStatus.active && req.body.draftStatus.active) {
      draftStatus.startDraft()
      eventLog.logEvent({type: 'draftStatus', user: req.session.user, userId: req.session.userId, data: {active: true}})
    }
    draftStatus.save()
  }
  return res.redirect('/admin/config');
})

router.get('/login', function(req, res, next) {
  if (req.session.grant === undefined) {
    return res.redirect('/');
  }
  const grantResponse = req.session.grant.response;
  if (grantResponse === undefined) {
    return res.redirect('/');
  }
  if (grantResponse.error) {
    throw new Error(grantResponse.error)
  }
  Discord.checkAllowedUser(req.session).then((data) => {
    if (data.access === true) {
      req.session.user = data.user;
      req.session.userId = data.userId;
      req.session.discordId = data.discordId;
      req.session.acl = data.acl;
      req.session.lastLoginCheck = Date.now();
      grantResponse.access_token_end = grantResponse.raw.expires_in * 1000 + Date.now();
      req.session.save(() => {
        res.redirect('/map');
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

export default router;