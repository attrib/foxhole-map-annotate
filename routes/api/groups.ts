import { Router } from "express";
import {
  addGroup,
  updateGroup,
  deleteGroup,
  getUsersGroups,
} from "../../lib/Groups/saveGroups.ts";

const router = Router();


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

router.put("/:id", async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.sendStatus(401);

    const groupId = req.params.id;
    const updated = await updateGroup(req.session, groupId, req.body);

    res.json(updated);
  } catch (err) {
    next(err);
  }
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
