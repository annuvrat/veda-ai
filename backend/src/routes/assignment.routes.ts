import { Router } from "express";
import { createAssignment, getUserAssignments, deleteAssignment } from "../controllers/assignment.controller.js";

const router = Router();

router.post("/", createAssignment);
router.get("/user/:userId", getUserAssignments);
router.delete("/:id", deleteAssignment);

export default router;