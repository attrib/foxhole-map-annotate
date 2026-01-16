import { Router } from "express";
import {
  addGroup,
  updateGroup,
  deleteGroup,
  getUsersGroups,
} from "../../lib/Groups/saveGroups.ts";
import { refreshMembershipsIfNeeded } from "../../lib/groups/groupMemberships.ts";

const router = Router();

/* =========================
   Membership refresh middleware
========================= */

router.use(async (req, res, next) => {
  try {
    if (req.session?.userId) {
      await refreshMembershipsIfNeeded(req.session);
    }
    next();
  } catch (err) {
    console.error("refreshMembershipsIfNeeded ERROR", err);
    next(err);
  }
});

/* =========================
   GET all groups
========================= */

router.get("/", (req, res) => {
  if (!req.session?.userId) {
    return res.sendStatus(401);
  }

  res.json(getUsersGroups(req.session.userId));
});

/* =========================
   CREATE group
========================= */

router.post("/", (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.sendStatus(401);

  const group = addGroup(userId, req.body);
  res.json(group);
});

/* =========================
   UPDATE group
========================= */

router.put("/:id", (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.sendStatus(401);

  const groupId = req.params.id;
  const updated = updateGroup(userId, groupId, req.body);

  res.json(updated);
});

/* =========================
   DELETE group
========================= */

router.delete("/:id", (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.sendStatus(401);

  const groupId = req.params.id;
  const result = deleteGroup(userId, groupId);

  res.json(result);
});

export default router;
