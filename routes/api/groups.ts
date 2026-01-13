import { Router } from "express";
import {
  addGroup,
  updateGroup,
  deleteGroup,
  getUserGroups
} from "../../lib/Groups/saveGroups.ts";
import { refreshMembershipsIfNeeded } from "../../lib/groups/groupMemberships.ts";

const router = Router();

router.use(async (req, res, next) => {
  try {
    await refreshMembershipsIfNeeded(req.session);
    console.log("ensureFreshMemberships DONE");
    next();
  } catch (err) {
    console.error("ensureFreshMemberships ERROR", err);
    next(err);
  }
});

router.get("/", (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.sendStatus(401);

  res.json(getUserGroups(userId));
});

router.post("/", (req, res) => {
  const group = addGroup(req.session.userId, req.body);
  res.json(group);
});

router.put("/:id", (req, res) => {
  const group = updateGroup(req.session.userId, req.params.id, req.body);
  res.json(group);
});

router.delete("/:id", (req, res) => {
  console.log("Is it working?", req.session.userId);
  const group = deleteGroup(req.session.userId, req.params.id);
  res.json(group);
});



export default router;