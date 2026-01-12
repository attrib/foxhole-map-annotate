import { Router } from "express";
import {
  addGroup,
  updateGroup,
  deleteGroup,
  getUserGroups
} from "../../lib/saveGroups.ts";

const router = Router();

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
  const group = deleteGroup(req.session.userId, req.params.id);
  res.json(group);
});

export default router;
