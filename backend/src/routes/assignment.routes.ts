import { Router } from "express";
import { createAssignment, getUserAssignments } from "../controllers/assignment.controller.js";

const router = Router();

router.post("/", createAssignment);
router.get("/user/:userId",getUserAssignments)

export default router;