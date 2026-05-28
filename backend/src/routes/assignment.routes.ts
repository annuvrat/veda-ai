import { Router } from "express";
import {
  createAssignment,
  getUserAssignments,
  deleteAssignment,
  getAssignment,
} from "../controllers/assignment.controller.js";

const router = Router();

router.post("/", createAssignment);
router.get("/user/:userId", getUserAssignments);
router.get("/:id", getAssignment);
router.delete("/:id", deleteAssignment);

export default router;