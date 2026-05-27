import { Request, Response } from "express";
import { Assignment } from "../models/assignment.model.js";
import { assignmentQueue } from "../queues/assignment.queue.js";
import { ApiResponse } from "../helpers/ApiResponse.js";
import { ApiError } from "../helpers/ApiError.js";
import { UserAssignments } from "../services/assignments.service.js";

export const createAssignment = async (req: Request, res: Response) => {
  try {
    // 1. Manually throwing validation errors using static helper
    if (!req.body.title) {
      throw ApiError.badRequest("Assignment title is required");
    }
    const assignment = await Assignment.create({
      ...req.body,
      status: "queued",
      progress: 0,
    });
    await assignmentQueue.add(
      "generate-assignment",
      {
        assignmentId: assignment._id,
      }
    );
    // 2. Returning the standard formatted API Response
    return ApiResponse.created(assignment, "Assignment created successfully").send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const getUserAssignments = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const assignments = await UserAssignments(userId as string)
    return ApiResponse.ok(assignments, "Assignments fetched successfully").send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};
  