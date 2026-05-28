import { Router } from "express";
import {
  createAssignment,
  getUserAssignments,
  deleteAssignment,
  getAssignment,
  regenerateAssignment,
  generateAssignmentPDF,
} from "../controllers/assignment.controller.js";

const router = Router();

router.post("/", createAssignment);
router.get("/user/:userId", getUserAssignments);
router.get("/:id", getAssignment);
router.post("/:id/regenerate", regenerateAssignment);
router.get("/:id/pdf", generateAssignmentPDF);
router.delete("/:id", deleteAssignment);

export default router;